/* ==========================================================================
   Кабинет федерации: соревнования, заявки, результаты, разряды, судьи,
   заявки на роль федерации.
   ========================================================================== */

var COMP_TYPE_OPTIONS = [
  { value: 'Чемпионат', label: 'Чемпионат' },
  { value: 'Первенство', label: 'Первенство' },
  { value: 'Кубок', label: 'Кубок' },
  { value: 'Турнир', label: 'Турнир' }
];

var COMP_LEVEL_OPTIONS = [
  { value: 'Региональные', label: 'Региональные' },
  { value: 'Межрегиональные', label: 'Межрегиональные' },
  { value: 'Всероссийские', label: 'Всероссийские' },
  { value: 'ЕКП', label: 'ЕКП' }
];

var COMP_FORMAT_OPTIONS = [
  { value: 'очный', label: 'Очный' },
  { value: 'онлайн', label: 'Онлайн' },
  { value: 'смешанный', label: 'Смешанный' }
];

var JUDGE_POSITION_OPTIONS = [
  { value: 'главный судья', label: 'Главный судья' },
  { value: 'заместитель главного судьи', label: 'Заместитель главного судьи' },
  { value: 'судья', label: 'Судья' },
  { value: 'секретарь', label: 'Секретарь' }
];

function toIsoDate(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function todayIso() {
  return toIsoDate(new Date());
}

function yearsFromNowIso(years) {
  var date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return toIsoDate(date);
}

/* --- Управление соревнованиями ------------------------------------------- */

async function renderFederationCompetitions(el) {
  if (!ensureActiveRole(el, 'federation')) return;

  el.innerHTML =
    pageHeader('Управление соревнованиями', 'Создание календаря, публикация и закрытие заявок') +
    '<div id="federation-competitions"></div>';

  var box = el.querySelector('#federation-competitions');
  showLoading(box);

  var catalog;
  var competitions;

  try {
    catalog = await loadCatalog();
    competitions = await api('GET', '/competitions');
  } catch (error) {
    showError(box, error);
    return;
  }

  var rows = competitions.map(function (competition) {
    var actions = '<a class="btn btn-sm btn-ghost" href="#/competition/' + esc(competition.id) + '">Открыть</a>';

    if (competition.status === 'draft') {
      actions += '<button class="btn btn-sm btn-success" data-action="publish" data-id="' + esc(competition.id) + '">Опубликовать</button>';
    }
    if (competition.status === 'applications_open') {
      actions += '<button class="btn btn-sm btn-ghost" data-action="close" data-id="' + esc(competition.id) + '">Закрыть заявки</button>';
    }

    return '<tr>' +
      '<td class="strong">' + esc(competition.name) + '</td>' +
      '<td class="muted">' + esc(competition.discipline.name) + '</td>' +
      '<td class="num">' + esc(fmtDate(competition.dateStart)) + '</td>' +
      '<td>' + statusBadge(competition.status) + '</td>' +
      '<td><div class="actions">' + actions + '</div></td>' +
    '</tr>';
  }).join('');

  var tableHtml = competitions.length
    ? '<div class="table-wrap"><table class="table">' +
        '<thead><tr><th>Название</th><th>Дисциплина</th><th>Дата</th><th>Статус</th><th></th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>'
    : emptyBlock('Соревнований нет', 'Создайте первое соревнование в форме ниже.');

  box.innerHTML =
    '<section class="card">' +
      '<div class="card-head"><h2>Список соревнований</h2><span class="small muted">' + esc(competitions.length) + ' шт.</span></div>' +
      tableHtml +
    '</section>' +

    '<section class="card">' +
      '<div class="card-head">' +
        '<div><h2>Новое соревнование</h2><div class="sub">После создания соревнование получает статус «Черновик»</div></div>' +
      '</div>' +
      '<form id="create-competition-form">' +
        '<label class="field">Название<input name="name" placeholder="Чемпионат Оренбургской области 2027" required></label>' +
        '<div class="form-row" style="margin-top:14px">' +
          '<label class="field">Дисциплина<select name="disciplineId" required>' +
            optionsHtml(catalog.disciplines, null, 'Выберите дисциплину') +
          '</select></label>' +
          '<label class="field">Возрастная группа<select name="ageGroupId" required>' +
            optionsHtml(catalog.ageGroups, null, 'Выберите группу') +
          '</select></label>' +
        '</div>' +
        '<div class="form-row-3" style="margin-top:14px">' +
          '<label class="field">Тип<select name="type" required>' + optionsHtml(COMP_TYPE_OPTIONS, 'Чемпионат') + '</select></label>' +
          '<label class="field">Уровень<select name="level" required>' + optionsHtml(COMP_LEVEL_OPTIONS, 'Региональные') + '</select></label>' +
          '<label class="field">Формат<select name="format" required>' + optionsHtml(COMP_FORMAT_OPTIONS, 'очный') + '</select></label>' +
        '</div>' +
        '<div class="form-row-3" style="margin-top:14px">' +
          '<label class="field">Дата начала<input name="dateStart" type="date" required></label>' +
          '<label class="field">Дата окончания<input name="dateEnd" type="date" required></label>' +
          '<label class="field">Приём заявок до<input name="applicationsDeadline" type="date"></label>' +
        '</div>' +
        '<div class="form-row-3" style="margin-top:14px">' +
          '<label class="field">Место<input name="place" placeholder="Оренбург"></label>' +
          '<label class="field">Календарный план<input name="calendarPlan" placeholder="Региональный"></label>' +
          '<label class="field">Номер в плане<input name="calendarNumber" placeholder="7-Р"></label>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">Создать соревнование</button></div>' +
      '</form>' +
    '</section>';

  /* Публикация и закрытие заявок */

  box.querySelectorAll('[data-action="publish"]').forEach(function (button) {
    button.addEventListener('click', async function () {
      button.disabled = true;
      try {
        await api('POST', '/competitions/' + button.getAttribute('data-id') + '/publish');
        toast('Соревнование опубликовано.', 'success');
        renderFederationCompetitions(el);
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
      }
    });
  });

  box.querySelectorAll('[data-action="close"]').forEach(function (button) {
    button.addEventListener('click', async function () {
      if (!confirm('Закрыть приём заявок?')) return;
      button.disabled = true;
      try {
        await api('POST', '/competitions/' + button.getAttribute('data-id') + '/close-applications');
        toast('Приём заявок закрыт.', 'success');
        renderFederationCompetitions(el);
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
      }
    });
  });

  /* Создание */

  var form = box.querySelector('#create-competition-form');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    var data = new FormData(form);
    var payload = {
      name: String(data.get('name') || '').trim(),
      disciplineId: Number(data.get('disciplineId')),
      ageGroupId: Number(data.get('ageGroupId')),
      type: String(data.get('type')),
      level: String(data.get('level')),
      format: String(data.get('format')),
      dateStart: String(data.get('dateStart')),
      dateEnd: String(data.get('dateEnd')),
      place: String(data.get('place') || '').trim() || null,
      applicationsDeadline: String(data.get('applicationsDeadline') || '') || null,
      calendarPlan: String(data.get('calendarPlan') || '').trim() || null,
      calendarNumber: String(data.get('calendarNumber') || '').trim() || null
    };

    if (!payload.name || !payload.disciplineId || !payload.ageGroupId || !payload.dateStart || !payload.dateEnd) {
      toast('Заполните обязательные поля.', 'warn');
      return;
    }

    var submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;

    try {
      await api('POST', '/competitions', payload);
      toast('Соревнование создано. Опубликуйте его, чтобы открыть заявки.', 'success');
      renderFederationCompetitions(el);
    } catch (error) {
      toast(error.message, 'error');
      submit.disabled = false;
    }
  });
}

