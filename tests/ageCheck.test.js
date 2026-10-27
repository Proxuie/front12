const test = require('node:test');
const assert = require('node:assert');

function checkAge(birthDate, ageFrom, ageTo) {
  if (!birthDate) return true;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= ageFrom && age <= ageTo;
}

test('14-летний проходит в группу 14-17', () => {
  const bd = new Date();
  bd.setFullYear(bd.getFullYear() - 14);
  assert.strictEqual(checkAge(bd.toISOString().slice(0, 10), 14, 17), true);
});

test('13-летний не проходит в группу 14-17', () => {
  const bd = new Date();
  bd.setFullYear(bd.getFullYear() - 13);
  assert.strictEqual(checkAge(bd.toISOString().slice(0, 10), 14, 17), false);
});

test('22-летний не проходит в группу 18-21', () => {
  const bd = new Date();
  bd.setFullYear(bd.getFullYear() - 22);
  assert.strictEqual(checkAge(bd.toISOString().slice(0, 10), 18, 21), false);
});

test('18-летний проходит в группу 18-21', () => {
  const bd = new Date();
  bd.setFullYear(bd.getFullYear() - 18);
  assert.strictEqual(checkAge(bd.toISOString().slice(0, 10), 18, 21), true);
});