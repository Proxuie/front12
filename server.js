require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDb, db } = require('./db');
const { seed } = require('./db/seed');

initDb();
seed();

const app = express();
app.use(express.json());
if (process.env.NODE_ENV !== 'production') app.use(cors());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/competitions', require('./routes/competitions'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/coach-athlete', require('./routes/coachAthlete'));
app.use('/api/results', require('./routes/results'));
app.use('/api/judges', require('./routes/judges'));
app.use('/api/ranks', require('./routes/ranks'));
app.use('/api/registry', require('./routes/registry'));
app.use('/api/rating', require('./routes/rating'));
app.use('/api/reports', require('./routes/reports'));

app.get('/api/health', (req, res) => res.send('ok'));

app.get('/api/debug/db', (req, res) => {
  const t = (name) => db.prepare(`SELECT COUNT(*) AS c FROM ${name}`).get().c;
  res.json({
    users: t('users'),
    disciplines: t('disciplines'),
    competitions: t('competitions'),
    results: t('results'),
    applications: t('applications'),
  });
});

require('./workers');

app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL';
  const message = status === 500 ? 'Внутренняя ошибка сервера' : err.message;
  if (status === 500) console.error(err);
  res.status(status).json({ error: { code, message } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));

process.on('SIGINT', () => {
  console.log('закрываю БД...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});