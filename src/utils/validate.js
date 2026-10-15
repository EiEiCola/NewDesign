const { badRequest } = require('./http-error');

/** Trimmed string; throws when required and empty or longer than max. */
function str(value, field, { required = false, max = 255 } = {}) {
    const v = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
    if (required && !v) throw badRequest(`กรุณากรอก ${field}`);
    if (v.length > max) throw badRequest(`${field} ยาวเกิน ${max} ตัวอักษร`);
    return v || null;
}

/** Positive integer id from a route param or body field. */
function id(value, field = 'id') {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw badRequest(`${field} ไม่ถูกต้อง`);
    return n;
}

function int(value, fallback = 0) {
    const n = Number(value);
    return Number.isInteger(n) ? n : fallback;
}

function bool(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
}

/** Date or null; throws on an invalid non-empty value. */
function date(value, field) {
    if (value === null || value === undefined || value === '') return null;
    // "YYYY-MM-DD" alone would be parsed as UTC midnight; treat it as local midnight instead
    const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
    if (Number.isNaN(d.getTime())) throw badRequest(`${field} ไม่ถูกต้อง`);
    return d;
}

function oneOf(value, allowed, field) {
    if (!allowed.includes(value)) throw badRequest(`${field} ต้องเป็น ${allowed.join(', ')}`);
    return value;
}

/** page/pageSize from query string, clamped. */
function paging(q, defaultSize = 20) {
    const page = Math.max(1, int(q.page, 1));
    const pageSize = Math.min(100, Math.max(1, int(q.pageSize, defaultSize)));
    return { page, pageSize, offset: (page - 1) * pageSize };
}

module.exports = { str, id, int, bool, date, oneOf, paging };
