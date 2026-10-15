/**
 * Wipe everything and start fresh: drops the database and deletes uploaded files.
 *   npm run db:reset      (then db:init creates tables, categories and the SEED_* accounts again)
 * Asks you to type the database name first; pass --yes to skip the question.
 * Refuses to run when NODE_ENV=production.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sql = require('mssql');
const config = require('../src/config');

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
    }));
}

async function dropDatabase(name) {
    const master = await new sql.ConnectionPool({ ...config.db, database: 'master' }).connect();
    try {
        // SINGLE_USER ... ROLLBACK IMMEDIATE disconnects the running app so the drop does not wait
        await master.request().batch(`
            IF DB_ID('${name}') IS NOT NULL
            BEGIN
                ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                DROP DATABASE [${name}];
            END`);
    } finally {
        await master.close();
    }
}

/** Delete everything inside uploads/ except .gitkeep. */
function clearUploads(dir) {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    for (const entry of fs.readdirSync(dir)) {
        if (entry === '.gitkeep') continue;
        fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
        count++;
    }
    return count;
}

async function main() {
    if (config.env === 'production') throw new Error('Refusing to reset when NODE_ENV=production');

    const name = config.db.database;
    if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Invalid DB_NAME: ${name}`);

    if (!process.argv.includes('--yes')) {
        console.log(`This deletes ALL data in database "${name}" on ${config.db.server} and all files in uploads/.`);
        const answer = await ask(`Type the database name to continue (${name}): `);
        if (answer !== name) {
            console.log('Cancelled');
            process.exit(1);
        }
    }

    await dropDatabase(name);
    console.log(`✔ Dropped database ${name}`);
    const removed = clearUploads(config.paths.uploads);
    console.log(`✔ Cleared uploads/ (${removed} item${removed === 1 ? '' : 's'})`);
    process.exit(0);
}

main().catch((err) => {
    console.error('✖', err.message);
    process.exit(1);
});
