const bcrypt = require('bcryptjs');
const db = require('../config/db');
const audit = require('../services/audit.service');
const { ACTION, CAN_POST } = require('../config/constants');
const { issueToken, clearToken } = require('../middlewares/auth');
const { HttpError, badRequest, unauthorized } = require('../utils/http-error');
const v = require('../utils/validate');

// Compared against when the username does not exist, so response time does not reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

// Simple in-memory brute-force guard: 5 failures per username+IP within 15 minutes.
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map();

function failKey(req, username) {
    return `${audit.clientIp(req)}|${username.toLowerCase()}`;
}

function isLocked(key) {
    const entry = failures.get(key);
    if (!entry) return false;
    if (Date.now() - entry.first > WINDOW_MS) {
        failures.delete(key);
        return false;
    }
    return entry.count >= MAX_FAILS;
}

function recordFailure(key) {
    const entry = failures.get(key);
    if (!entry || Date.now() - entry.first > WINDOW_MS) failures.set(key, { count: 1, first: Date.now() });
    else entry.count += 1;
}

async function login(req, res) {
    const username = v.str(req.body.username, 'ชื่อผู้ใช้', { required: true, max: 50 });
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!password) throw badRequest('กรุณากรอกรหัสผ่าน');

    const key = failKey(req, username);
    if (isLocked(key)) {
        throw new HttpError(429, 'เข้าสู่ระบบผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่');
    }

    const { recordset } = await db.query(
        `SELECT ua.uc_id, ua.username, ua.password_hash, ua.is_active, r.name AS role,
                u.employee_id, u.first_name, u.last_name
         FROM dbo.User_account ua
         JOIN dbo.Role r  ON r.r_id = ua.r_id
         JOIN dbo.Users u ON u.u_id = ua.u_id
         WHERE ua.username = @username`,
        { username }
    );
    const account = recordset[0];
    const passwordOk = await bcrypt.compare(password, account ? account.password_hash : DUMMY_HASH);

    if (!account || !passwordOk || !account.is_active) {
        recordFailure(key);
        const reason = !account ? 'ไม่พบชื่อผู้ใช้' : !passwordOk ? 'รหัสผ่านไม่ถูกต้อง' : 'บัญชีถูกระงับ';
        await audit.log(req, {
            action: ACTION.LOGIN_FAILED,
            ucId: account ? account.uc_id : null,
            username,
            targetType: 'user',
            targetId: account ? account.uc_id : null,
            message: `เข้าสู่ระบบไม่สำเร็จ: ${username} (${reason})`,
        });
        // Same message for every case so attackers cannot tell which part was wrong.
        throw unauthorized('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    failures.delete(key);
    await db.query('UPDATE dbo.User_account SET last_login_at = SYSUTCDATETIME() WHERE uc_id = @id', { id: account.uc_id });
    issueToken(res, account);

    await audit.log(req, {
        action: ACTION.LOGIN,
        ucId: account.uc_id,
        username: account.username,
        targetType: 'user',
        targetId: account.uc_id,
        message: `เข้าสู่ระบบ: ${account.username} · ${account.first_name} ${account.last_name} · ${account.role.toUpperCase()}`,
    });

    res.json({ user: toMe(account) });
}

async function logout(req, res) {
    if (req.user) {
        await audit.log(req, {
            action: ACTION.LOGOUT,
            targetType: 'user',
            targetId: req.user.ucId,
            message: `ออกจากระบบ: ${req.user.username}`,
        });
    }
    clearToken(res);
    res.json({ ok: true });
}

function me(req, res) {
    res.json({
        user: {
            ucId: req.user.ucId,
            username: req.user.username,
            role: req.user.role,
            employeeId: req.user.employeeId,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            canPost: CAN_POST.includes(req.user.role),
        },
    });
}

function toMe(a) {
    return {
        ucId: a.uc_id,
        username: a.username,
        role: a.role,
        employeeId: a.employee_id,
        firstName: a.first_name,
        lastName: a.last_name,
        canPost: CAN_POST.includes(a.role),
    };
}

module.exports = { login, logout, me };
