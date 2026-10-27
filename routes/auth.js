const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const auth = require('../auth/checkAuth');
const { requireRole, badRequest, conflict, notFound } = require('../auth/permissions');

const router = express.Router();

const OPEN_ROLES = ['athlete', 'coach', 'judge'];

router.post('/register', (req, res) => {
  const {
    login, password, fio, role,
    email, phone, consentPd,
    birthDate, municipality, organizationId, startYear,
    disciplines, legalRepresentative,
  } = req.body;

  if (!login || !password || !fio || !role) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'заполните логин, пароль, ФИО и роль' } });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'пароль должен быть не короче 6 символов' } });
  }
  if (!consentPd) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'требуется согласие на обработку персональных данных' } });
  }

  const isFederationRequest = role === 'federation';
  if (!isFederationRequest && !OPEN_ROLES.includes(role)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'недопустимая роль' } });
  }

  if (role === 'athlete') {
    if (!birthDate) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'для спортсмена укажите дату рождения' } });
    }
    if (calcAge(birthDate) < 18 && !legalRepresentative) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'для несовершеннолетнего укажите законного представителя' } });
    }
  }

  const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(login);
  if (existing) {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'логин уже занят' } });
  }

  const hash = bcrypt.hashSync(password, 10);
  const finalRoles = isFederationRequest ? '' : role;

  const info = db.prepare(`
    INSERT INTO users (
      login, password_hash, fio, roles, email, phone,
      consent_pd, legal_representative,
      birth_date, municipality, organization_id, start_year, disciplines
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
  `).run(
    login, hash, fio, finalRoles,
    email || null, phone || null,
    legalRepresentative || null,
    birthDate || null, municipality || null,
    organizationId || null, startYear || null,
    Array.isArray(disciplines) ? disciplines.join(',') : (disciplines || null)
  );

  if (isFederationRequest) {
    db.prepare(`
      INSERT INTO requests (type, user_id, requested_type, status)
      VALUES ('federation', ?, 'federation', 'pending')
    `).run(info.lastInsertRowid);
  }

  const token = jwt.sign({ sub: info.lastInsertRowid }, process.env.JWT_SECRET, { expiresIn: '24h' });

  res.status(201).json({
    token,
    user: { id: info.lastInsertRowid, fio },
    roles: isFederationRequest ? [] : [role],
    pendingFederation: isFederationRequest,
  });
});

router.post('/login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'логин и пароль обязательны' } });
  }
  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'неверный логин или пароль' } });
  }
  const roles = user.roles ? user.roles.split(',').filter(Boolean) : [];
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

  const pending = db.prepare(`
    SELECT id FROM requests WHERE user_id=? AND type='federation' AND status='pending'
  `).get(user.id);

  res.json({
    token,
    user: { id: user.id, fio: user.fio },
    roles,
    pendingFederation: !!pending && roles.length === 0,
  });
});

router.get('/me', auth, (req, res) => {
  const pending = db.prepare(`
    SELECT id, status FROM requests WHERE user_id=? AND type='federation'
    ORDER BY id DESC LIMIT 1
  `).get(req.user.id);

  res.json({
    id: req.user.id,
    fio: req.user.fio,
    roles: req.user.roles,
    activeRole: req.user.activeRole,
    federationRequest: pending ? { id: pending.id, status: pending.status } : null,
  });
});

router.get('/my-federation-request', auth, (req, res) => {
  const request = db.prepare(`
    SELECT id, status, reject_reason, created_at
    FROM requests WHERE user_id=? AND type='federation'
    ORDER BY id DESC LIMIT 1
  `).get(req.user.id);
  if (!request) return res.json(null);
  res.json({
    id: request.id,
    status: request.status,
    rejectReason: request.reject_reason,
    createdAt: request.created_at,
  });
});

router.get('/federation-requests', auth, (req, res) => {
  requireRole(req, ['federation']);
  const rows = db.prepare(`
    SELECT r.id, r.user_id, r.status, r.reject_reason, r.created_at,
           u.fio, u.login, u.email, u.phone
    FROM requests r
    JOIN users u ON u.id = r.user_id
    WHERE r.type = 'federation'
    ORDER BY CASE WHEN r.status='pending' THEN 0 ELSE 1 END, r.created_at DESC
  `).all();
  res.json(rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    fio: r.fio,
    login: r.login,
    email: r.email,
    phone: r.phone,
    status: r.status,
    rejectReason: r.reject_reason,
    createdAt: r.created_at,
  })));
});

router.post('/federation-requests/:id/approve', auth, (req, res) => {
  requireRole(req, ['federation']);
  const request = db.prepare(`SELECT * FROM requests WHERE id=? AND type='federation'`).get(req.params.id);
  if (!request) throw notFound('заявка не найдена');
  if (request.status !== 'pending') throw badRequest('заявка уже рассмотрена');

  const user = db.prepare('SELECT roles FROM users WHERE id=?').get(request.user_id);
  const roles = user.roles ? user.roles.split(',').filter(Boolean) : [];
  if (!roles.includes('federation')) roles.push('federation');

  db.prepare('UPDATE users SET roles=? WHERE id=?').run(roles.join(','), request.user_id);
  db.prepare(`UPDATE requests SET status='approved' WHERE id=?`).run(request.id);
  res.json({ ok: true });
});

router.post('/federation-requests/:id/reject', auth, (req, res) => {
  requireRole(req, ['federation']);
  const request = db.prepare(`SELECT * FROM requests WHERE id=? AND type='federation'`).get(req.params.id);
  if (!request) throw notFound('заявка не найдена');
  if (request.status !== 'pending') throw badRequest('заявка уже рассмотрена');

  db.prepare(`UPDATE requests SET status='rejected', reject_reason=? WHERE id=?`)
    .run(req.body.reason || 'без причины', request.id);
  res.json({ ok: true });
});

function calcAge(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

module.exports = router;