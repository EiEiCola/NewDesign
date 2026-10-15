/**
 * Run .sql files against the configured database (creates the database first if missing).
 *   node scripts/run-sql.js database/schema.sql database/seed.sql
 * Files are split on lines containing only "GO", like SSMS/sqlcmd.
 */
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const config = require('../src/config');

async function ensureDatabase() {
    const master = await new sql.ConnectionPool({ ...config.db, database: 'master' }).connect();
    try {
        const name = config.db.database;
        if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`Invalid DB_NAME: ${name}`);
        await master.request().query(`IF DB_ID('${name}') IS NULL CREATE DATABASE [${name}]`);
    } finally {
        await master.close();
    }
}

async function main() {
    const files = process.argv.slice(2);
    if (!files.length) {
        console.error('Usage: node scripts/run-sql.js <file.sql> [...]');
        process.exit(1);
    }

    await ensureDatabase();
    const pool = await new sql.ConnectionPool(config.db).connect();
    try {
        for (const file of files) {
            const text = fs.readFileSync(path.resolve(file), 'utf8');
            const batches = text.split(/^\s*GO\s*$/im).map((b) => b.trim()).filter(Boolean);
            for (const batch of batches) await pool.request().batch(batch);
            console.log(`✔ ${file} (${batches.length} batches)`);
        }
    } finally {
        await pool.close();
    }
}

main().catch((err) => {
    console.error('✖', err.message);
    process.exit(1);
});
