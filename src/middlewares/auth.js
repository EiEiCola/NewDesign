const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/db');
const { unauthorized, forbidden } = require('../utils/http-error');

const COOKIE_NAME = 'token';

function cookieOptions() {
    return {
        httpOnly: true, // not readable from JavaScript (protects against XSS token theft)
        sameSite: 'strict', // not sent on cross-site requests (protects against CSRF)
        secure: config.env === 'production',
        maxAge: config.jwt.expiresHours * 60 * 60 * 1000,
        path: '/',
    };
}

function issueToken(res, account) {
    const token = jwt.sign({ ucId: account.uc_id }, config.jwt.secret, { expiresIn: `${config.jwt.expiresHours}h` });
    res.cookie(COOKIE_NAME, token, cookieOptions());
}

function clearToken(res) {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
}

/**
 * Require a valid login. The account is re-read from the database on every request,
 * so deactivating a user or changing their role takes effect immediately.
 */
async function authenticate(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return next(unauthorized());

    let payload;
    try {
        payload = jwt.verify(token, config.jwt.secret);
    } catch {
        clearToken(res);
        return next(unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'));
    }

    const { recordset } = await db.query(
        `SELECT ua.uc_id, ua.username, ua.is_active, r.name AS role,
                u.employee_id, u.first_name, u.last_name
         FROM dbo.User_account ua
         JOIN dbo.Role r  ON r.r_id = ua.r_id
         JOIN dbo.Users u ON u.u_id = ua.u_id
         WHERE ua.uc_id = @id`,
        { id: payload.ucId }
    );
    const row = recordset[0];
    if (!row || !row.is_active) {
        clearToken(res);
        return next(unauthorized('บัญชีนี้ถูกระงับการใช้งาน'));
    }

    req.user = {
        ucId: row.uc_id,
        username: row.username,
        role: row.role,
        employeeId: row.employee_id,
        firstName: row.first_name,
        lastName: row.last_name,
    };
    next();
}

/** Allow only the listed roles, e.g. requireRole('admin') or requireRole(...CAN_POST). */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return next(unauthorized());
        if (!roles.includes(req.user.role)) return next(forbidden());
        next();
    };
}

module.exports = { authenticate, requireRole, issueToken, clearToken };
