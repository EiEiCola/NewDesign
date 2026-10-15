/** Error with an HTTP status; thrown from controllers and turned into JSON by the error handler. */
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const badRequest = (msg = 'ข้อมูลไม่ถูกต้อง') => new HttpError(400, msg);
const unauthorized = (msg = 'กรุณาเข้าสู่ระบบ') => new HttpError(401, msg);
const forbidden = (msg = 'ไม่มีสิทธิ์ทำรายการนี้') => new HttpError(403, msg);
const notFound = (msg = 'ไม่พบข้อมูล') => new HttpError(404, msg);
const conflict = (msg) => new HttpError(409, msg);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict };
