const db = require('../config/db');
const audit = require('../services/audit.service');
const files = require('../services/file.service');
const { ACTION, ROLE, CONTENT_STATUS, MEDIA_KIND } = require('../config/constants');
const { sanitizeBody } = require('../utils/sanitize');
const { badRequest, notFound, forbidden } = require('../utils/http-error');
const v = require('../utils/validate');

const STATUS_LABEL = { draft: 'ร่าง', published: 'เผยแพร่', hidden: 'ซ่อน' };

/** Editors only see / change their own posts; admins see everything. */
function ownerFilter(user) {
    return user.role === ROLE.ADMIN ? '' : 'AND c.create_by = @me';
}

async function list(req, res) {
    const { page, pageSize, offset } = v.paging(req.query);
    const params = {
        me: req.user.ucId,
        status: req.query.status ? v.oneOf(req.query.status, CONTENT_STATUS, 'สถานะ') : null,
        scId: req.query.sc_id ? v.id(req.query.sc_id, 'หมวดหมู่') : null,
        q: v.str(req.query.q, 'คำค้น', { max: 100 }),
        offset,
        pageSize,
    };
    const where = `
        WHERE c.delete_at IS NULL ${ownerFilter(req.user)}
          AND (@status IS NULL OR c.status = @status)
          AND (@scId IS NULL OR c.sc_id = @scId)
          AND (@q IS NULL OR c.title LIKE N'%' + @q + N'%')`;

    const total = await db.query(`SELECT COUNT(*) AS n FROM dbo.Content c ${where}`, params);
    const { recordset } = await db.query(
        `SELECT c.c_id, c.title, c.status, c.is_pinned, c.view_count, c.publish_at, c.expire_at,
                c.create_at, c.update_at, c.sc_id, s.name AS sub_name, m.name AS main_name, m.side,
                ua.username AS author,
                (SELECT TOP 1 file_path FROM dbo.Content_media cm
                 WHERE cm.c_id = c.c_id AND cm.kind = 'header') AS header_path
         FROM dbo.Content c
         JOIN dbo.Sub_category s  ON s.sc_id = c.sc_id
         JOIN dbo.Main_category m ON m.mc_id = s.mc_id
         JOIN dbo.User_account ua ON ua.uc_id = c.create_by
         ${where}
         ORDER BY c.is_pinned DESC, COALESCE(c.publish_at, c.create_at) DESC, c.c_id DESC
         OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
        params
    );
    res.json({ items: recordset, total: total.recordset[0].n, page, pageSize });
}

/** Load a content row the current user may edit; throws 404/403 otherwise. */
async function findEditable(cId, user) {
    const { recordset } = await db.query(
        `SELECT c.*, s.name AS sub_name, s.mc_id, m.name AS main_name
         FROM dbo.Content c
         JOIN dbo.Sub_category s  ON s.sc_id = c.sc_id
         JOIN dbo.Main_category m ON m.mc_id = s.mc_id
         WHERE c.c_id = @cId AND c.delete_at IS NULL`,
        { cId }
    );
    const content = recordset[0];
    if (!content) throw notFound('ไม่พบโพสต์');
    if (user.role !== ROLE.ADMIN && content.create_by !== user.ucId) {
        throw forbidden('แก้ไขได้เฉพาะโพสต์ของตัวเอง');
    }
    return content;
}

async function getMedia(cId) {
    const { recordset } = await db.query(
        `SELECT cm_id, kind, original_name, file_size, file_path, sort_order
         FROM dbo.Content_media WHERE c_id = @cId ORDER BY kind, sort_order, cm_id`,
        { cId }
    );
    return recordset;
}

async function get(req, res) {
    const content = await findEditable(v.id(req.params.id), req.user);
    res.json({ content, media: await getMedia(content.c_id) });
}

async function readBody(body) {
    const d = {
        scId: v.id(body.sc_id, 'หมวดหมู่รอง'),
        title: v.str(body.title, 'หัวข้อ', { required: true, max: 300 }),
        body: sanitizeBody(typeof body.body === 'string' ? body.body : ''),
        publishAt: v.date(body.publish_at, 'วันเริ่มเผยแพร่'),
        expireAt: v.date(body.expire_at, 'วันหมดอายุ'),
        status: v.oneOf(body.status || 'draft', CONTENT_STATUS, 'สถานะ'),
        isPinned: v.bool(body.is_pinned),
    };
    if (d.publishAt && d.expireAt && d.expireAt <= d.publishAt) {
        throw badRequest('วันหมดอายุต้องอยู่หลังวันเริ่มเผยแพร่');
    }
    const sub = await db.query('SELECT sc_id FROM dbo.Sub_category WHERE sc_id = @scId', { scId: d.scId });
    if (!sub.recordset[0]) throw badRequest('ไม่พบหมวดหมู่รองที่เลือก');
    return d;
}

async function create(req, res) {
    const d = await readBody(req.body);
    const { recordset } = await db.query(
        `INSERT INTO dbo.Content (sc_id, title, body, publish_at, expire_at, status, is_pinned, create_by)
         OUTPUT INSERTED.c_id
         VALUES (@scId, @title, @body, @publishAt, @expireAt, @status, @isPinned, @by)`,
        { ...d, by: req.user.ucId }
    );
    const cId = recordset[0].c_id;
    await audit.log(req, {
        action: ACTION.CREATE,
        targetType: 'content',
        targetId: cId,
        message: `สร้างโพสต์: "${d.title}" (${STATUS_LABEL[d.status]})`,
    });
    res.status(201).json({ c_id: cId });
}

async function update(req, res) {
    const current = await findEditable(v.id(req.params.id), req.user);
    const d = await readBody(req.body);

    await db.query(
        `UPDATE dbo.Content
         SET sc_id = @scId, title = @title, body = @body, publish_at = @publishAt, expire_at = @expireAt,
             status = @status, is_pinned = @isPinned, update_at = SYSUTCDATETIME()
         WHERE c_id = @cId`,
        { ...d, cId: current.c_id }
    );

    // Inline images removed from the body are no longer needed: delete them.
    const inline = await db.query(
        "SELECT cm_id, file_path FROM dbo.Content_media WHERE c_id = @cId AND kind = 'inline'",
        { cId: current.c_id }
    );
    const orphaned = inline.recordset.filter((m) => !(d.body || '').includes(m.file_path));
    if (orphaned.length) {
        await db.query(
            `DELETE FROM dbo.Content_media WHERE cm_id IN (${orphaned.map((_, i) => `@m${i}`).join(',')})`,
            Object.fromEntries(orphaned.map((m, i) => [`m${i}`, m.cm_id]))
        );
        await files.removeFiles(orphaned.map((m) => m.file_path));
    }

    const changes = [];
    if (current.status !== d.status) changes.push(`${STATUS_LABEL[current.status]} → ${STATUS_LABEL[d.status]}`);
    await audit.log(req, {
        action: ACTION.UPDATE,
        targetType: 'content',
        targetId: current.c_id,
        message: `แก้ไขโพสต์: "${d.title}"${changes.length ? ` (${changes.join(', ')})` : ''}`,
    });
    res.json({ ok: true });
}

/** Soft delete: the row and its files stay so it can be restored from the database if needed. */
async function remove(req, res) {
    const current = await findEditable(v.id(req.params.id), req.user);
    await db.query('UPDATE dbo.Content SET delete_at = SYSUTCDATETIME() WHERE c_id = @cId', { cId: current.c_id });
    await audit.log(req, {
        action: ACTION.DELETE,
        targetType: 'content',
        targetId: current.c_id,
        message: `ลบโพสต์: "${current.title}"`,
    });
    res.json({ ok: true });
}

/* ---------------- Media ---------------- */

/**
 * Runs before multer so unauthorized users never get files written to disk.
 * Sets req.content for the upload handler.
 */
async function loadEditable(req, res, next) {
    req.content = await findEditable(v.id(req.params.id), req.user);
    next();
}

async function uploadMedia(req, res) {
    const uploaded = req.files || [];
    const savedPaths = uploaded.map((f) => files.publicPath(f.path));
    try {
        if (!uploaded.length) throw badRequest('กรุณาเลือกไฟล์');
        const kind = v.oneOf(req.body.kind, MEDIA_KIND, 'ชนิดไฟล์');
        if (kind === 'header' && uploaded.length > 1) throw badRequest('รูป header มีได้รูปเดียว');

        const cId = req.content.c_id;
        const replaced = [];

        const rows = await db.transaction(async (tx) => {
            if (kind === 'header') {
                const old = await db.query(
                    "DELETE FROM dbo.Content_media OUTPUT DELETED.file_path WHERE c_id = @cId AND kind = 'header'",
                    { cId },
                    tx
                );
                replaced.push(...old.recordset.map((r) => r.file_path));
            }
            const max = await db.query(
                'SELECT ISNULL(MAX(sort_order), 0) AS n FROM dbo.Content_media WHERE c_id = @cId AND kind = @kind',
                { cId, kind },
                tx
            );
            let order = max.recordset[0].n;
            const inserted = [];
            for (let i = 0; i < uploaded.length; i++) {
                const f = uploaded[i];
                const r = await db.query(
                    `INSERT INTO dbo.Content_media (c_id, original_name, kind, file_size, file_path, sort_order)
                     OUTPUT INSERTED.cm_id, INSERTED.kind, INSERTED.original_name, INSERTED.file_size,
                            INSERTED.file_path, INSERTED.sort_order
                     VALUES (@cId, @name, @kind, @size, @path, @order)`,
                    { cId, name: f.originalname.slice(0, 255), kind, size: f.size, path: savedPaths[i], order: ++order },
                    tx
                );
                inserted.push(r.recordset[0]);
            }
            return inserted;
        });

        await files.removeFiles(replaced);
        await audit.log(req, {
            action: ACTION.UPDATE,
            targetType: 'content',
            targetId: cId,
            message: `อัปโหลด ${kind} ${rows.length} ไฟล์ในโพสต์: "${req.content.title}" (${rows.map((r) => r.original_name).join(', ')})`.slice(0, 500),
        });
        res.status(201).json({ media: rows });
    } catch (err) {
        await files.removeFiles(savedPaths); // do not leave orphan files on disk
        throw err;
    }
}

async function updateMediaOrder(req, res) {
    const content = await findEditable(v.id(req.params.id), req.user);
    const order = Array.isArray(req.body.order) ? req.body.order.map((x) => v.id(x, 'cm_id')) : [];
    await db.transaction(async (tx) => {
        for (let i = 0; i < order.length; i++) {
            await db.query(
                'UPDATE dbo.Content_media SET sort_order = @i WHERE cm_id = @cmId AND c_id = @cId',
                { i: i + 1, cmId: order[i], cId: content.c_id },
                tx
            );
        }
    });
    res.json({ ok: true });
}

async function deleteMedia(req, res) {
    const content = await findEditable(v.id(req.params.id), req.user);
    const cmId = v.id(req.params.cmId);
    const { recordset } = await db.query(
        'DELETE FROM dbo.Content_media OUTPUT DELETED.file_path, DELETED.original_name, DELETED.kind WHERE cm_id = @cmId AND c_id = @cId',
        { cmId, cId: content.c_id }
    );
    const media = recordset[0];
    if (!media) throw notFound('ไม่พบไฟล์');

    if (media.kind === 'inline' && content.body) {
        // Also remove the <img> from the body so it does not show a broken image.
        const escaped = media.file_path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const body = content.body.replace(new RegExp(`<img[^>]*src="${escaped}"[^>]*>`, 'g'), '');
        await db.query('UPDATE dbo.Content SET body = @body, update_at = SYSUTCDATETIME() WHERE c_id = @cId', { body, cId: content.c_id });
    }

    await files.removeFiles([media.file_path]);
    await audit.log(req, {
        action: ACTION.UPDATE,
        targetType: 'content',
        targetId: content.c_id,
        message: `ลบไฟล์ ${media.kind} "${media.original_name}" ในโพสต์: "${content.title}"`,
    });
    res.json({ ok: true });
}

module.exports = { list, get, create, update, remove, loadEditable, uploadMedia, updateMediaOrder, deleteMedia };
