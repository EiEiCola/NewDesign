const ROLE = Object.freeze({ ADMIN: 'admin', EDITOR: 'editor', USER: 'user' });

/** Roles allowed to create / edit content. */
const CAN_POST = Object.freeze([ROLE.ADMIN, ROLE.EDITOR]);

const SIDE = Object.freeze({ CENTER: 1, LEFT: 2, RIGHT: 3 });

const CONTENT_STATUS = Object.freeze(['draft', 'published', 'hidden']);

const MEDIA_KIND = Object.freeze(['header', 'gallery', 'inline', 'attachment']);

const ACTION = Object.freeze({
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    LOGIN_FAILED: 'LOGIN_FAILED',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    VIEW: 'VIEW',
});

/** Allowed upload types: extension -> mime prefix check. */
const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_FILE_EXT = [...ALLOWED_IMAGE_EXT, '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip'];

module.exports = { ROLE, CAN_POST, SIDE, CONTENT_STATUS, MEDIA_KIND, ACTION, ALLOWED_IMAGE_EXT, ALLOWED_FILE_EXT };
