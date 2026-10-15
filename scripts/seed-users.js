/**
 * Create the default accounts defined in .env (SEED_ADMIN_* and SEED_USER_*).
 *   npm run db:seed-users     (also runs at the end of npm run db:init)
 * Accounts that already exist get their password and role reset to the .env values.
 * Leave a SEED_*_USERNAME empty to skip that account.
 */
require('../src/config'); // loads .env
const { upsertAccount } = require('./lib/accounts');

const ACCOUNTS = [
    { prefix: 'SEED_ADMIN', role: 'admin', firstName: 'ผู้ดูแล', lastName: 'ระบบ' },
    { prefix: 'SEED_USER', role: 'user', firstName: 'ผู้ใช้', lastName: 'ทั่วไป' },
];

async function main() {
    let done = 0;
    for (const a of ACCOUNTS) {
        const username = process.env[`${a.prefix}_USERNAME`];
        if (!username) continue;
        const role = process.env[`${a.prefix}_ROLE`] || a.role;
        const result = await upsertAccount({
            employeeId: process.env[`${a.prefix}_EMPLOYEE_ID`] || username,
            firstName: a.firstName,
            lastName: a.lastName,
            username,
            password: process.env[`${a.prefix}_PASSWORD`],
            role,
        });
        console.log(`✔ ${result === 'created' ? 'Created' : 'Updated'} "${username}" (${role})`);
        done++;
    }
    if (!done) console.log('No SEED_*_USERNAME in .env, nothing to do');
    process.exit(0);
}

main().catch((err) => {
    console.error('✖', err.message);
    process.exit(1);
});
