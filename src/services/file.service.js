const fs = require('fs/promises');
const crypto = require('crypto');
const path = require('path');
const config = require('../config');

/** Turn a stored public path (/uploads/left/2-HR-Board/post1-header-ab12.jpg) into an absolute disk path inside uploads/. */
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

const SIDE_FOLDER = { 1: 'center', 2: 'left', 3: 'right' };

/**
 * Folder (relative to uploads/) for a post's files: <side>/<mc_id>-<main category name>
 *   e.g. left/2-HR-Board, center/1-ข่าวประชาสัมพันธ์
 * The id comes first so the folder stays unique even if two categories share a name.
 */
function categoryFolder({ side, mc_id: mcId, main_name: mainName }) {
    const name = String(mainName || '')
        .replace(/[\\/:*?"<>|#%&{}$!'`@+=~^\[\]\x00-\x1f]/g, '') // not allowed in Windows paths / awkward in URLs
        .trim()
        .replace(/[\s.]+/g, '-')
        .slice(0, 60)
        .replace(/^-+|-+$/g, '');
    return path.join(SIDE_FOLDER[side] || 'other', name ? `${mcId}-${name}` : String(mcId));
}

/** File name that says which post it belongs to: post<c_id>-<kind>-<random><ext> */
function mediaFileName(cId, kind, ext) {
    return `post${cId}-${kind}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

/**
 * Move a stored file into another folder (used when a post changes main category).
 * Returns the new public path.
 */
async function moveToFolder(filePath, folder) {
    const from = diskPath(filePath);
    const toDir = path.join(config.paths.uploads, folder);
    const to = path.join(toDir, path.basename(from));
    if (from === to) return filePath;
    await fs.mkdir(toDir, { recursive: true });
    await fs.rename(from, to);
    return publicPath(to);
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

module.exports = { diskPath, publicPath, removeFiles, categoryFolder, mediaFileName, moveToFolder };
