const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const { ALLOWED_FILE_EXT, ALLOWED_IMAGE_EXT, MEDIA_KIND } = require('../config/constants');
const { badRequest } = require('../utils/http-error');
const files = require('../services/file.service');

/**
 * Files are saved as uploads/<side>/<mc_id>-<main category>/post<c_id>-<kind>-<random><ext>
 *   e.g. uploads/left/2-HR-Board/post12-header-3f9a1c2b7d4e.jpg
 * req.content (the post, set by loadEditable) decides the folder.
 * The original (possibly Thai) file name is kept only in the database.
 */
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const dir = path.join(config.paths.uploads, files.categoryFolder(req.content));
        fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    filename(req, file, cb) {
        const kind = MEDIA_KIND.includes(req.body.kind) ? req.body.kind : 'file';
        cb(null, files.mediaFileName(req.content.c_id, kind, path.extname(file.originalname).toLowerCase()));
    },
});

function fileFilter(req, file, cb) {
    // multer decodes names as latin1; convert so Thai names are stored correctly
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const ext = path.extname(file.originalname).toLowerCase();
    const imagesOnly = req.body.kind && req.body.kind !== 'attachment';
    const allowed = imagesOnly ? ALLOWED_IMAGE_EXT : ALLOWED_FILE_EXT;

    if (!allowed.includes(ext)) {
        return cb(badRequest(`ไม่รองรับไฟล์ชนิด ${ext || '(ไม่มีนามสกุล)'} (รองรับ: ${allowed.join(' ')})`));
    }
    if (imagesOnly && !file.mimetype.startsWith('image/')) {
        return cb(badRequest('ไฟล์นี้ไม่ใช่รูปภาพ'));
    }
    cb(null, true);
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: config.upload.maxBytes, files: 20 },
});

module.exports = { upload };
