const test = require('node:test');
const assert = require('node:assert');

const OPEN_ROLES = ['athlete', 'coach', 'judge'];

function calcAge(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function validateRegister(body) {
  const {
    login, password, fio, role,
    consentPd, birthDate, legalRepresentative,
  } = body;

  if (!login || !password || !fio || !role) {
    return { ok: false, code: 'BAD_REQUEST', message: 'заполните логин, пароль, ФИО и роль' };
  }
  if (password.length < 6) {
    return { ok: false, code: 'BAD_REQUEST', message: 'пароль должен быть не короче 6 символов' };
  }
  if (!consentPd) {
    return { ok: false, code: 'BAD_REQUEST', message: 'требуется согласие на обработку персональных данных' };
  }

  const isFederationRequest = role === 'federation';
  
  if (!isFederationRequest && !OPEN_ROLES.includes(role)) {
    return { ok: false, code: 'BAD_REQUEST', message: 'недопустимая роль' };
  }

  if (role === 'athlete') {
    if (!birthDate) {
      return { ok: false, code: 'BAD_REQUEST', message: 'для спортсмена укажите дату рождения' };
    }
    if (calcAge(birthDate) < 18 && !legalRepresentative) {
      return { ok: false, code: 'BAD_REQUEST', message: 'для несовершеннолетнего укажите законного представителя' };
    }
  }

  return {
    ok: true,
    isFederationRequest,
    roles: isFederationRequest ? [] : [role],
  };
}

function resolveRolesAfterApprove(currentRoles) {
  const roles = currentRoles ? currentRoles.split(',').filter(Boolean) : [];
  if (!roles.includes('federation')) roles.push('federation');
  return roles.join(',');
}

const validBase = {
  login: 'test',
  password: 'qwerty123',
  fio: 'Тестов Тест',
  role: 'athlete',
  consentPd: true,
  birthDate: '2000-01-01',
};

test('регистрация: без логина ошибка', () => {
  const r = validateRegister({ ...validBase, login: '' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'BAD_REQUEST');
});

test('регистрация: без пароля ошибка', () => {
  const r = validateRegister({ ...validBase, password: '' });
  assert.strictEqual(r.ok, false);
});

test('регистрация: пароль короче 6 символов ошибка', () => {
  const r = validateRegister({ ...validBase, password: '12345' });
  assert.strictEqual(r.ok, false);
  assert.match(r.message, /6 символов/);
});

test('регистрация: пароль ровно 6 символов ок', () => {
  const r = validateRegister({ ...validBase, password: '123456' });
  assert.strictEqual(r.ok, true);
});

test('регистрация: без согласия на ПД ошибка', () => {
  const r = validateRegister({ ...validBase, consentPd: false });
  assert.strictEqual(r.ok, false);
  assert.match(r.message, /согласие/);
});

test('регистрация: недопустимая роль ошибка', () => {
  const r = validateRegister({ ...validBase, role: 'admin', birthDate: undefined });
  assert.strictEqual(r.ok, false);
  assert.match(r.message, /недопустимая роль/);
});

test('регистрация: athlete без birthDate ошибка', () => {
  const r = validateRegister({ ...validBase, birthDate: undefined });
  assert.strictEqual(r.ok, false);
  assert.match(r.message, /дату рождения/);
});

test('регистрация: несовершеннолетний без представителя ошибка', () => {
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - 15);
  const r = validateRegister({ ...validBase, birthDate: birth.toISOString().slice(0, 10) });
  assert.strictEqual(r.ok, false);
  assert.match(r.message, /законного представителя/);
});

test('регистрация: несовершеннолетний с представителем ок', () => {
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - 15);
  const r = validateRegister({
    ...validBase,
    birthDate: birth.toISOString().slice(0, 10),
    legalRepresentative: 'Тестова Анна',
  });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.roles, ['athlete']);
});

test('регистрация: athlete ок, roles = [athlete]', () => {
  const r = validateRegister(validBase);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.isFederationRequest, false);
  assert.deepStrictEqual(r.roles, ['athlete']);
});

test('регистрация: coach ок, roles = [coach]', () => {
  const r = validateRegister({ ...validBase, role: 'coach', birthDate: undefined });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.roles, ['coach']);
});

test('регистрация: judge ок, roles = [judge]', () => {
  const r = validateRegister({ ...validBase, role: 'judge', birthDate: undefined });
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.roles, ['judge']);
});

test('регистрация: federation ок, roles = [], pendingFederation', () => {
  const r = validateRegister({ ...validBase, role: 'federation', birthDate: undefined });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.isFederationRequest, true);
  assert.deepStrictEqual(r.roles, []);
});

test('одобрение: пустые роли дают [federation]', () => {
  const result = resolveRolesAfterApprove('');
  assert.strictEqual(result, 'federation');
});

test('одобрение: к athlete добавляется federation', () => {
  const result = resolveRolesAfterApprove('athlete');
  assert.strictEqual(result, 'athlete,federation');
});

test('одобрение: повторное одобрение не дублирует federation', () => {
  const result = resolveRolesAfterApprove('athlete,federation');
  assert.strictEqual(result, 'athlete,federation');
});

test('одобрение: к coach,judge добавляется federation', () => {
  const result = resolveRolesAfterApprove('coach,judge');
  assert.strictEqual(result, 'coach,judge,federation');
});