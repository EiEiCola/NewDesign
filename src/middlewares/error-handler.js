const multer = require('multer');
const config = require('../config');

function notFoundHandler(req, res) {
    res.status(404).json({ error: 'ไม่พบ API นี้' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE'
            ? `ไฟล์ใหญ่เกิน ${config.upload.maxBytes / 1024 / 1024} MB`
            : `อัปโหลดไม่สำเร็จ (${err.code})`;
        return res.status(400).json({ error: msg });
    }

    const status = err.status || 500;
    if (status >= 500) console.error(err);

    res.status(status).json({
        error: status >= 500 ? 'เกิดข้อผิดพลาดในระบบ' : err.message,
        ...(status >= 500 && config.env !== 'production' ? { detail: err.message } : {}),
    });
}

module.exports = { notFoundHandler, errorHandler };
