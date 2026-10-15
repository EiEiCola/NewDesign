const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const ROOT_DIR = path.join(__dirname, '..', '..');

function required(name) {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable: ${name} (see .env.example)`);
    return value;
}

module.exports = {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,

    paths: {
        root: ROOT_DIR,
        public: path.join(ROOT_DIR, 'public'),
        uploads: path.join(ROOT_DIR, 'uploads'),
    },

    db: {
        server: process.env.DB_SERVER || 'localhost',
        port: Number(process.env.DB_PORT) || 1433,
        database: process.env.DB_NAME || 'SirivatanaIntranet',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
        },
        pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    },

    jwt: {
        get secret() { return required('JWT_SECRET'); },
        expiresHours: Number(process.env.JWT_EXPIRES_HOURS) || 8,
    },

    upload: {
        maxBytes: (Number(process.env.UPLOAD_MAX_MB) || 20) * 1024 * 1024,
    },
};
