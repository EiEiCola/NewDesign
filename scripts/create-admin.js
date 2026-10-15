/**
 * Create the first admin account (or reset an existing user's password and make them admin).
 *   npm run create-admin -- <employee_id> <first_name> <last_name> <username> <password>
 */
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

async function main() {
    const [employeeId, firstName, lastName, username, password] = process.argv.slice(2);
    if (!password) {
        console.error('Usage: npm run create-admin -- <employee_id> <first_name> <last_name> <username> <password>');
        process.exit(1);
    }
    if (password.length < 8) throw new Error('Password must be at least 8 characters');

    const hash = await bcrypt.hash(password, 10);
    const role = await db.query("SELECT r_id FROM dbo.Role WHERE name = 'admin'");
    if (!role.recordset[0]) throw new Error("Role 'admin' not found. Run npm run db:init first.");
    const rId = role.recordset[0].r_id;

    const existing = await db.query('SELECT uc_id FROM dbo.User_account WHERE username = @username', { username });
    if (existing.recordset[0]) {
        await db.query(
            'UPDATE dbo.User_account SET password_hash = @hash, r_id = @rId, is_active = 1 WHERE username = @username',
            { hash, rId, username }
        );
        console.log(`✔ Updated existing account "${username}" (admin, password reset)`);
    } else {
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
        console.log(`✔ Created admin "${username}"`);
    }
    process.exit(0);
}

main().catch((err) => {
    console.error('✖', err.message);
    process.exit(1);
});
