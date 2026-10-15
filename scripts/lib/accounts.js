const bcrypt = require('bcryptjs');
const db = require('../../src/config/db');

/**
 * Create a login account, or (when it already exists) set its password and role again.
 * Returns 'created' | 'updated'.
 */
async function upsertAccount({ employeeId, firstName, lastName, username, password, role }) {
    if (!username) throw new Error('username is required');
    if (!password || password.length < 8) throw new Error(`Password for "${username}" must be at least 8 characters`);

    const roleRow = await db.query('SELECT r_id FROM dbo.Role WHERE name = @role', { role });
    if (!roleRow.recordset[0]) throw new Error(`Role '${role}' not found. Run npm run db:init first.`);
    const rId = roleRow.recordset[0].r_id;
    const hash = await bcrypt.hash(password, 10);

    const existing = await db.query('SELECT uc_id FROM dbo.User_account WHERE username = @username', { username });
    if (existing.recordset[0]) {
        await db.query(
            'UPDATE dbo.User_account SET password_hash = @hash, r_id = @rId, is_active = 1 WHERE username = @username',
            { hash, rId, username }
        );
        return 'updated';
    }

    await db.transaction(async (tx) => {
        const u = await db.query(
            `INSERT INTO dbo.Users (employee_id, first_name, last_name) OUTPUT INSERTED.u_id
             VALUES (@employeeId, @firstName, @lastName)`,
            { employeeId, firstName, lastName },
            tx
        );
        await db.query(
            `INSERT INTO dbo.User_account (u_id, r_id, username, password_hash)
             VALUES (@uId, @rId, @username, @hash)`,
            { uId: u.recordset[0].u_id, rId, username, hash },
            tx
        );
    });
    return 'created';
}

module.exports = { upsertAccount };
