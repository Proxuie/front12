/* ==========================================================================
   Вход, регистрация, ожидание роли федерации и профиль пользователя.
   ========================================================================== */

/* --- Общий каркас страниц авторизации ------------------------------------ */

function authLayout(content, wide) {
  return '<div class="auth-page">' +
    '<section class="auth-hero">' +
      '<div class="auth-brand">' +
        '<span class="brand-mark lg">ФСП</span>' +
        '<div><strong>Федерация спортивного программирования</strong><small>Оренбургская область</small></div>' +
      '</div>' +
      '<div>' +
        '<h1>Единая цифровая <span>платформа федерации</span></h1>' +
        '<p class="auth-lead">Соревнования, заявки, результаты, протоколы, разряды, рейтинг и сборная — в одном рабочем месте для спортсменов, тренеров, судей и федерации.</p>' +
        '<ul class="auth-points">' +
          '<li>Календарь и приём заявок</li>' +
          '<li>Результаты и протоколы</li>' +
          '<li>Разряды и судейские категории</li>' +
          '<li>Рейтинг и состав сборной</li>' +
          '<li>Реестр спортсменов и отчёты</li>' +
          '<li>Один аккаунт на все роли</li>' +
        '</ul>' +
      '</div>' +
      '<div class="auth-foot"><span>Региональное отделение · Оренбург</span><span>демо-версия 2026</span></div>' +
    '</section>' +
    '<section class="auth-panel">' +
      '<div class="auth-card' + (wide ? ' auth-wide' : '') + '">' + content + '</div>' +
    '</section>' +
  '</div>';
}

/* --- Вход ---------------------------------------------------------------- */

function renderLoginPage() {
  var app = document.getElementById('app');

  app.innerHTML = authLayout(
    '<h2>Вход в личный кабинет</h2>' +
    '<p class="auth-sub">Введите логин и пароль, чтобы продолжить работу.</p>' +
    '<form id="login-form" novalidate>' +
      '<label class="field">Логин' +
        '<input name="login" autocomplete="username" placeholder="например, athlete" required>' +
      '</label>' +
      '<label class="field">Пароль' +
        '<input name="password" type="password" autocomplete="current-password" placeholder="••••••" required>' +
      '</label>' +
      '<div class="form-error" id="login-error" hidden></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Войти</button>' +
    '</form>' +
    '<p class="auth-switch">Нет аккаунта? <a href="#/register">Зарегистрироваться</a></p>' +
    '<div class="demo-box">' +
      '<div class="demo-title">Демо-доступы · пароль 123</div>' +
      '<div class="demo-chips">' +
        '<button type="button" data-demo="fed">Федерация</button>' +
        '<button type="button" data-demo="athlete">Спортсмен</button>' +
        '<button type="button" data-demo="coach">Тренер</button>' +
        '<button type="button" data-demo="judge">Судья</button>' +
        '<button type="button" data-demo="both">Спортсмен + тренер</button>' +
      '</div>' +
    '</div>'
  );

  var form = app.querySelector('#login-form');
  var errorBox = app.querySelector('#login-error');
  var submit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    var data = new FormData(form);
    var login = String(data.get('login') || '').trim();
    var password = String(data.get('password') || '');

    errorBox.hidden = true;

    if (!login || !password) {
      errorBox.textContent = 'Заполните логин и пароль.';
      errorBox.hidden = false;
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Входим…';

    try {
      var result = await api('POST', '/auth/login', { login: login, password: password }, { role: false });
      auth.token = result.token;
      auth.user = result.user;
      auth.roles = result.roles || [];
      auth.activeRole = auth.roles[0] || null;
      saveAuth();

      toast('Добро пожаловать, ' + shortFio(result.user.fio) + '!', 'success');
      location.hash = auth.roles.length ? '#/dashboard' : '#/pending';
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Войти';
    }
  });

  app.querySelectorAll('[data-demo]').forEach(function (button) {
    button.addEventListener('click', function () {
      form.elements.login.value = button.getAttribute('data-demo');
      form.elements.password.value = '123';
      form.requestSubmit();
    });
  });
}

/* --- Регистрация --------------------------------------------------------- */

