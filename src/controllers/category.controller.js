const db = require('../config/db');
const audit = require('../services/audit.service');
const { ACTION, SIDE } = require('../config/constants');
const { notFound, conflict, badRequest } = require('../utils/http-error');
const v = require('../utils/validate');

const SIDE_LABEL = { 1: 'กลาง', 2: 'ซ้าย', 3: 'ขวา' };

/** External link for right-side menu items: empty → null, otherwise must be http(s) (blocks javascript: URLs). */
function readLink(value) {
    const url = v.str(value, 'ลิงก์', { max: 500 });
    if (url && !/^https?:\/\/\S+$/i.test(url)) throw badRequest('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
    return url;
}

/** All main categories with their sub categories (including inactive), for the admin screen. */
async function list(req, res) {
    const mains = await db.query(
        `SELECT mc_id, name, side, sort_order, is_active, link_url, create_at
         FROM dbo.Main_category ORDER BY side, sort_order, mc_id`
    );
    const subs = await db.query(
        `SELECT s.sc_id, s.mc_id, s.name, s.sort_order, s.is_active, s.link_url, s.create_at,
                (SELECT COUNT(*) FROM dbo.Content c WHERE c.sc_id = s.sc_id AND c.delete_at IS NULL) AS content_count
         FROM dbo.Sub_category s ORDER BY s.sort_order, s.sc_id`
    );
    const categories = mains.recordset.map((m) => ({
        ...m,
        subs: subs.recordset.filter((s) => s.mc_id === m.mc_id),
    }));
    res.json({ categories });
}

/* ---------------- Main category ---------------- */

function readMain(body) {
    const side = v.int(body.side, 2);
    if (![1, 2, 3].includes(side)) throw badRequest('ตำแหน่งต้องเป็น 1 (กลาง), 2 (ซ้าย) หรือ 3 (ขวา)');
    return {
        name: v.str(body.name, 'ชื่อหมวดหมู่หลัก', { required: true, max: 200 }),
        side,
        sortOrder: v.int(body.sort_order, 0),
        isActive: body.is_active === undefined ? true : v.bool(body.is_active),
        linkUrl: side === SIDE.RIGHT ? readLink(body.link_url) : null,
    };
}

/**
 * Optional `subs` created together with the main category: [{ name, link_url }] (or plain names).
 * Rows without a name are skipped; links are kept only on the right side.
 */
function readNewSubs(value, side) {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw badRequest('รายการหมวดหมู่รองไม่ถูกต้อง');
    const subs = value
        .map((x) => (typeof x === 'object' && x !== null ? x : { name: x }))
        .map((x) => ({
            name: v.str(x.name, 'ชื่อหมวดหมู่รอง', { max: 200 }),
            linkUrl: side === SIDE.RIGHT ? readLink(x.link_url) : null,
        }))
        .filter((x) => x.name);
    if (subs.length > 50) throw badRequest('เพิ่มหมวดหมู่รองได้ครั้งละไม่เกิน 50 รายการ');
    return subs;
}

async function createMain(req, res) {
    const d = readMain(req.body);
    // A main category that is a link has no sub categories
    const subs = d.linkUrl ? [] : readNewSubs(req.body.subs, d.side);
    const by = req.user.ucId;

    // Main + subs in one transaction: either all are created or none
    const { mcId, subIds } = await db.transaction(async (tx) => {
        const { recordset } = await db.query(
            `INSERT INTO dbo.Main_category (name, side, sort_order, is_active, link_url, create_by)
             OUTPUT INSERTED.mc_id VALUES (@name, @side, @sortOrder, @isActive, @linkUrl, @by)`,
            { ...d, by },
            tx
        );
        const mcId = recordset[0].mc_id;
        const subIds = [];
        for (const [i, sub] of subs.entries()) {
            const row = await db.query(
                `INSERT INTO dbo.Sub_category (mc_id, name, sort_order, is_active, link_url, create_by)
                 OUTPUT INSERTED.sc_id VALUES (@mcId, @name, @sortOrder, 1, @linkUrl, @by)`,
                { mcId, ...sub, sortOrder: i + 1, by },
                tx
            );
            subIds.push(row.recordset[0].sc_id);
        }
        return { mcId, subIds };
    });

    await audit.log(req, {
        action: ACTION.CREATE,
        targetType: 'main_category',
        targetId: mcId,
        message: `สร้างหมวดหมู่หลัก: ${d.name} (${SIDE_LABEL[d.side]})${d.linkUrl ? ` ลิงก์: ${d.linkUrl}` : ''}${subs.length ? ` พร้อมหมวดหมู่รอง ${subs.length} รายการ` : ''}`,
    });
    for (const [i, scId] of subIds.entries()) {
        await audit.log(req, {
            action: ACTION.CREATE,
            targetType: 'sub_category',
            targetId: scId,
            message: `สร้างหมวดหมู่รอง: ${d.name} › ${subs[i].name}`,
        });
    }
    res.status(201).json({ mc_id: mcId, sc_ids: subIds });
}

async function updateMain(req, res) {
    const mcId = v.id(req.params.id);
    const d = readMain(req.body);
    const { rowsAffected } = await db.query(
        `UPDATE dbo.Main_category SET name = @name, side = @side, sort_order = @sortOrder, is_active = @isActive,
             link_url = @linkUrl
         WHERE mc_id = @mcId`,
        { ...d, mcId }
    );
    if (!rowsAffected[0]) throw notFound('ไม่พบหมวดหมู่หลัก');
    await audit.log(req, {
        action: ACTION.UPDATE,
        targetType: 'main_category',
        targetId: mcId,
        message: `แก้ไขหมวดหมู่หลัก: ${d.name}${d.isActive ? '' : ' (ปิดใช้งาน)'}`,
    });
    res.json({ ok: true });
}

async function deleteMain(req, res) {
    const mcId = v.id(req.params.id);
    const main = await db.query('SELECT name FROM dbo.Main_category WHERE mc_id = @mcId', { mcId });
    if (!main.recordset[0]) throw notFound('ไม่พบหมวดหมู่หลัก');

    const subs = await db.query('SELECT COUNT(*) AS n FROM dbo.Sub_category WHERE mc_id = @mcId', { mcId });
    if (subs.recordset[0].n) {
        throw conflict('ยังมีหมวดหมู่รองอยู่ ลบหมวดหมู่รองก่อน หรือใช้ "ปิดใช้งาน" แทน');
    }

    await db.query('DELETE FROM dbo.Main_category WHERE mc_id = @mcId', { mcId });
    await audit.log(req, {
        action: ACTION.DELETE,
        targetType: 'main_category',
        targetId: mcId,
        message: `ลบหมวดหมู่หลัก: ${main.recordset[0].name}`,
    });
    res.json({ ok: true });
}

/* ---------------- Sub category ---------------- */

function readSub(body) {
    return {
        mcId: v.id(body.mc_id, 'หมวดหมู่หลัก'),
        name: v.str(body.name, 'ชื่อหมวดหมู่รอง', { required: true, max: 200 }),
        sortOrder: v.int(body.sort_order, 0),
        isActive: body.is_active === undefined ? true : v.bool(body.is_active),
        linkUrl: readLink(body.link_url),
    };
}

/** Returns the main category's name; drops the sub's link unless the main category is on the right side. */
async function assertMainExists(d) {
    const { recordset } = await db.query('SELECT name, side FROM dbo.Main_category WHERE mc_id = @mcId', { mcId: d.mcId });
    if (!recordset[0]) throw badRequest('ไม่พบหมวดหมู่หลักที่เลือก');
    if (recordset[0].side !== SIDE.RIGHT) d.linkUrl = null;
    return recordset[0].name;
}

async function createSub(req, res) {
    const d = readSub(req.body);
    const mainName = await assertMainExists(d);
    const { recordset } = await db.query(
        `INSERT INTO dbo.Sub_category (mc_id, name, sort_order, is_active, link_url, create_by)
         OUTPUT INSERTED.sc_id VALUES (@mcId, @name, @sortOrder, @isActive, @linkUrl, @by)`,
        { ...d, by: req.user.ucId }
    );
    const scId = recordset[0].sc_id;
    await audit.log(req, {
        action: ACTION.CREATE,
        targetType: 'sub_category',
        targetId: scId,
        message: `สร้างหมวดหมู่รอง: ${mainName} › ${d.name}`,
    });
    res.status(201).json({ sc_id: scId });
}

async function updateSub(req, res) {
    const scId = v.id(req.params.id);
    const d = readSub(req.body);
    const mainName = await assertMainExists(d);
    const { rowsAffected } = await db.query(
        `UPDATE dbo.Sub_category SET mc_id = @mcId, name = @name, sort_order = @sortOrder, is_active = @isActive,
             link_url = @linkUrl
         WHERE sc_id = @scId`,
        { ...d, scId }
    );
    if (!rowsAffected[0]) throw notFound('ไม่พบหมวดหมู่รอง');
    await audit.log(req, {
        action: ACTION.UPDATE,
        targetType: 'sub_category',
        targetId: scId,
        message: `แก้ไขหมวดหมู่รอง: ${mainName} › ${d.name}${d.isActive ? '' : ' (ปิดใช้งาน)'}`,
    });
    res.json({ ok: true });
}

async function deleteSub(req, res) {
    const scId = v.id(req.params.id);
    const sub = await db.query('SELECT name FROM dbo.Sub_category WHERE sc_id = @scId', { scId });
    if (!sub.recordset[0]) throw notFound('ไม่พบหมวดหมู่รอง');

    // Includes soft-deleted posts: they still reference this row.
    const used = await db.query('SELECT COUNT(*) AS n FROM dbo.Content WHERE sc_id = @scId', { scId });
    if (used.recordset[0].n) {
        throw conflict('หมวดหมู่นี้มีโพสต์อยู่ ไม่สามารถลบได้ ให้ใช้ "ปิดใช้งาน" แทน');
    }

    await db.query('DELETE FROM dbo.Sub_category WHERE sc_id = @scId', { scId });
    await audit.log(req, {
        action: ACTION.DELETE,
        targetType: 'sub_category',
        targetId: scId,
        message: `ลบหมวดหมู่รอง: ${sub.recordset[0].name}`,
    });
    res.json({ ok: true });
}

module.exports = { list, createMain, updateMain, deleteMain, createSub, updateSub, deleteSub };
