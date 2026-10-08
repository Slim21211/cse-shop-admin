# КСЭ-магазин · Добавление подразделения для начисления

Как выдать руководителю доступ к начислению баллов его подразделению.
Источник правды — iSpring. Supabase (`org_departments`, `org_users`) — кэш, который перестраивается из iSpring. `available_departments` — ручной аллоулист: только отделы из него участвуют в начислении. Синк аллоулист **не трогает**.

Порядок: **1) обновить кэш → 2) найти отделы по фамилии → 3) добавить в аллоулист → 4) руководитель заходит и начисляет.**

---

## 1. Обновить кэш оргструктуры

Перетягивает из iSpring актуальных руководителей/сотрудников в `org_departments` + `org_users` (upsert + удаление протухших). Делать, если в iSpring менялись руководители/штат.

```bash
SUPABASE_URL=<из шапки sync-org.mjs> \
SUPABASE_SERVICE_ROLE_KEY=<из шапки sync-org.mjs> \
ISPRING_DOMAIN=cse.ispringlearn.ru \
ISPRING_CLIENT_ID=<из шапки sync-org.mjs> \
ISPRING_CLIENT_SECRET=<из шапки sync-org.mjs> \
node sync-org.mjs
```

Значения лежат в комментарии в начале `sync-org.mjs` — проще скопировать оттуда.

> Позже вынести в GitHub Actions (ночной cron + кнопка «Run workflow»). Тогда этот шаг = нажать кнопку либо дождаться ночного прогона.

---

## 2. Найти отделы руководителя по фамилии

Supabase → **SQL Editor**. Подставить фамилию в `ilike`:

```sql
select
  u.last_name, u.first_name, u.job_title, u.email,
  d.department_id, d.code, d.name, d.subordination_type,
  (select count(*) from org_users ou
     where ou.department_id = d.department_id and ou.status = 1) as headcount,
  exists (select 1 from available_departments a
          where a.department_id = d.department_id) as allowed
from org_departments d
join org_users u on u.ispring_user_id = d.supervisor_ispring_id
where u.last_name ilike 'Хасанов%'        -- ФАМИЛИЯ руководителя
order by u.last_name, u.first_name, d.name;
```

В выдаче:

- один руководитель может вести **несколько** отделов (до 10 из-за inherit) — покажет все;
- `headcount` — активный штат (бюджет = `70 × headcount`);
- `allowed` — отдел уже в аллоулисте (`true`) или нет (`false`);
- тёзок различать по `first_name` / `job_title` / `email`.

---

## 3. Добавить отделы в аллоулист

**Все отделы руководителя сразу** (без копирования id — рекомендуется):

```sql
insert into available_departments (department_id, note)
select d.department_id, d.name
from org_departments d
join org_users u on u.ispring_user_id = d.supervisor_ispring_id
where u.last_name ilike 'Хасанов%'
on conflict (department_id) do nothing;
```

**Только выбранные отделы** (id — из запроса п.2):

```sql
insert into available_departments (department_id, note)
values
  ('15c38c5d-...', 'Отдел учёта персонала — Хасанова'),
  ('...',          '...')
on conflict (department_id) do nothing;
```

> Если у колонки `added_at` нет default — добавить в список колонок `added_at` и значение `now()`.

**Убрать отдел из аллоулиста:**

```sql
delete from available_departments where department_id = '15c38c5d-...';
```

---

## 4. Руководитель начисляет

Отдел в аллоулисте + он числится его руководителем в кэше → при **входе из ЛК магазина** (`Начислить баллы` → хендофф) роль посчитается как `manager`, отдел появится в списке.

⚠️ Если руководитель уже сидел в сессии с отказом — пусть **перезайдёт из ЛК** (нужен свежий хендофф-пропуск; существующая кука вход не даёт по дизайну).

---

## Полезные запросы

**Текущий аллоулист с названиями и руководителями:**

```sql
select a.department_id, d.name, d.code,
       u.last_name, u.first_name
from available_departments a
left join org_departments d on d.department_id = a.department_id
left join org_users u on u.ispring_user_id = d.supervisor_ispring_id
order by d.name;
```

**Осиротевшие записи** (отдел добавляли, но после синка его в iSpring уже нет — `name` будет пустым):

```sql
select a.department_id, a.note
from available_departments a
left join org_departments d on d.department_id = a.department_id
where d.department_id is null;
```

---

## Памятка по модели

- Один руководитель на отдел (`supervisor_ispring_id` — скаляр). Два руководителя на один отдел не поддерживаются.
- `supervisor_ispring_id` — это **разрешённый** руководитель: `manual` напрямую, либо подтянутый вверх по дереву для `inherit`.
- Сменили руководителя в iSpring → изменения видны только **после синка** (шаг 1).
- Аллоулист переживает синки — его правим только руками (шаг 3).

---

## Удаление ограничения на начисление баллов

```
delete from award_periods where department_id in (select department_id from org_departments where code = '1234567890');
```
