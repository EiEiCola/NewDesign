const bcrypt = require('bcryptjs');
const db = require('../config/db');
const audit = require('../services/audit.service');
const { ACTION } = require('../config/constants');
const { badRequest, notFound, conflict } = require('../utils/http-error');
const v = require('../utils/validate');

const MIN_PASSWORD = 8;

function checkPassword(password) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
        throw badRequest(`รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`);
    }
    if (password.length > 72) throw badRequest('รหัสผ่านยาวเกิน 72 ตัวอักษร');
    return password;
}

async function listRoles(req, res) {
    const { recordset } = await db.query('SELECT r_id, name FROM dbo.Role ORDER BY r_id');
    res.json({ roles: recordset });
}

async function list(req, res) {
    const q = v.str(req.query.q, 'คำค้น', { max: 100 });
    const { recordset } = await db.query(
        `SELECT ua.uc_id, ua.username, ua.is_active, ua.last_login_at, ua.r_id, r.name AS role,
                u.u_id, u.employee_id, u.first_name, u.last_name
         FROM dbo.User_account ua
         JOIN dbo.Users u ON u.u_id = ua.u_id
         JOIN dbo.Role r  ON r.r_id = ua.r_id
         WHERE @q IS NULL
            OR ua.username LIKE '%' + @q + '%'
            OR u.employee_id LIKE '%' + @q + '%'
            OR u.first_name LIKE N'%' + @q + N'%'
            OR u.last_name LIKE N'%' + @q + N'%'
         ORDER BY ua.is_active DESC, u.employee_id`,
        { q }
    );
    res.json({ users: recordset });
}

async function create(req, res) {
    const employeeId = v.str(req.body.employee_id, 'รหัสพนักงาน', { required: true, max: 20 });
    const firstName = v.str(req.body.first_name, 'ชื่อ', { required: true, max: 100 });
    const lastName = v.str(req.body.last_name, 'นามสกุล', { required: true, max: 100 });
    const username = v.str(req.body.username, 'ชื่อผู้ใช้', { required: true, max: 50 });
    const rId = v.id(req.body.r_id, 'สิทธิ์');
    const hash = await bcrypt.hash(checkPassword(req.body.password), 10);

    const dup = await db.query(
        `SELECT
            (SELECT COUNT(*) FROM dbo.Users WHERE employee_id = @employeeId) AS emp,
            (SELECT COUNT(*) FROM dbo.User_account WHERE username = @username) AS usr`,
        { employeeId, username }
    );
    if (dup.recordset[0].emp) throw conflict('รหัสพนักงานนี้มีในระบบแล้ว');
    if (dup.recordset[0].usr) throw conflict('ชื่อผู้ใช้นี้มีในระบบแล้ว');

    const ucId = await db.transaction(async (tx) => {
        const u = await db.query(
            `INSERT INTO dbo.Users (employee_id, first_name, last_name) OUTPUT INSERTED.u_id
             VALUES (@employeeId, @firstName, @lastName)`,
            { employeeId, firstName, lastName },
            tx
        );
        const ua = await db.query(
            `INSERT INTO dbo.User_account (u_id, r_id, username, password_hash) OUTPUT INSERTED.uc_id
             VALUES (@uId, @rId, @username, @hash)`,
            { uId: u.recordset[0].u_id, rId, username, hash },
            tx
        );
        return ua.recordset[0].uc_id;
    });

    await audit.log(req, {
        action: ACTION.CREATE,
        targetType: 'user',
        targetId: ucId,
        message: `สร้างผู้ใช้: ${username} · ${firstName} ${lastName}`,
    });
    res.status(201).json({ uc_id: ucId });
}

async function update(req, res) {
    const ucId = v.id(req.params.id);
    const firstName = v.str(req.body.first_name, 'ชื่อ', { required: true, max: 100 });
    const lastName = v.str(req.body.last_name, 'นามสกุล', { required: true, max: 100 });
    const employeeId = v.str(req.body.employee_id, 'รหัสพนักงาน', { required: true, max: 20 });
    const rId = v.id(req.body.r_id, 'สิทธิ์');
    const isActive = v.bool(req.body.is_active);

    const current = await getAccount(ucId);

    // Prevent admins from locking themselves out.
    if (ucId === req.user.ucId) {
        const adminRole = await db.query("SELECT r_id FROM dbo.Role WHERE name = 'admin'");
        if (!isActive) throw badRequest('ไม่สามารถระงับบัญชีของตัวเองได้');
        if (rId !== adminRole.recordset[0].r_id) throw badRequest('ไม่สามารถลดสิทธิ์ของตัวเองได้');
    }

    const dupEmp = await db.query(
        'SELECT COUNT(*) AS n FROM dbo.Users WHERE employee_id = @employeeId AND u_id <> @uId',
        { employeeId, uId: current.u_id }
    );
    if (dupEmp.recordset[0].n) throw conflict('รหัสพนักงานนี้มีในระบบแล้ว');

    await db.transaction(async (tx) => {
        await db.query(
            `UPDATE dbo.Users SET employee_id = @employeeId, first_name = @firstName, last_name = @lastName
             WHERE u_id = @uId`,
            { employeeId, firstName, lastName, uId: current.u_id },
            tx
        );
        await db.query(
            'UPDATE dbo.User_account SET r_id = @rId, is_active = @isActive WHERE uc_id = @ucId',
            { rId, isActive, ucId },
            tx
        );
    });

    const changes = [];
    if (current.r_id !== rId) {
        const role = await db.query('SELECT name FROM dbo.Role WHERE r_id = @rId', { rId });
        changes.push(`สิทธิ์ ${current.role} → ${role.recordset[0]?.name}`);
    }
    if (Boolean(current.is_active) !== isActive) changes.push(isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน');

    await audit.log(req, {
        action: ACTION.UPDATE,
        targetType: 'user',
        targetId: ucId,
        message: `แก้ไขผู้ใช้: ${current.username}${changes.length ? ` (${changes.join(', ')})` : ''}`,
    });
    res.json({ ok: true });
}

async function resetPassword(req, res) {
    const ucId = v.id(req.params.id);
    const account = await getAccount(ucId);
    const hash = await bcrypt.hash(checkPassword(req.body.password), 10);

    await db.query('UPDATE dbo.User_account SET password_hash = @hash WHERE uc_id = @ucId', { hash, ucId });
    await audit.log(req, {
        action: ACTION.UPDATE,
        targetType: 'user',
        targetId: ucId,
        message: `ตั้งรหัสผ่านใหม่ให้: ${account.username}`,
    });
    res.json({ ok: true });
}

async function getAccount(ucId) {
    const { recordset } = await db.query(
        `SELECT ua.uc_id, ua.u_id, ua.r_id, ua.username, ua.is_active, r.name AS role
         FROM dbo.User_account ua JOIN dbo.Role r ON r.r_id = ua.r_id
         WHERE ua.uc_id = @ucId`,
        { ucId }
    );
    if (!recordset[0]) throw notFound('ไม่พบผู้ใช้');
    return recordset[0];
}

module.exports = { listRoles, list, create, update, resetPassword };
