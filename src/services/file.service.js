const fs = require('fs/promises');
const path = require('path');
const config = require('../config');

/** Turn a stored public path (/uploads/2026/10/x.jpg) into an absolute disk path inside uploads/. */
function diskPath(filePath) {
    const relative = String(filePath).replace(/^\/uploads\//, '');
    const full = path.resolve(config.paths.uploads, relative);
    if (!full.startsWith(path.resolve(config.paths.uploads) + path.sep)) {
        throw new Error('Invalid upload path');
    }
    return full;
}

/** Public URL path for a file multer just saved. */
function publicPath(absolutePath) {
    const relative = path.relative(config.paths.uploads, absolutePath).split(path.sep).join('/');
    return `/uploads/${relative}`;
}

/** Delete files from disk, ignoring ones that are already gone. */
async function removeFiles(filePaths) {
    await Promise.all(
        filePaths.map(async (p) => {
            try {
                await fs.unlink(diskPath(p));
            } catch (err) {
                if (err.code !== 'ENOENT') console.error('[file] delete failed:', p, err.message);
            }
        })
    );
}

module.exports = { diskPath, publicPath, removeFiles };
