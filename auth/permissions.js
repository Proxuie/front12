function requireRole(req, allowed) {
  if (!allowed.includes(req.user.activeRole)) {
    const e = new Error('доступ запрещён'); e.status = 403; e.code = 'FORBIDDEN'; throw e;
  }
}
function ensureSelf(req, userId) {
  if (req.user.id !== userId) {
    const e = new Error('доступ запрещён'); e.status = 403; e.code = 'FORBIDDEN'; throw e;
  }
}
function badRequest(msg) { const e = new Error(msg); e.status = 400; e.code = 'BAD_REQUEST'; return e; }
function conflict(msg) { const e = new Error(msg); e.status = 409; e.code = 'CONFLICT'; return e; }
function notFound(msg = 'не найдено') { const e = new Error(msg); e.status = 404; e.code = 'NOT_FOUND'; return e; }

module.exports = { requireRole, ensureSelf, badRequest, conflict, notFound };