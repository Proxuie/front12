const express = require('express');
const { db } = require('../db');
const auth = require('../auth/checkAuth');
const { requireRole, badRequest, notFound } = require('../auth/permissions');
const { buildTeamOrder } = require('../documents/teamOrder');

const router = express.Router();

const POINTS = {
  'Чемпионат России': { 1: 100, 2: 80, 3: 60 },
  'Первенство России': { 1: 80, 2: 60, 3: 40 },
  'Межрегиональные': { 1: 60, 2: 45, 3: 30 },
  'Региональные': { 1: 40, 2: 30, 3: 20 },
};

router.get('/', auth, (req, res) => {
  const { disciplineId, ageGroupId } = req.query;
  let sql = `SELECT r.athlete_user_id, r.place, c.level, c.discipline_id, c.age_group_id,
    u.fio, u.disciplines FROM results r
    JOIN competitions c ON c.id = r.competition_id
    JOIN users u ON u.id = r.athlete_user_id
    WHERE r.place BETWEEN 1 AND 3 AND c.status='finished'`;
  const params = [];
  if (disciplineId) { sql += ' AND c.discipline_id = ?'; params.push(disciplineId); }
  if (ageGroupId) { sql += ' AND c.age_group_id = ?'; params.push(ageGroupId); }
  const rows = db.prepare(sql).all(...params);

  const byAthlete = new Map();
  rows.forEach(r => {
    const base = (POINTS[r.level] || {})[r.place] || 0;
    if (!byAthlete.has(r.athlete_user_id)) {
      byAthlete.set(r.athlete_user_id, { athleteUserId: r.athlete_user_id, fio: r.fio,
        results: [], total: 0, prizes: 0 });
    }
    const a = byAthlete.get(r.athlete_user_id);
    a.results.push({ level: r.level, place: r.place, basePoints: base });
    a.total += base;
    a.prizes++;
  });

  const list = [...byAthlete.values()]
    .map(a => ({ ...a, stabilityCoefficient: a.prizes >= 2 ? 1.2 : 1.0,
      total: Math.round(a.total * (a.prizes >= 2 ? 1.2 : 1.0)) }))
    .sort((x, y) => y.total - x.total);

  res.json(list);
});

router.get('/:athleteUserId', auth, (req, res) => {
  const rows = db.prepare(`SELECT r.*, c.level, c.name AS comp_name
    FROM results r JOIN competitions c ON c.id = r.competition_id
    WHERE r.athlete_user_id = ? AND r.place BETWEEN 1 AND 3 AND c.status='finished'`)
    .all(req.params.athleteUserId);
  if (!rows.length) throw notFound('нет результатов');
  const breakdown = rows.map(r => ({
    competitionName: r.comp_name, level: r.level, place: r.place,
    basePoints: ((POINTS[r.level] || {})[r.place] || 0),
  }));
  const prizes = rows.length;
  const baseSum = breakdown.reduce((s, x) => s + x.basePoints, 0);
  const coeff = prizes >= 2 ? 1.2 : 1.0;
  res.json({ athleteUserId: Number(req.params.athleteUserId), breakdown,
    stabilityCoefficient: coeff, total: Math.round(baseSum * coeff) });
});

router.post('/team/select', auth, (req, res) => {
  requireRole(req, ['federation']);
  const { season, disciplineId, athleteIds } = req.body;
  if (!season || !disciplineId || !Array.isArray(athleteIds)) throw badRequest('season, disciplineId, athleteIds обязательны');
  db.prepare('DELETE FROM team_members WHERE season=? AND discipline_id=?').run(season, disciplineId);
  const ins = db.prepare('INSERT INTO team_members (season, discipline_id, athlete_user_id) VALUES (?, ?, ?)');
  athleteIds.forEach(id => ins.run(season, disciplineId, id));
  res.json({ ok: true });
});

router.get('/team/:season/:disciplineId', auth, (req, res) => {
  const rows = db.prepare(`SELECT tm.*, u.fio FROM team_members tm
    JOIN users u ON u.id = tm.athlete_user_id
    WHERE tm.season=? AND tm.discipline_id=?`).all(req.params.season, req.params.disciplineId);
  res.json(rows.map(r => ({ athleteUserId: r.athlete_user_id, athleteFio: r.fio })));
});

router.get('/team/order/:season/:disciplineId', auth, async (req, res, next) => {
  try {
    requireRole(req, ['federation']);
    const buffer = await buildTeamOrder(req.params.season, req.params.disciplineId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="team_order_${req.params.season}_${req.params.disciplineId}.docx"`);
    res.send(buffer);
  } catch (e) { next(e); }
});

module.exports = router;