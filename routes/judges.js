const express = require('express');
const { db } = require('../db');
const auth = require('../auth/checkAuth');
const { requireRole, badRequest, notFound } = require('../auth/permissions');

const router = express.Router();

router.get('/assignments', auth, (req, res) => {
  requireRole(req, ['federation']);
  const { competitionId } = req.query;
  if (!competitionId) throw badRequest('competitionId обязателен');
  const rows = db.prepare(`SELECT ja.*, u.fio FROM judge_assignments ja
    JOIN users u ON u.id = ja.judge_user_id WHERE ja.competition_id = ?`).all(competitionId);
  res.json(rows.map(r => ({
    id: r.id, competitionId: r.competition_id, judgeUserId: r.judge_user_id,
    judgeFio: r.fio, position: r.position,
  })));
});

router.post('/assignments', auth, (req, res) => {
  requireRole(req, ['federation']);
  const { competitionId, judgeUserId, position } = req.body;
  if (!competitionId || !judgeUserId || !position) throw badRequest('все поля обязательны');
  const info = db.prepare('INSERT INTO judge_assignments (competition_id, judge_user_id, position) VALUES (?, ?, ?)')
    .run(competitionId, judgeUserId, position);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get('/my', auth, (req, res) => {
  requireRole(req, ['judge']);
  const rows = db.prepare(`SELECT ja.*, c.name AS comp_name, c.date_start
    FROM judge_assignments ja JOIN competitions c ON c.id = ja.competition_id
    WHERE ja.judge_user_id = ? ORDER BY c.date_start DESC`).all(req.user.id);
  res.json(rows.map(r => ({
    id: r.id, competitionId: r.competition_id, competitionName: r.comp_name,
    dateStart: r.date_start, position: r.position,
  })));
});

function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayLocal() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

router.get('/category/my', auth, (req, res) => {
  requireRole(req, ['judge']);
  const u = db.prepare('SELECT category, category_until FROM users WHERE id = ?').get(req.user.id);
  const until = parseDate(u.category_until);
  const daysLeft = until ? Math.round((until - todayLocal()) / (1000 * 60 * 60 * 24)) : null;
  
  res.json({ category: u.category, categoryUntil: u.category_until,
    expiringSoon: daysLeft !== null && daysLeft < 30 && daysLeft >= 0 });
});

router.post('/category/request', auth, (req, res) => {
  requireRole(req, ['judge']);
  const { category } = req.body;
  if (!category) throw badRequest('category обязательна');
  const info = db.prepare("INSERT INTO requests (type, user_id, requested_type, status) VALUES ('judge_category', ?, ?, 'pending')")
    .run(req.user.id, category);
  res.status(201).json({ id: info.lastInsertRowid });
});

module.exports = router;