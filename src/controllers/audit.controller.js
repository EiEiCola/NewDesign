const db = require('../config/db');
const { ACTION } = require('../config/constants');
const v = require('../utils/validate');

async function list(req, res) {
    const { page, pageSize, offset } = v.paging(req.query, 50);
    const to = v.date(req.query.to, 'ถึงวันที่');
    const params = {
        action: req.query.action ? v.oneOf(req.query.action, Object.values(ACTION), 'action') : null,
        username: v.str(req.query.username, 'ชื่อผู้ใช้', { max: 50 }),
        q: v.str(req.query.q, 'คำค้น', { max: 100 }),
        from: v.date(req.query.from, 'จากวันที่'),
        // "to" is a date picked in the UI: include that whole day
        to: to ? new Date(to.getTime() + 24 * 60 * 60 * 1000) : null,
        offset,
        pageSize,
    };
    const where = `
        WHERE (@action IS NULL OR action = @action)
          AND (@username IS NULL OR username = @username)
          AND (@q IS NULL OR message LIKE N'%' + @q + N'%')
          AND (@from IS NULL OR create_at >= @from)
          AND (@to IS NULL OR create_at < @to)`;

    const total = await db.query(`SELECT COUNT(*) AS n FROM dbo.Audit_log ${where}`, params);
    const { recordset } = await db.query(
        `SELECT log_id, uc_id, username, action, target_type, target_id, message, ip_address, create_at
         FROM dbo.Audit_log ${where}
         ORDER BY create_at DESC, log_id DESC
         OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
        params
    );
    res.json({ items: recordset, total: total.recordset[0].n, page, pageSize, actions: Object.values(ACTION) });
}

module.exports = { list };