/* --- Модерация заявок ---------------------------------------------------- */

async function renderFederationApplications(el, params) {
  if (!ensureActiveRole(el, 'federation')) return;

  var preselected = params && params.query ? params.query.get('competitionId') : '';

  el.innerHTML =
    pageHeader('Заявки участников', 'Рассмотрение заявок на соревнования') +
    '<div class="filters">' +
      '<label class="field"><span>Соревнование</span><select id="applications-competition"></select></label>' +
      '<label class="field"><span>Статус</span><select id="applications-status">' +
        optionsHtml([
          { value: 'pending', label: 'На рассмотрении' },
          { value: 'approved', label: 'Одобрено' },
          { value: 'rejected', label: 'Отклонено' }
        ], 'pending', 'Все заявки') +
      '</select></label>' +
    '</div>' +
    '<div id="applications-table"></div>';

  var competitionsSelect = el.querySelector('#applications-competition');
  var statusSelect = el.querySelector('#applications-status');
  var tableBox = el.querySelector('#applications-table');

  var competitions = [];
  try {
    competitions = await api('GET', '/competitions');
    competitionsSelect.innerHTML = optionsHtml(competitions.map(function (item) {
      return { value: item.id, label: item.name };
    }), preselected, 'Все соревнования');
  } catch (error) {
    showError(tableBox, error);
    return;
  }

  var namesById = {};
  competitions.forEach(function (item) {
    namesById[item.id] = item.name;
  });

  async function load() {
    showLoading(tableBox, 'Загружаем заявки…');

    var query = [];
    if (competitionsSelect.value) query.push('competitionId=' + encodeURIComponent(competitionsSelect.value));
    if (statusSelect.value) query.push('status=' + encodeURIComponent(statusSelect.value));

    try {
      var applications = await api('GET', '/applications' + (query.length ? '?' + query.join('&') : ''));

      if (!applications.length) {
        tableBox.innerHTML = emptyBlock('Заявок нет', 'Измените фильтры или дождитесь новых заявок.');
        return;
      }

      tableBox.innerHTML = '<div class="table-wrap"><table class="table">' +
        '<thead><tr><th>№</th><th>Спортсмен</th><th>Соревнование</th><th>Подана</th><th>Статус</th><th></th></tr></thead>' +
        '<tbody>' +
          applications.map(function (application) {
            var actions = '';

            if (application.status === 'pending') {
              actions =
                '<button class="btn btn-sm btn-success" data-approve="' + esc(application.id) + '">Одобрить</button>' +
                '<button class="btn btn-sm btn-danger" data-reject="' + esc(application.id) + '">Отклонить</button>';
            }

            return '<tr>' +
              '<td class="num">' + esc(application.id) + '</td>' +
              '<td class="strong">' + esc(application.athleteFio) + '</td>' +
              '<td class="muted">' + esc(namesById[application.competitionId] || ('#' + application.competitionId)) + '</td>' +
              '<td class="num">' + esc(fmtDateTime(application.createdAt)) + '</td>' +
              '<td>' + statusBadge(application.status) +
                (application.rejectReason ? '<div class="small muted">' + esc(application.rejectReason) + '</div>' : '') +
              '</td>' +
              '<td><div class="actions">' + actions + '</div></td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table></div>';

      tableBox.querySelectorAll('[data-approve]').forEach(function (button) {
        button.addEventListener('click', async function () {
          button.disabled = true;
          try {
            await api('POST', '/applications/' + button.getAttribute('data-approve') + '/approve');
            toast('Заявка одобрена.', 'success');
            load();
          } catch (error) {
            toast(error.message, 'error');
            button.disabled = false;
          }
        });
      });

      tableBox.querySelectorAll('[data-reject]').forEach(function (button) {
        button.addEventListener('click', async function () {
          var values = await openModal({
            title: 'Отклонить заявку',
            body: '<label class="field">Причина отказа<textarea name="reason" required placeholder="например, не подходит по возрасту"></textarea></label>',
            submitText: 'Отклонить'
          });

          if (!values) return;

          try {
            await api('POST', '/applications/' + button.getAttribute('data-reject') + '/reject', {
              reason: values.reason
            });
            toast('Заявка отклонена.', 'success');
            load();
          } catch (error) {
            toast(error.message, 'error');
          }
        });
      });
    } catch (error) {
      showError(tableBox, error);
    }
  }

  competitionsSelect.addEventListener('change', load);
  statusSelect.addEventListener('change', load);

  await load();
}

/* --- Ввод результатов ---------------------------------------------------- */

async function renderFederationResults(el, params) {
  if (!ensureActiveRole(el, 'federation')) return;

  var preselected = params && params.query ? params.query.get('competitionId') : '';

  el.innerHTML =
    pageHeader('Ввод результатов', 'Места и баллы участников с одобренными заявками') +
    '<div class="filters">' +
      '<label class="field" style="flex:2 1 320px"><span>Соревнование</span><select id="results-competition"></select></label>' +
    '</div>' +
    '<div id="results-editor"></div>';

  var competitionsSelect = el.querySelector('#results-competition');
  var editor = el.querySelector('#results-editor');

  var competitions = [];
  try {
    competitions = await api('GET', '/competitions');
  } catch (error) {
    showError(editor, error);
    return;
  }

  if (!competitions.length) {
    editor.innerHTML = emptyBlock('Соревнований нет', 'Сначала создайте соревнование.');
    return;
  }

  competitionsSelect.innerHTML = optionsHtml(competitions.map(function (item) {
    return { value: item.id, label: item.name };
  }), preselected || competitions[0].id);

  async function load() {
    var competitionId = competitionsSelect.value;
    if (!competitionId) {
      editor.innerHTML = emptyBlock('Выберите соревнование', '');
      return;
    }

    showLoading(editor, 'Загружаем участников…');

    try {
      var applications = await api('GET', '/applications?competitionId=' + competitionId + '&status=approved');
      var results = await api('GET', '/results?competitionId=' + competitionId);

      if (!applications.length) {
        editor.innerHTML = emptyBlock(
          'Нет одобренных заявок',
          'Сначала одобрите заявки участников — результат вносится только по одобренной заявке.'
        );
        return;
      }

      var resultsById = {};
      results.forEach(function (result) {
        resultsById[result.athleteUserId] = result;
      });

      var rows = applications.map(function (application) {
        var existing = resultsById[application.athleteUserId] || {};

        return '<tr data-athlete="' + esc(application.athleteUserId) + '">' +
          '<td class="strong">' + esc(application.athleteFio) + '</td>' +
          '<td><input type="number" min="1" max="99" name="place" value="' + esc(existing.place || '') + '" placeholder="—"></td>' +
          '<td><input type="number" min="0" step="1" name="points" value="' + esc(existing.points === undefined || existing.points === null ? '' : existing.points) + '" placeholder="—"></td>' +
          '<td><button class="btn btn-sm btn-primary" data-save="' + esc(application.athleteUserId) + '">Сохранить</button></td>' +
        '</tr>';
      }).join('');

      editor.innerHTML =
        '<div class="table-wrap"><table class="table">' +
          '<thead><tr><th>Спортсмен</th><th>Место</th><th>Баллы</th><th></th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table></div>' +
        '<p class="hint" style="margin-top:12px">Баллы можно не указывать — рейтинг считается по уровню соревнования и занятому месту.</p>';

      editor.querySelectorAll('[data-save]').forEach(function (button) {
        button.addEventListener('click', async function () {
          var row = button.closest('tr');
          var place = row.querySelector('[name="place"]').value;
          var points = row.querySelector('[name="points"]').value;

          button.disabled = true;

          try {
            await api('POST', '/results', {
              competitionId: Number(competitionId),
              athleteUserId: Number(button.getAttribute('data-save')),
              place: place ? Number(place) : null,
              points: points ? Number(points) : null
            });
            toast('Результат сохранён.', 'success');
            load();
          } catch (error) {
            toast(error.message, 'error');
            button.disabled = false;
          }
        });
      });
    } catch (error) {
      showError(editor, error);
    }
  }

  competitionsSelect.addEventListener('change', load);
  await load();
}

/* --- Разряды ------------------------------------------------------------- */

async function renderFederationRanks(el) {
  if (!ensureActiveRole(el, 'federation')) return;

  el.innerHTML = pageHeader('Разряды', 'Заявки на присвоение и действующие разряды спортсменов') + '<div id="federation-ranks"></div>';
  var box = el.querySelector('#federation-ranks');
  showLoading(box);

  var requests;
  var ranks;

  try {
    requests = await api('GET', '/ranks/requests');
    ranks = await api('GET', '/ranks');
  } catch (error) {
    showError(box, error);
    return;
  }

  var requestsHtml;

  if (!requests.length) {
    requestsHtml = emptyBlock('Заявок на разряд нет', 'Спортсмены и тренеры подают заявки из личных кабинетов.');
  } else {
    requestsHtml = '<div class="table-wrap"><table class="table">' +
      '<thead><tr><th>№</th><th>Спортсмен</th><th>Запрошенный разряд</th><th>Статус</th><th></th></tr></thead>' +
      '<tbody>' +
        requests.map(function (request) {
          var actions = '';

          if (request.status === 'pending') {
            actions =
              '<button class="btn btn-sm btn-success" data-rank-approve="' + esc(request.id) + '">Присвоить</button>' +
              '<button class="btn btn-sm btn-danger" data-rank-reject="' + esc(request.id) + '">Отклонить</button>';
          }

          return '<tr>' +
            '<td class="num">' + esc(request.id) + '</td>' +
            '<td class="strong">' + esc(request.athleteFio) + '</td>' +
            '<td><span class="badge blue plain">' + esc(request.requestedType) + '</span></td>' +
            '<td>' + statusBadge(request.status) + '</td>' +
            '<td><div class="actions">' + actions + '</div></td>' +
          '</tr>';
        }).join('') +
      '</tbody>' +
    '</table></div>';
  }

  var ranksHtml = ranks.length
    ? '<div class="table-wrap"><table class="table">' +
        '<thead><tr><th>Спортсмен</th><th>Разряд</th><th>Действует до</th><th>Примечание</th></tr></thead>' +
        '<tbody>' +
          ranks.map(function (item) {
            return '<tr>' +
              '<td class="strong">' + esc(item.athleteFio) + '</td>' +
              '<td>' + (item.rankType ? '<span class="badge blue plain">' + esc(item.rankType) + '</span>' : '<span class="muted">нет</span>') + '</td>' +
              '<td class="num">' + esc(fmtDate(item.rankUntil)) + '</td>' +
              '<td>' + (item.expiringSoon ? '<span class="badge yellow">истекает</span>' : '<span class="muted">—</span>') + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table></div>'
    : emptyBlock('Разрядов нет', '');

  box.innerHTML =
    '<section class="card">' +
      '<div class="card-head"><h2>Заявки на присвоение</h2><span class="small muted">' + esc(requests.length) + ' шт.</span></div>' +
      requestsHtml +
    '</section>' +
    '<section class="card">' +
      '<div class="card-head"><h2>Действующие разряды</h2></div>' +
      ranksHtml +
    '</section>';

  box.querySelectorAll('[data-rank-approve]').forEach(function (button) {
    button.addEventListener('click', async function () {
      var values = await openModal({
        title: 'Присвоить разряд',
        body:
          '<div class="form-row">' +
            '<label class="field">Дата присвоения<input name="assignedDate" type="date" value="' + todayIso() + '" required></label>' +
            '<label class="field">Номер приказа<input name="orderNumber" placeholder="123-од" required></label>' +
          '</div>' +
          '<label class="field">Действует до<input name="assignedUntil" type="date" value="' + yearsFromNowIso(2) + '" required></label>',
        submitText: 'Присвоить'
      });

      if (!values) return;

      try {
        await api('POST', '/ranks/' + button.getAttribute('data-rank-approve') + '/approve', {
          assignedDate: values.assignedDate,
          orderNumber: values.orderNumber,
          assignedUntil: values.assignedUntil
        });
        toast('Разряд присвоен.', 'success');
        renderFederationRanks(el);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });

  box.querySelectorAll('[data-rank-reject]').forEach(function (button) {
    button.addEventListener('click', async function () {
      var values = await openModal({
        title: 'Отклонить заявку на разряд',
        body: '<label class="field">Причина отказа<textarea name="reason" required placeholder="например, нет оснований"></textarea></label>',
        submitText: 'Отклонить'
      });

      if (!values) return;

      try {
        await api('POST', '/ranks/' + button.getAttribute('data-rank-reject') + '/reject', {
          reason: values.reason
        });
        toast('Заявка отклонена.', 'success');
        renderFederationRanks(el);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });
}

/* --- Судейская коллегия -------------------------------------------------- */

async function renderFederationJudges(el, params) {
  if (!ensureActiveRole(el, 'federation')) return;

  var preselected = params && params.query ? params.query.get('competitionId') : '';

  el.innerHTML =
    pageHeader('Судейская коллегия', 'Назначение судей на соревнования') +
    '<div class="filters">' +
      '<label class="field" style="flex:2 1 320px"><span>Соревнование</span><select id="judges-competition"></select></label>' +
    '</div>' +
    '<div id="judges-panel"></div>';

  var competitionsSelect = el.querySelector('#judges-competition');
  var panel = el.querySelector('#judges-panel');

  var competitions = [];
  try {
    competitions = await api('GET', '/competitions');
  } catch (error) {
    showError(panel, error);
    return;
  }

  if (!competitions.length) {
    panel.innerHTML = emptyBlock('Соревнований нет', 'Сначала создайте соревнование.');
    return;
  }

  competitionsSelect.innerHTML = optionsHtml(competitions.map(function (item) {
    return { value: item.id, label: item.name };
  }), preselected || competitions[0].id);

  async function load() {
    var competitionId = competitionsSelect.value;
    showLoading(panel, 'Загружаем коллегию…');

    try {
      var assignments = await api('GET', '/judges/assignments?competitionId=' + competitionId);

      var list = assignments.length
        ? '<div class="table-wrap"><table class="table">' +
            '<thead><tr><th>№</th><th>Судья</th><th>Должность</th></tr></thead>' +
            '<tbody>' +
              assignments.map(function (assignment) {
                return '<tr>' +
                  '<td class="num">' + esc(assignment.id) + '</td>' +
                  '<td class="strong">' + esc(assignment.judgeFio) + '</td>' +
                  '<td><span class="badge blue plain">' + esc(assignment.position) + '</span></td>' +
                '</tr>';
              }).join('') +
            '</tbody>' +
          '</table></div>'
        : emptyBlock('Коллегия не назначена', 'Добавьте судью в форму ниже.');

      panel.innerHTML =
        '<section class="card">' +
          '<div class="card-head"><h2>Коллегия соревнования</h2><span class="small muted">' + esc(assignments.length) + ' чел.</span></div>' +
          list +
        '</section>' +
        '<section class="card">' +
          '<div class="card-head"><h2>Назначить судью</h2></div>' +
          '<form id="assign-judge-form" class="grid cols-3" style="align-items:end">' +
            '<label class="field">ID судьи<input name="judgeUserId" type="number" min="1" placeholder="например, 4" required></label>' +
            '<label class="field">Должность<select name="position" required>' +
              optionsHtml(JUDGE_POSITION_OPTIONS, 'судья') +
            '</select></label>' +
            '<button class="btn btn-primary" type="submit" style="height:42px">Назначить</button>' +
          '</form>' +
          '<p class="hint" style="margin-top:10px">ID пользователя-судьи выдаёт администратор. В демо-данных судья — ID 4 (Сидоров С. С.).</p>' +
        '</section>';

      panel.querySelector('#assign-judge-form').addEventListener('submit', async function (event) {
        event.preventDefault();

        var data = new FormData(event.target);
        var judgeUserId = Number(data.get('judgeUserId'));
        var position = String(data.get('position') || '');

        if (!judgeUserId || !position) {
          toast('Укажите ID судьи и должность.', 'warn');
          return;
        }

        var submit = event.target.querySelector('button[type="submit"]');
        submit.disabled = true;

        try {
          await api('POST', '/judges/assignments', {
            competitionId: Number(competitionId),
            judgeUserId: judgeUserId,
            position: position
          });
          toast('Судья назначен.', 'success');
          load();
        } catch (error) {
          toast(error.message, 'error');
          submit.disabled = false;
        }
      });
    } catch (error) {
      showError(panel, error);
    }
  }

  competitionsSelect.addEventListener('change', load);
  await load();
}

/* --- Заявки на роль федерации ------------------------------------------- */

async function renderFederationRequests(el) {
  if (!ensureActiveRole(el, 'federation')) return;

  el.innerHTML = pageHeader('Заявки на роль федерации', 'Одобрение новых представителей федерации') + '<div id="federation-requests"></div>';
  var box = el.querySelector('#federation-requests');
  showLoading(box);

  var requests;
  try {
    requests = await api('GET', '/auth/federation-requests');
  } catch (error) {
    showError(box, error);
    return;
  }

  if (!requests.length) {
    box.innerHTML = emptyBlock('Заявок нет', 'Новые заявки появятся здесь.');
    return;
  }

  box.innerHTML = '<div class="table-wrap"><table class="table">' +
    '<thead><tr><th>ФИО</th><th>Логин</th><th>Контакты</th><th>Подана</th><th>Статус</th><th></th></tr></thead>' +
    '<tbody>' +
      requests.map(function (request) {
        var actions = '';

        if (request.status === 'pending') {
          actions =
            '<button class="btn btn-sm btn-success" data-approve="' + esc(request.id) + '">Одобрить</button>' +
            '<button class="btn btn-sm btn-danger" data-reject="' + esc(request.id) + '">Отклонить</button>';
        }

        var contacts = [request.email, request.phone].filter(Boolean).join(' · ');

        return '<tr>' +
          '<td class="strong">' + esc(request.fio) + '</td>' +
          '<td class="mono">' + esc(request.login) + '</td>' +
          '<td class="muted">' + esc(contacts || '—') + '</td>' +
          '<td class="num">' + esc(fmtDateTime(request.createdAt)) + '</td>' +
          '<td>' + statusBadge(request.status) +
            (request.rejectReason ? '<div class="small muted">' + esc(request.rejectReason) + '</div>' : '') +
          '</td>' +
          '<td><div class="actions">' + actions + '</div></td>' +
        '</tr>';
      }).join('') +
    '</tbody>' +
  '</table></div>';

  box.querySelectorAll('[data-approve]').forEach(function (button) {
    button.addEventListener('click', async function () {
      button.disabled = true;
      try {
        await api('POST', '/auth/federation-requests/' + button.getAttribute('data-approve') + '/approve');
        toast('Роль федерации выдана.', 'success');
        renderFederationRequests(el);
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
      }
    });
  });

  box.querySelectorAll('[data-reject]').forEach(function (button) {
    button.addEventListener('click', async function () {
      var values = await openModal({
        title: 'Отклонить заявку',
        body: '<label class="field">Причина отказа<textarea name="reason" required placeholder="например, не подтверждены полномочия"></textarea></label>',
        submitText: 'Отклонить'
      });

      if (!values) return;

      try {
        await api('POST', '/auth/federation-requests/' + button.getAttribute('data-reject') + '/reject', {
          reason: values.reason
        });
        toast('Заявка отклонена.', 'success');
        renderFederationRequests(el);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });
}
