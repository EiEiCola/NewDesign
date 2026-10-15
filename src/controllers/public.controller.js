const db = require('../config/db');
const audit = require('../services/audit.service');
const { ACTION, SIDE } = require('../config/constants');
const { excerpt } = require('../utils/sanitize');
const { notFound } = require('../utils/http-error');
const v = require('../utils/validate');

/** A post is visible to the public only when all of these hold. */
const VISIBLE = `
    c.status = 'published' AND c.delete_at IS NULL
    AND (c.publish_at IS NULL OR c.publish_at <= SYSUTCDATETIME())
    AND (c.expire_at  IS NULL OR c.expire_at  >  SYSUTCDATETIME())
    AND s.is_active = 1 AND m.is_active = 1`;

const FROM = `
    FROM dbo.Content c
    JOIN dbo.Sub_category s  ON s.sc_id = c.sc_id
    JOIN dbo.Main_category m ON m.mc_id = s.mc_id`;

const HEADER = `(SELECT TOP 1 file_path FROM dbo.Content_media cm WHERE cm.c_id = c.c_id AND cm.kind = 'header') AS header_path`;

/** Sidebar menus: active main categories with active sub categories, grouped by side. */
async function menu(req, res) {
    const { recordset } = await db.query(
        `SELECT m.mc_id, m.name AS main_name, m.side, s.sc_id, s.name AS sub_name
         FROM dbo.Main_category m
         LEFT JOIN dbo.Sub_category s ON s.mc_id = m.mc_id AND s.is_active = 1
         WHERE m.is_active = 1
         ORDER BY m.side, m.sort_order, m.mc_id, s.sort_order, s.sc_id`
    );
    const byMain = new Map();
    for (const r of recordset) {
        if (!byMain.has(r.mc_id)) byMain.set(r.mc_id, { mc_id: r.mc_id, name: r.main_name, side: r.side, subs: [] });
        if (r.sc_id) byMain.get(r.mc_id).subs.push({ sc_id: r.sc_id, name: r.sub_name });
    }
    const mains = [...byMain.values()];
    res.json({
        center: mains.filter((x) => x.side === SIDE.CENTER),
        left: mains.filter((x) => x.side === SIDE.LEFT),
        right: mains.filter((x) => x.side === SIDE.RIGHT),
    });
}

/** Carousel at the top of the home page: posts in center-side categories. */
async function featured(req, res) {
    const limit = Math.min(10, Math.max(1, v.int(req.query.limit, 5)));
    const { recordset } = await db.query(
        `SELECT TOP (@limit) c.c_id, c.title, c.body, c.publish_at, c.create_at, s.name AS sub_name, ${HEADER}
         ${FROM}
         WHERE m.side = ${SIDE.CENTER} AND ${VISIBLE}
         ORDER BY c.is_pinned DESC, COALESCE(c.publish_at, c.create_at) DESC`,
        { limit }
    );
    res.json({ items: recordset.map(({ body, ...r }) => ({ ...r, excerpt: excerpt(body) })) });
}

/** Post list for one sub category (the page after clicking a sidebar item). */
async function subContents(req, res) {
    const scId = v.id(req.params.id);
    const { page, pageSize, offset } = v.paging(req.query, 10);

    const sub = await db.query(
        `SELECT s.sc_id, s.name, m.mc_id, m.name AS main_name
         FROM dbo.Sub_category s JOIN dbo.Main_category m ON m.mc_id = s.mc_id
         WHERE s.sc_id = @scId AND s.is_active = 1 AND m.is_active = 1`,
        { scId }
    );
    if (!sub.recordset[0]) throw notFound('ไม่พบหมวดหมู่');

    const q = v.str(req.query.q, 'คำค้น', { max: 100 });
    const where = `WHERE c.sc_id = @scId AND ${VISIBLE} AND (@q IS NULL OR c.title LIKE N'%' + @q + N'%')`;
    const total = await db.query(`SELECT COUNT(*) AS n ${FROM} ${where}`, { scId, q });
    const { recordset } = await db.query(
        `SELECT c.c_id, c.title, c.body, c.is_pinned, c.view_count, c.publish_at, c.create_at, ${HEADER},
                (SELECT COUNT(*) FROM dbo.Content_media cm WHERE cm.c_id = c.c_id AND cm.kind = 'attachment') AS attachment_count
         ${FROM} ${where}
         ORDER BY c.is_pinned DESC, COALESCE(c.publish_at, c.create_at) DESC, c.c_id DESC
         OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
        { scId, q, offset, pageSize }
    );
    res.json({
        category: sub.recordset[0],
        items: recordset.map(({ body, ...r }) => ({ ...r, excerpt: excerpt(body, 200) })),
        total: total.recordset[0].n,
        page,
        pageSize,
    });
}

/** Single post with its images and files; counts a view. */
async function contentDetail(req, res) {
    const cId = v.id(req.params.id);
    const { recordset } = await db.query(
        `SELECT c.c_id, c.title, c.body, c.is_pinned, c.view_count, c.publish_at, c.create_at, c.update_at,
                s.sc_id, s.name AS sub_name, m.mc_id, m.name AS main_name,
                u.first_name + N' ' + u.last_name AS author
         ${FROM}
         JOIN dbo.User_account ua ON ua.uc_id = c.create_by
         JOIN dbo.Users u ON u.u_id = ua.u_id
         WHERE c.c_id = @cId AND ${VISIBLE}`,
        { cId }
    );
    const content = recordset[0];
    if (!content) throw notFound('ไม่พบโพสต์ หรือโพสต์ยังไม่เผยแพร่');

    await db.query('UPDATE dbo.Content SET view_count = view_count + 1 WHERE c_id = @cId', { cId });
    content.view_count += 1;

    const media = await db.query(
        `SELECT cm_id, kind, original_name, file_size, file_path
         FROM dbo.Content_media WHERE c_id = @cId AND kind IN ('header', 'gallery', 'attachment')
         ORDER BY kind, sort_order, cm_id`,
        { cId }
    );

    // Logged-in staff viewing a post are recorded; anonymous visitors only increase view_count.
    if (req.user) {
        await audit.log(req, {
            action: ACTION.VIEW,
            targetType: 'content',
            targetId: cId,
            message: `เปิดดูโพสต์: "${content.title}"`,
        });
    }

    res.json({ content, media: media.recordset });
}

module.exports = { menu, featured, subContents, contentDetail };
