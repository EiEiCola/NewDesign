/**
 * Create an admin account (or reset an existing user's password and make them admin).
 *   npm run create-admin -- <employee_id> <first_name> <last_name> <username> <password>
 */
const { upsertAccount } = require('./lib/accounts');

async function main() {
    const [employeeId, firstName, lastName, username, password] = process.argv.slice(2);
    if (!password) {
        console.error('Usage: npm run create-admin -- <employee_id> <first_name> <last_name> <username> <password>');
        process.exit(1);
    }
    const result = await upsertAccount({ employeeId, firstName, lastName, username, password, role: 'admin' });
    console.log(result === 'created' ? `✔ Created admin "${username}"` : `✔ Updated existing account "${username}" (admin, password reset)`);
    process.exit(0);
}

main().catch((err) => {
    console.error('✖', err.message);
    process.exit(1);
});