function ageFromBirthDate(birthDate) {
  if (!birthDate) return null;
  var birth = new Date(birthDate);
  var now = new Date();
  var age = now.getFullYear() - birth.getFullYear();
  var month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

async function renderRegisterPage() {
  var app = document.getElementById('app');

  showLoading(app, 'Готовим форму регистрации…');

  var catalog;
  try {
    catalog = await loadCatalog();
  } catch (error) {
    catalog = { disciplines: [], ageGroups: [], organizations: [] };
  }

  var disciplinesChecks = catalog.disciplines.map(function (discipline) {
    return '<label class="check-line">' +
      '<input type="checkbox" name="disciplines" value="' + esc(discipline.id) + '">' +
      '<span>' + esc(discipline.name) + '</span>' +
    '</label>';
  }).join('');

  app.innerHTML = authLayout(
    '<h2>Регистрация</h2>' +
    '<p class="auth-sub">Создайте аккаунт спортсмена, тренера или судьи. Роль федерации выдаётся после одобрения.</p>' +

    '<div class="role-tabs" id="role-tabs">' +
      '<button type="button" data-role="athlete" class="active">Спортсмен</button>' +
      '<button type="button" data-role="coach">Тренер</button>' +
      '<button type="button" data-role="judge">Судья</button>' +
      '<button type="button" data-role="federation">Федерация</button>' +
    '</div>' +

    '<form id="register-form" novalidate>' +
      '<div class="form-row">' +
        '<label class="field">Логин<input name="login" autocomplete="username" placeholder="ivanov" required></label>' +
        '<label class="field">Пароль<input name="password" type="password" autocomplete="new-password" placeholder="минимум 6 символов" required></label>' +
      '</div>' +
      '<label class="field">ФИО полностью<input name="fio" placeholder="Иванов Иван Иванович" required></label>' +
      '<div class="form-row">' +
        '<label class="field">E-mail<input name="email" type="email" placeholder="name@example.ru"></label>' +
        '<label class="field">Телефон<input name="phone" placeholder="+7 900 000-00-00"></label>' +
      '</div>' +

      '<div id="athlete-fields">' +
        '<div class="form-row">' +
          '<label class="field">Дата рождения<input name="birthDate" type="date" required></label>' +
          '<label class="field">Муниципалитет<input name="municipality" placeholder="Оренбург"></label>' +
        '</div>' +
        '<div class="form-row">' +
          '<label class="field">Организация<select name="organizationId">' +
            optionsHtml(catalog.organizations, null, 'Не указана') +
          '</select></label>' +
          '<label class="field">Год начала занятий<input name="startYear" type="number" min="1950" max="2026" placeholder="2018"></label>' +
        '</div>' +
        '<div class="field"><span>Дисциплины</span>' +
          '<div style="display:grid;gap:8px;margin-top:4px">' +
            (disciplinesChecks || '<span class="hint">Справочник дисциплин недоступен.</span>') +
          '</div>' +
        '</div>' +
        '<label class="field">Законный представитель' +
          '<input name="legalRepresentative" placeholder="Нужен, если спортсмену меньше 18 лет">' +
        '</label>' +
      '</div>' +

      '<div class="notice" id="federation-note" hidden>Аккаунт создаётся сразу, но роль «Федерация» появится только после одобрения действующей федерацией. До этого доступен ограниченный кабинет.</div>' +

      '<label class="check-line">' +
        '<input type="checkbox" name="consentPd" required>' +
        '<span>Согласен на обработку персональных данных в соответствии с политикой платформы.</span>' +
      '</label>' +

      '<div class="form-error" id="register-error" hidden></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Создать аккаунт</button>' +
    '</form>' +

    '<p class="auth-switch">Уже есть аккаунт? <a href="#/login">Войти</a></p>'
  , true);

  var form = app.querySelector('#register-form');
  var errorBox = app.querySelector('#register-error');
  var athleteFields = app.querySelector('#athlete-fields');
  var federationNote = app.querySelector('#federation-note');
  var birthInput = form.elements.birthDate;
  var currentRole = 'athlete';

  function setRole(role) {
    currentRole = role;

    app.querySelectorAll('#role-tabs button').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-role') === role);
    });

    var isAthlete = role === 'athlete';
    athleteFields.hidden = !isAthlete;
    federationNote.hidden = role !== 'federation';
    birthInput.required = isAthlete;
  }

  app.querySelectorAll('#role-tabs button').forEach(function (button) {
    button.addEventListener('click', function () {
      setRole(button.getAttribute('data-role'));
    });
  });

  setRole('athlete');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    errorBox.hidden = true;

    var data = new FormData(form);
    var login = String(data.get('login') || '').trim();
    var password = String(data.get('password') || '');
    var fio = String(data.get('fio') || '').trim();
    var birthDate = String(data.get('birthDate') || '');
    var legalRepresentative = String(data.get('legalRepresentative') || '').trim();

    if (!login || !password || !fio) {
      showFormError('Заполните логин, пароль и ФИО.');
      return;
    }

    if (password.length < 6) {
      showFormError('Пароль должен быть не короче 6 символов.');
      return;
    }

    if (!form.elements.consentPd.checked) {
      showFormError('Нужно согласие на обработку персональных данных.');
      return;
    }

    if (currentRole === 'athlete') {
      if (!birthDate) {
        showFormError('Для спортсмена укажите дату рождения.');
        return;
      }
      var age = ageFromBirthDate(birthDate);
      if (age !== null && age < 18 && !legalRepresentative) {
        showFormError('Для спортсмена младше 18 лет укажите законного представителя.');
        return;
      }
    }

    var payload = {
      login: login,
      password: password,
      fio: fio,
      role: currentRole,
      email: String(data.get('email') || '').trim() || null,
      phone: String(data.get('phone') || '').trim() || null,
      consentPd: true
    };

    if (currentRole === 'athlete') {
      var checked = [];
      data.getAll('disciplines').forEach(function (value) {
        checked.push(Number(value));
      });

      payload.birthDate = birthDate;
      payload.municipality = String(data.get('municipality') || '').trim() || null;
      payload.organizationId = data.get('organizationId') ? Number(data.get('organizationId')) : null;
      payload.startYear = data.get('startYear') ? Number(data.get('startYear')) : null;
      payload.disciplines = checked;
      payload.legalRepresentative = legalRepresentative || null;
    }

    var submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Создаём аккаунт…';

    try {
      var result = await api('POST', '/auth/register', payload, { role: false });

      auth.token = result.token;
      auth.user = result.user;
      auth.roles = result.roles || [];
      auth.activeRole = auth.roles[0] || null;
      saveAuth();

      if (result.pendingFederation) {
        toast('Заявка отправлена на рассмотрение федерации.', 'warn');
        location.hash = '#/pending';
      } else {
        toast('Аккаунт создан. Добро пожаловать!', 'success');
        location.hash = '#/dashboard';
      }
    } catch (error) {
      showFormError(error.message);
      submit.disabled = false;
      submit.textContent = 'Создать аккаунт';
    }
  });

  function showFormError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }
}

