const express = require('express');
const { db } = require('../db');
const auth = require('../auth/checkAuth');
const { requireRole, badRequest, notFound } = require('../auth/permissions');
const { buildProtocol } = require('../documents/protocol');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const { competitionId } = req.query;
  if (!competitionId) throw badRequest('competitionId обязателен');
  const rows = db.prepare(`SELECT r.*, u.fio, u.login
    FROM results r JOIN users u ON u.id = r.athlete_user_id
    WHERE r.competition_id = ? ORDER BY r.place ASC`).all(competitionId);
  res.json(rows.map(r => ({
    id: r.id, competitionId: r.competition_id, athleteUserId: r.athlete_user_id,
    athleteFio: r.fio, place: r.place, points: r.points,
  })));
});

router.post('/', auth, (req, res) => {
  requireRole(req, ['federation']);
  const { competitionId, athleteUserId, place, points } = req.body;
  if (!competitionId || !athleteUserId) throw badRequest('competitionId и athleteUserId обязательны');
  const app = db.prepare("SELECT * FROM applications WHERE competition_id=? AND athlete_user_id=? AND status='approved'")
    .get(competitionId, athleteUserId);
  if (!app) throw badRequest('нет одобренной заявки этого спортсмена');
  const existing = db.prepare('SELECT id FROM results WHERE competition_id=? AND athlete_user_id=?')
    .get(competitionId, athleteUserId);
  if (existing) {
    db.prepare('UPDATE results SET place=?, points=? WHERE id=?')
      .run(place || null, points || null, existing.id);
    return res.json({ id: existing.id });
  }
  const info = db.prepare('INSERT INTO results (competition_id, athlete_user_id, place, points) VALUES (?, ?, ?, ?)')
    .run(competitionId, athleteUserId, place || null, points || null);
  db.prepare("UPDATE competitions SET status='finished' WHERE id=? AND status='closed'").run(competitionId);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get('/athlete/:id', auth, (req, res) => {
  const targetId = Number(req.params.id);
  if (req.user.activeRole === 'athlete' && req.user.id !== targetId) {
    throw badRequest('можно смотреть только свои результаты');
  }
  const rows = db.prepare(`SELECT r.*, c.name AS comp_name, c.date_start, c.level, c.type
    FROM results r JOIN competitions c ON c.id = r.competition_id
    WHERE r.athlete_user_id = ? ORDER BY c.date_start DESC`).all(targetId);
  res.json(rows.map(r => ({
    id: r.id, competitionId: r.competition_id, competitionName: r.comp_name,
    dateStart: r.date_start, level: r.level, type: r.type,
    place: r.place, points: r.points,
  })));
});

router.get('/:competitionId/protocol', auth, async (req, res, next) => {
  try {
    const buffer = await buildProtocol(req.params.competitionId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="protocol_${req.params.competitionId}.docx"`);
    res.send(buffer);
  } catch (e) { next(e); }
});

module.exports = router;