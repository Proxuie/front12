const bcrypt = require('bcryptjs');
const { db } = require('./index');

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  const hash = bcrypt.hashSync('123', 10);
  const insertDiscipline = db.prepare('INSERT INTO disciplines (name) VALUES (?)');
  [
    'программирование алгоритмическое',
    'программирование продуктовое',
    'программирование систем информационной безопасности',
    'программирование систем искусственного интеллекта',
    'программирование робототехники',
    'программирование беспилотных авиационных систем',
  ].forEach((n) => insertDiscipline.run(n));

  const insertAge = db.prepare('INSERT INTO age_groups (name, age_from, age_to) VALUES (?, ?, ?)');
  [['Юноши 14-17', 14, 17], ['Юниоры 18-21', 18, 21],
   ['Мужчины и женщины 22+', 22, 99], ['Без ограничений', 14, 99]]
    .forEach((r) => insertAge.run(...r));

  const insertOrg = db.prepare('INSERT INTO organizations (name, type) VALUES (?, ?)');
  [['СШОР №2', 'спортивная школа'], ['ОГУ', 'вуз'],
   ['Гимназия №1', 'школа'], ['Клуб Прогресс', 'клуб']]
    .forEach((r) => insertOrg.run(...r));

  const insertUser = db.prepare(`
    INSERT INTO users (login, password_hash, fio, roles, email, consent_pd,
      birth_date, municipality, organization_id, start_year,
      disciplines, rank_type, rank_until, category, category_until)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('fed', hash, 'Смирнов Алексей Петрович', 'federation',
    'fed@example.ru', null, null, null, null, null, null, null, null, null);
  insertUser.run('athlete', hash, 'Иванов Иван Иванович', 'athlete',
    'athlete@example.ru', '2005-05-15', 'Оренбург', 1, 2018, '1,2', null, null, null, null);
  insertUser.run('coach', hash, 'Петров Пётр Петрович', 'coach',
    'coach@example.ru', null, null, 1, null, null, null, null, null, null);
  insertUser.run('judge', hash, 'Сидоров Сидор Сидорович', 'judge',
    'judge@example.ru', null, null, null, null, null, null, null, 'первая', '2027-06-01');
  insertUser.run('both', hash, 'Козлов Дмитрий Сергеевич', 'athlete,coach',
    'both@example.ru', '2000-03-20', 'Оренбург', 2, 2015, '1', null, null, null, null);

  [['ath2','Морозова Анна Сергеевна','2006-08-12',3,3,2019,'3'],
   ['ath3','Волков Никита Андреевич','2004-11-01',1,1,2017,'1'],
   ['ath4','Лебедева Мария Олеговна','2007-02-25',2,3,2020,'2'],
   ['ath5','Новиков Артём Игоревич','2003-07-14',4,2,2016,'4'],
   ['ath6','Зайцева Дарья Викторовна','2005-12-03',5,1,2018,'5'],
   ['ath7','Соколов Максим Олегович','2002-04-19',6,2,2015,'6'],
   ['ath8','Павлова Екатерина Ивановна','2006-09-07',1,4,2019,'1']]
    .forEach(([login, fio, birth, disc, org, sy, dstr]) => {
      insertUser.run(login, hash, fio, 'athlete', `${login}@example.ru`,
        birth, 'Оренбург', org, sy, dstr, null, null, null, null);
    });

  db.prepare("UPDATE users SET rank_type='I', rank_until='2027-01-01' WHERE login IN ('ath3','ath5')").run();

  const get = (l) => db.prepare('SELECT id FROM users WHERE login = ?').get(l).id;
  const coachId = get('coach'), athId = get('athlete'), bothId = get('both');
  const insertLink = db.prepare('INSERT INTO coach_athlete (coach_user_id, athlete_user_id, discipline_id, status) VALUES (?, ?, ?, ?)');
  insertLink.run(coachId, athId, 1, 'active');
  insertLink.run(coachId, bothId, 1, 'active');

  const insertComp = db.prepare(`
    INSERT INTO competitions (name, discipline_id, age_group_id, type, level, format, status,
      date_start, date_end, place, calendar_plan, calendar_number, applications_deadline)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const c2024a = insertComp.run('Чемпионат Оренбургской области 2024',1,3,'Чемпионат','Региональные','очный','finished','2024-03-15','2024-03-16','Оренбург','Региональный','1-Р','2024-03-01').lastInsertRowid;
  const c2024b = insertComp.run('Кубок Оренбуржья 2024',2,4,'Кубок','Региональные','онлайн','finished','2024-10-10','2024-10-11','Оренбург','Региональный','2-Р','2024-09-25').lastInsertRowid;
  const c2025a = insertComp.run('Первенство Оренбургской области 2025',1,2,'Первенство','Региональные','очный','finished','2025-04-20','2025-04-21','Оренбург','Региональный','3-Р','2025-04-05').lastInsertRowid;
  const c2025b = insertComp.run('Межрегиональный турнир 2025',3,3,'Чемпионат','Межрегиональные','очный','finished','2025-09-12','2025-09-13','Самара','ЕКП','100-ЕКП','2025-08-30').lastInsertRowid;
  const c2026a = insertComp.run('Чемпионат Оренбургской области 2026',1,3,'Чемпионат','Региональные','очный','applications_open','2026-11-15','2026-11-16','Оренбург','Региональный','5-Р','2026-11-01').lastInsertRowid;
  insertComp.run('ОренКод 2026',2,4,'Чемпионат','Региональные','смешанный','applications_open','2026-12-10','2026-12-12','Оренбург','Региональный','6-Р','2026-12-01');

  const ids = { ath: athId, ath2: get('ath2'), ath3: get('ath3'), ath4: get('ath4'),
                ath5: get('ath5'), ath6: get('ath6'), ath7: get('ath7') };
  const insertApp = db.prepare('INSERT INTO applications (competition_id, athlete_user_id, status) VALUES (?, ?, ?)');
  const insertRes = db.prepare('INSERT INTO results (competition_id, athlete_user_id, place, points) VALUES (?, ?, ?, ?)');

  insertApp.run(c2024a, ids.ath, 'approved');  insertRes.run(c2024a, ids.ath, 1, 40);
  insertApp.run(c2024a, ids.ath3, 'approved'); insertRes.run(c2024a, ids.ath3, 2, 30);
  insertApp.run(c2024a, ids.ath2, 'approved'); insertRes.run(c2024a, ids.ath2, 3, 20);
  insertApp.run(c2024b, ids.ath3, 'approved'); insertRes.run(c2024b, ids.ath3, 1, 40);
  insertApp.run(c2024b, ids.ath, 'approved');  insertRes.run(c2024b, ids.ath, 2, 30);
  insertApp.run(c2025a, ids.ath, 'approved');  insertRes.run(c2025a, ids.ath, 1, 40);
  insertApp.run(c2025a, ids.ath2, 'approved'); insertRes.run(c2025a, ids.ath2, 2, 30);
  insertApp.run(c2025a, ids.ath4, 'approved'); insertRes.run(c2025a, ids.ath4, 3, 20);
  insertApp.run(c2025a, ids.ath5, 'approved'); insertRes.run(c2025a, ids.ath5, 4, 10);
  insertApp.run(c2025b, ids.ath5, 'approved'); insertRes.run(c2025b, ids.ath5, 1, 60);
  insertApp.run(c2025b, ids.ath6, 'approved'); insertRes.run(c2025b, ids.ath6, 2, 45);
  insertApp.run(c2026a, ids.ath, 'pending');
  insertApp.run(c2026a, ids.ath2, 'pending');
  insertApp.run(c2026a, ids.ath7, 'pending');

  const judgeId = get('judge');
  const insertAssign = db.prepare('INSERT INTO judge_assignments (competition_id, judge_user_id, position) VALUES (?, ?, ?)');
  insertAssign.run(c2025a, judgeId, 'главный судья');
  insertAssign.run(c2024a, judgeId, 'судья');

  console.log('демо-данные загружены');
}

module.exports = { seed };