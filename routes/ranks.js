const express = require('express');
const { db } = require('../db');
const auth = require('../auth/checkAuth');
const { requireRole, badRequest, notFound } = require('../auth/permissions');

const router = express.Router();

function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayLocal() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function rankInfo(userId) {
  const u = db.prepare('SELECT rank_type, rank_until FROM users WHERE id = ?').get(userId);
  const until = parseDate(u.rank_until);
  const daysLeft = until ? Math.round((until - todayLocal()) / (1000 * 60 * 60 * 24)) : null;
  return { rankType: u.rank_type, rankUntil: u.rank_until,
    expiringSoon: daysLeft !== null && daysLeft < 30 && daysLeft >= 0 };
}

router.get('/my', auth, (req, res) => {
  requireRole(req, ['athlete']);
  res.json(rankInfo(req.user.id));
});

router.get('/my-athletes', auth, (req, res) => {
  requireRole(req, ['coach']);
  const rows = db.prepare(`SELECT u.id, u.fio FROM coach_athlete ca
    JOIN users u ON u.id = ca.athlete_user_id
    WHERE ca.coach_user_id = ? AND ca.status='active'`).all(req.user.id);
  res.json(rows.map(r => ({ athleteUserId: r.id, athleteFio: r.fio, ...rankInfo(r.id) })));
});

router.get('/', auth, (req, res) => {
  requireRole(req, ['federation']);
  const rows = db.prepare(`SELECT u.id, u.fio, u.rank_type, u.rank_until
    FROM users u WHERE u.roles LIKE '%athlete%'`).all();
  res.json(rows.map(r => ({ athleteUserId: r.id, athleteFio: r.fio,
    rankType: r.rank_type, rankUntil: r.rank_until, ...rankInfo(r.id) })));
});

router.post('/request', auth, (req, res) => {
  requireRole(req, ['athlete', 'coach']);
  const { athleteUserId, competitionId, resultId, rankType } = req.body;
  const target = req.user.activeRole === 'athlete' ? req.user.id : athleteUserId;
  if (!target || !competitionId || !resultId || !rankType) throw badRequest('все поля обязательны');
  const info = db.prepare(`INSERT INTO requests (type, user_id, competition_id, result_id, requested_type, status)
    VALUES ('rank', ?, ?, ?, ?, 'pending')`)
    .run(target, competitionId, resultId, rankType);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/:id/approve', auth, (req, res) => {
  requireRole(req, ['federation']);
  const reqRow = db.prepare("SELECT * FROM requests WHERE id = ? AND type='rank'").get(req.params.id);
  if (!reqRow) throw notFound('заявка не найдена');
  const { assignedDate, orderNumber, assignedUntil } = req.body;
  db.prepare(`UPDATE requests SET status='approved', assigned_date=?, order_number=?, assigned_until=? WHERE id=?`)
    .run(assignedDate, orderNumber, assignedUntil, req.params.id);
  db.prepare('UPDATE users SET rank_type=?, rank_until=? WHERE id=?')
    .run(reqRow.requested_type, assignedUntil, reqRow.user_id);
  res.json({ ok: true });
});

router.post('/:id/reject', auth, (req, res) => {
  requireRole(req, ['federation']);
  db.prepare("UPDATE requests SET status='rejected', reject_reason=? WHERE id=?")
    .run(req.body.reason || 'без причины', req.params.id);
  res.json({ ok: true });
});

router.get('/requests', auth, (req, res) => {
  requireRole(req, ['federation']);
  const rows = db.prepare(`SELECT r.*, u.fio FROM requests r
    JOIN users u ON u.id = r.user_id WHERE r.type='rank' ORDER BY r.created_at DESC`).all();
  res.json(rows.map(r => ({
    id: r.id, athleteUserId: r.user_id, athleteFio: r.fio,
    competitionId: r.competition_id, resultId: r.result_id,
    requestedType: r.requested_type, status: r.status,
  })));
});

module.exports = router;