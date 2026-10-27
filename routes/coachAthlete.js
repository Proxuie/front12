const express = require('express');
const { db } = require('../db');
const auth = require('../auth/checkAuth');
const { requireRole, badRequest, notFound } = require('../auth/permissions');

const router = express.Router();

router.get('/', auth, (req, res) => {
  requireRole(req, ['coach']);
  const rows = db.prepare(`SELECT ca.*, u.fio, d.name AS discipline_name
    FROM coach_athlete ca
    JOIN users u ON u.id = ca.athlete_user_id
    JOIN disciplines d ON d.id = ca.discipline_id
    WHERE ca.coach_user_id = ? ORDER BY ca.created_at DESC`).all(req.user.id);
  res.json(rows.map(r => ({
    id: r.id, athleteUserId: r.athlete_user_id, athleteFio: r.fio,
    discipline: r.discipline_name, status: r.status, createdAt: r.created_at,
  })));
});

router.post('/request', auth, (req, res) => {
  requireRole(req, ['coach']);
  const { athleteLogin, disciplineId } = req.body;
  if (!athleteLogin || !disciplineId) throw badRequest('athleteLogin и disciplineId обязательны');
  const athlete = db.prepare("SELECT * FROM users WHERE login = ? AND roles LIKE '%athlete%'").get(athleteLogin);
  if (!athlete) throw notFound('спортсмен не найден');
  const dup = db.prepare('SELECT id FROM coach_athlete WHERE coach_user_id=? AND athlete_user_id=? AND discipline_id=?')
    .get(req.user.id, athlete.id, disciplineId);
  if (dup) throw badRequest('запрос уже существует');
  const info = db.prepare("INSERT INTO coach_athlete (coach_user_id, athlete_user_id, discipline_id, status) VALUES (?, ?, ?, 'pending')")
    .run(req.user.id, athlete.id, disciplineId);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/:id/confirm', auth, (req, res) => {
  requireRole(req, ['athlete']);
  const link = db.prepare('SELECT * FROM coach_athlete WHERE id = ?').get(req.params.id);
  if (!link) throw notFound('связь не найдена');
  if (link.athlete_user_id !== req.user.id) throw badRequest('это не ваша связь');
  db.prepare("UPDATE coach_athlete SET status='active' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/pause', auth, (req, res) => {
  requireRole(req, ['coach']);
  const link = db.prepare('SELECT * FROM coach_athlete WHERE id = ?').get(req.params.id);
  if (!link) throw notFound('связь не найдена');
  if (link.coach_user_id !== req.user.id) throw badRequest('это не ваша связь');
  db.prepare("UPDATE coach_athlete SET status='paused' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/finish', auth, (req, res) => {
  requireRole(req, ['coach']);
  const link = db.prepare('SELECT * FROM coach_athlete WHERE id = ?').get(req.params.id);
  if (!link) throw notFound('связь не найдена');
  if (link.coach_user_id !== req.user.id) throw badRequest('это не ваша связь');
  db.prepare("UPDATE coach_athlete SET status='finished' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;