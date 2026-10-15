const db = require('../config/db');

/**
 * Append one row to Audit_log. Never throws: a logging failure must not break the action itself.
 *   await audit.log(req, { action: ACTION.UPDATE, targetType: 'content', targetId: 55, message: 'แก้ไขโพสต์ ...' })
 * `req.user` (set by the auth middleware) supplies uc_id / username unless overridden.
 */
async function log(req, { action, targetType = null, targetId = null, message, ucId, username }) {
    try {
        await db.query(
            `INSERT INTO dbo.Audit_log (uc_id, username, action, target_type, target_id, message, ip_address)
             VALUES (@uc_id, @username, @action, @target_type, @target_id, @message, @ip)`,
            {
                uc_id: ucId !== undefined ? ucId : req.user?.ucId ?? null,
                username: (username !== undefined ? username : req.user?.username ?? null)?.slice(0, 50) ?? null,
                action,
                target_type: targetType,
                target_id: targetId == null ? null : String(targetId),
                message: String(message).slice(0, 500),
                ip: clientIp(req),
            }
        );
    } catch (err) {
        console.error('[audit] failed to write log:', err.message);
    }
}

function clientIp(req) {
    return (req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '').slice(0, 45) || null;
}

module.exports = { log, clientIp };
