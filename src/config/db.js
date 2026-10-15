const sql = require('mssql');
const config = require('./index');

let poolPromise = null;

/** Shared connection pool (created on first use). */
function getPool() {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(config.db).connect().catch((err) => {
            poolPromise = null; // allow retry on next request
            throw err;
        });
    }
    return poolPromise;
}

/**
 * Run a parameterized query.
 *   query('SELECT * FROM Users WHERE u_id = @id', { id: 5 })
 * Values are always sent as parameters (never concatenated) to prevent SQL injection.
 */
async function query(text, params = {}, tx = null) {
    const request = tx ? new sql.Request(tx) : (await getPool()).request();
    for (const [name, value] of Object.entries(params)) {
        request.input(name, value === undefined ? null : value);
    }
    return request.query(text);
}

/** Run fn(tx) inside a transaction; commits on success, rolls back on error. */
async function transaction(fn) {
    const tx = new sql.Transaction(await getPool());
    await tx.begin();
    try {
        const result = await fn(tx);
        await tx.commit();
        return result;
    } catch (err) {
        await tx.rollback().catch(() => {});
        throw err;
    }
}

module.exports = { sql, getPool, query, transaction };
