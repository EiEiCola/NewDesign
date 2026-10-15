const config = require('./config');
const app = require('./app');
const { getPool } = require('./config/db');

app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    console.log(`Admin (CMS):      http://localhost:${config.port}/admin/login.html`);

    getPool()
        .then(() => console.log(`Connected to SQL Server: ${config.db.server}/${config.db.database}`))
        .catch((err) => console.error(`Cannot connect to SQL Server (${config.db.server}): ${err.message}`));
});
