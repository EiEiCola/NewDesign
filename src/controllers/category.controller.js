const db = require('../config/db');
const audit = require('../services/audit.service');
const { ACTION } = require('../config/constants');
const { notFound, conflict, badRequest } = require('../utils/http-error');
const v = require('../utils/validate');

const SIDE_LABEL = { 1: 'กลาง', 2: 'ซ้าย', 3: 'ขวา' };

/** All main categories with their sub categories (including inactive), for the admin screen. */
async function list(req, res) {
    const mains = await db.query(
        `SELECT mc_id, name, side, sort_order, is_active, create_at
         FROM dbo.Main_category ORDER BY side, sort_order, mc_id`
    );
    const subs = await db.query(
        `SELECT s.sc_id, s.mc_id, s.name, s.sort_order, s.is_active, s.create_at,
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
    };
}

async function createMain(req, res) {
    const d = readMain(req.body);
    const { recordset } = await db.query(
        `INSERT INTO dbo.Main_category (name, side, sort_order, is_active, create_by)
         OUTPUT INSERTED.mc_id VALUES (@name, @side, @sortOrder, @isActive, @by)`,
        { ...d, by: req.user.ucId }
    );
    const mcId = recordset[0].mc_id;
    await audit.log(req, {
        action: ACTION.CREATE,
        targetType: 'main_category',
        targetId: mcId,
        message: `สร้างหมวดหมู่หลัก: ${d.name} (${SIDE_LABEL[d.side]})`,
    });
    res.status(201).json({ mc_id: mcId });
}

async function updateMain(req, res) {
    const mcId = v.id(req.params.id);
    const d = readMain(req.body);
    const { rowsAffected } = await db.query(
        `UPDATE dbo.Main_category SET name = @name, side = @side, sort_order = @sortOrder, is_active = @isActive
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
    };
}

async function assertMainExists(mcId) {
    const { recordset } = await db.query('SELECT name FROM dbo.Main_category WHERE mc_id = @mcId', { mcId });
    if (!recordset[0]) throw badRequest('ไม่พบหมวดหมู่หลักที่เลือก');
    return recordset[0].name;
}

async function createSub(req, res) {
    const d = readSub(req.body);
    const mainName = await assertMainExists(d.mcId);
    const { recordset } = await db.query(
        `INSERT INTO dbo.Sub_category (mc_id, name, sort_order, is_active, create_by)
         OUTPUT INSERTED.sc_id VALUES (@mcId, @name, @sortOrder, @isActive, @by)`,
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
    const mainName = await assertMainExists(d.mcId);
    const { rowsAffected } = await db.query(
        `UPDATE dbo.Sub_category SET mc_id = @mcId, name = @name, sort_order = @sortOrder, is_active = @isActive
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