/* --- Ожидание одобрения роли федерации ---------------------------------- */

async function renderPendingPage() {
  var app = document.getElementById('app');
  showLoading(app, 'Проверяем статус заявки…');

  var request = null;
  try {
    request = await api('GET', '/auth/my-federation-request', undefined, { role: false });
  } catch (error) {
    request = null;
  }

  var status = request ? request.status : 'none';
  var title = 'Заявка на роль федерации';
  var text = '';
  var actions = '';

  if (status === 'pending') {
    text = 'Заявка отправлена и ожидает решения действующей федерации. Как только её одобрят, откроется полный кабинет.';
    actions =
      '<button class="btn btn-primary" id="pending-refresh">Проверить статус</button>' +
      '<button class="btn btn-ghost" id="pending-logout">Выйти</button>';
  } else if (status === 'approved') {
    text = 'Заявка одобрена. Роль «Федерация» добавлена к аккаунту — можно начинать работу.';
    actions = '<button class="btn btn-primary" id="pending-open">Открыть кабинет</button>';
  } else if (status === 'rejected') {
    text = 'Заявка отклонена.' + (request.rejectReason ? ' Причина: ' + request.rejectReason : '');
    actions =
      '<a class="btn btn-ghost" href="#/register">Новая регистрация</a>' +
      '<button class="btn btn-ghost" id="pending-logout">Выйти</button>';
  } else {
    text = 'Заявка не найдена. Обратитесь в федерацию или зарегистрируйтесь заново.';
    actions = '<a class="btn btn-ghost" href="#/register">Регистрация</a>';
  }

  app.innerHTML =
    '<div class="center-screen">' +
      '<div class="card" style="width:100%;max-width:520px">' +
        '<div class="brand" style="margin-bottom:18px">' +
          '<span class="brand-mark lg">ФСП</span>' +
          '<div class="brand-text"><strong>Федерация спортивного программирования</strong><small>Оренбургская область</small></div>' +
        '</div>' +
        '<h2 style="font-size:21px;margin-bottom:10px">' + esc(title) + '</h2>' +
        '<p class="muted" style="font-size:13.5px;line-height:1.6">' + esc(text) + '</p>' +
        (status === 'pending' ? '<p style="margin-top:14px">' + statusBadge('pending') + '</p>' : '') +
        (status === 'approved' ? '<p style="margin-top:14px">' + statusBadge('approved') + '</p>' : '') +
        (status === 'rejected' ? '<p style="margin-top:14px">' + statusBadge('rejected') + '</p>' : '') +
        '<div class="form-actions">' + actions + '</div>' +
        '<p class="hint" style="margin-top:18px">Аккаунт: ' + esc(auth.user ? auth.user.fio : '') + '</p>' +
      '</div>' +
    '</div>';

  var refreshButton = app.querySelector('#pending-refresh');
  if (refreshButton) {
    refreshButton.addEventListener('click', async function () {
      refreshButton.disabled = true;
      try {
        await refreshMe();
      } catch (error) {
        toast(error.message, 'error');
      }
      if (auth.roles.length) {
        location.hash = '#/dashboard';
        onRouteChange();
      } else {
        renderPendingPage();
      }
    });
  }

  var openButton = app.querySelector('#pending-open');
  if (openButton) {
    openButton.addEventListener('click', async function () {
      try {
        await refreshMe();
        location.hash = '#/dashboard';
        onRouteChange();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }

  var logoutButton = app.querySelector('#pending-logout');
  if (logoutButton) logoutButton.addEventListener('click', logout);
}

/* --- Профиль ------------------------------------------------------------- */

async function renderProfile(el) {
  el.innerHTML =
    pageHeader('Профиль', 'Данные аккаунта и активный кабинет') +
    '<div class="grid cols-2">' +
      '<section class="card">' +
        '<div class="card-head"><h2>Учётная запись</h2></div>' +
        '<div class="detail-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">' +
          '<div class="detail-item"><dt>ФИО</dt><dd>' + esc(auth.user ? auth.user.fio : '—') + '</dd></div>' +
          '<div class="detail-item"><dt>ID пользователя</dt><dd>' + esc(auth.user ? auth.user.id : '—') + '</dd></div>' +
          '<div class="detail-item"><dt>Активный кабинет</dt><dd>' + esc(ROLE_TITLES[auth.activeRole] || '—') + '</dd></div>' +
        '</div>' +
      '</section>' +
      '<section class="card">' +
        '<div class="card-head"><h2>Доступные роли</h2></div>' +
        '<p class="hint" style="margin-bottom:12px">Один аккаунт может работать в нескольких кабинетах. Переключение не требует повторного входа.</p>' +
        '<div class="chips" id="profile-roles">' +
          auth.roles.map(function (role) {
            var active = role === auth.activeRole;
            return '<button class="chip" data-role="' + esc(role) + '"' + (active ? ' style="border-color:var(--accent);color:#cfe0ff"' : '') + '>' +
              '<b>' + esc(ROLE_TITLES[role] || role) + '</b>' + (active ? ' · активна' : '') +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-ghost" id="profile-logout">Выйти из аккаунта</button></div>' +
      '</section>' +
    '</div>' +
    (auth.activeRole === 'athlete' ? athleteLinkCard() : '') +
    '<div id="profile-request"></div>';

  el.querySelectorAll('#profile-roles [data-role]').forEach(function (button) {
    button.addEventListener('click', function () {
      switchToRole(button.getAttribute('data-role'));
    });
  });

  el.querySelector('#profile-logout').addEventListener('click', logout);

  var confirmForm = el.querySelector('#confirm-link-form');
  if (confirmForm) {
    confirmForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      var id = Number(new FormData(confirmForm).get('linkId'));
      if (!id) {
        toast('Укажите номер связи.', 'warn');
        return;
      }
      try {
        await api('POST', '/coach-athlete/' + id + '/confirm');
        toast('Связь с тренером подтверждена.', 'success');
        confirmForm.reset();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }

  var requestBox = el.querySelector('#profile-request');
  try {
    var request = await api('GET', '/auth/my-federation-request');
    if (request) {
      requestBox.innerHTML =
        '<section class="card">' +
          '<div class="card-head"><h2>Заявка на роль федерации</h2>' + statusBadge(request.status) + '</div>' +
          '<div class="detail-grid">' +
            '<div class="detail-item"><dt>Номер заявки</dt><dd>' + esc(request.id) + '</dd></div>' +
            '<div class="detail-item"><dt>Создана</dt><dd>' + esc(fmtDateTime(request.createdAt)) + '</dd></div>' +
            '<div class="detail-item"><dt>Причина отказа</dt><dd>' + esc(request.rejectReason || '—') + '</dd></div>' +
          '</div>' +
        '</section>';
    }
  } catch (error) {
    requestBox.innerHTML = '';
  }
}

function athleteLinkCard() {
  return '<section class="card">' +
    '<div class="card-head">' +
      '<div><h2>Привязка тренера</h2><div class="sub">Подтверждение связи по номеру, который сообщает тренер</div></div>' +
    '</div>' +
    '<form id="confirm-link-form" class="form-row" style="align-items:end">' +
      '<label class="field">Номер связи<input name="linkId" type="number" min="1" placeholder="например, 12"></label>' +
      '<button class="btn btn-ghost" type="submit" style="height:42px">Подтвердить</button>' +
    '</form>' +
    '<p class="hint" style="margin-top:10px">Номер связи отображается в кабинете тренера в списке спортсменов.</p>' +
  '</section>';
}
