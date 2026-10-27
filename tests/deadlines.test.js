const test = require('node:test');
const assert = require('node:assert');

function dateOnly(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function dateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dateString(d);
}

function daysLeft(until) {
  const target = dateOnly(until);
  if (!target) return null;
  return Math.round((target - today()) / (1000 * 60 * 60 * 24));
}

function expiringSoon(until) {
  const d = daysLeft(until);
  return d !== null && d < 30 && d >= 0;
}

test('срок через 10 дней -> expiringSoon true', () => {
  assert.strictEqual(expiringSoon(inDays(10)), true);
});

test('срок через 29 дней -> expiringSoon true', () => {
  assert.strictEqual(expiringSoon(inDays(29)), true);
});

test('срок через 30 дней -> expiringSoon false (порог)', () => {
  assert.strictEqual(expiringSoon(inDays(30)), false);
});

test('срок через 60 дней -> expiringSoon false', () => {
  assert.strictEqual(expiringSoon(inDays(60)), false);
});

test('срок вчера -> expiringSoon false (уже истёк)', () => {
  assert.strictEqual(expiringSoon(inDays(-1)), false);
});

test('срок не задан (null) -> expiringSoon false', () => {
  assert.strictEqual(expiringSoon(null), false);
});

test('срок завтра -> daysLeft 1', () => {
  assert.strictEqual(daysLeft(inDays(1)), 1);
});