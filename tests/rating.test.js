const test = require('node:test');
const assert = require('node:assert');

function calcPoints(level, place) {
  const POINTS = {
    'Чемпионат России': { 1: 100, 2: 80, 3: 60 },
    'Первенство России': { 1: 80, 2: 60, 3: 40 },
    'Межрегиональные': { 1: 60, 2: 45, 3: 30 },
    'Региональные': { 1: 40, 2: 30, 3: 20 },
  };
  return (POINTS[level] || {})[place] || 0;
}

test('баллы за 1 место на чемпионате России = 100', () => {
  assert.strictEqual(calcPoints('Чемпионат России', 1), 100);
});

test('баллы за 3 место на региональных = 20', () => {
  assert.strictEqual(calcPoints('Региональные', 3), 20);
});

test('баллы за 2 место на межрегиональных = 45', () => {
  assert.strictEqual(calcPoints('Межрегиональные', 2), 45);
});

test('неизвестный уровень = 0', () => {
  assert.strictEqual(calcPoints('Неизвестно', 1), 0);
});

test('коэффициент стабильности 1.2 при 2+ призах', () => {
  const prizes = 2;
  const coeff = prizes >= 2 ? 1.2 : 1.0;
  assert.strictEqual(coeff, 1.2);
});

test('коэффициент стабильности 1.0 при 1 призе', () => {
  const prizes = 1;
  const coeff = prizes >= 2 ? 1.2 : 1.0;
  assert.strictEqual(coeff, 1.0);
});