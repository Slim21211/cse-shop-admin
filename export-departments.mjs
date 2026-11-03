#!/usr/bin/env node
/**
 * Выгрузка «подразделения + руководители» из iSpring для сверки с HR.
 *
 * Стоит только на подтверждённых вызовах:
 *   1. POST https://{ACCOUNT_HOST}/api/v2/user/list  — свип всех юзеров (как в админке)
 *   2. GET  https://{API_HOST}/department/{id}        — имя/код/родитель/руководитель отдела
 *
 * Логика:
 *   - свипаем всех юзеров -> карта userId->{ФИО,email}, счётчик сотрудников по departmentId;
 *   - по каждому встреченному departmentId (и его родителям) читаем department;
 *   - руководитель отдела = subordination.supervisorId;
 *     если subordinationType=inherit — поднимаемся к родителю, пока не найдём manual;
 *   - резолвим supervisorId -> ФИО/email из карты юзеров;
 *   - пишем departments-supervisors.csv (UTF-8 + BOM, чтобы Excel не ломал кириллицу).
 *
 * Запуск:
 *   ISPRING_DOMAIN=cse.ispringlearn.ru \
 *   ISPRING_CLIENT_ID=... ISPRING_CLIENT_SECRET=... \
 *   node export-departments.mjs
 *
 * Требуется Node >= 18 (глобальный fetch). Зависимостей нет.
 */

import { writeFileSync } from 'node:fs';

// ---------- конфиг ----------
const ACCOUNT_HOST = process.env.ISPRING_DOMAIN || 'cse.ispringlearn.ru'; // токен + /api/v2/user/list
const API_HOST = process.env.ISPRING_API_HOST || 'api-learn.ispringlearn.ru'; // /department/{id}
const CLIENT_ID = process.env.ISPRING_CLIENT_ID;
const CLIENT_SECRET = process.env.ISPRING_CLIENT_SECRET;
const PAGE_SIZE = 1000;
const CONCURRENCY = 5; // параллельные GET /department, чтобы не ловить 429
const OUT = 'departments-supervisors.csv';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Задай ISPRING_CLIENT_ID и ISPRING_CLIENT_SECRET в окружении.');
  process.exit(1);
}

// ---------- токен (с авто-обновлением: токен протухает быстро) ----------
let token = null;
async function getToken(force = false) {
  if (token && !force) return token;
  const res = await fetch(`https://${ACCOUNT_HOST}/api/v3/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  token = (await res.json()).access_token;
  return token;
}

/**
 * fetch с авто-рефрешем токена на 401 и ретраем на 429/5xx.
 * authStyle: 'bearer' (account-хост, v2) | 'raw' (api-learn).
 */
async function authed(url, { method = 'GET', body, headers = {}, authStyle = 'raw', accept } = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const t = await getToken(attempt > 0 && attempt === 1 ? false : false);
    const h = {
      Authorization: authStyle === 'bearer' ? `Bearer ${t}` : t,
      ...(accept ? { Accept: accept } : {}),
      ...headers,
    };
    const res = await fetch(url, { method, headers: h, body });
    if (res.status === 401) { await getToken(true); continue; }        // токен протух -> обновить
    if (res.status === 429 || res.status >= 500) {                     // троттлинг/временное -> подождать
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    return res;
  }
  throw new Error(`too many retries: ${url}`);
}

// ---------- 1. свип всех юзеров ----------
function fieldVal(fields, name) {
  const arr = Array.isArray(fields) ? fields : fields ? [fields] : [];
  const f = arr.find((x) => x?.name === name);
  return (f?.value || '').trim();
}

async function fetchAllUsers() {
  const users = [];
  let page = 1;
  for (;;) {
    const res = await authed(`https://${ACCOUNT_HOST}/api/v2/user/list`, {
      method: 'POST',
      authStyle: 'bearer',
      headers: { 'Content-Type': 'application/json' },
      accept: 'application/json',
      body: JSON.stringify({ page, pageSize: PAGE_SIZE }),
    });
    if (!res.ok) throw new Error(`user/list p${page} ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const batch = [].concat(data.userProfiles || []);
    users.push(...batch);
    const total = data.totalUsersNumber ?? users.length;
    process.stdout.write(`\r  юзеры: ${users.length}/${total}   `);
    if (batch.length === 0 || users.length >= total) break;
    page++;
  }
  process.stdout.write('\n');
  return users;
}

// ---------- 2. департаменты ----------
const deptCache = new Map(); // id -> {departmentId,name,code,parentId,subType,supervisorId} | null

function pick(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}
function parseDepartment(xml) {
  const sub = (xml.match(/<subordination>([\s\S]*?)<\/subordination>/) || [, ''])[1];
  return {
    departmentId: pick(xml, 'departmentId'),
    name: pick(xml, 'name'),
    code: pick(xml, 'code'),
    parentId: pick(xml, 'parentDepartmentId'),
    subType: pick(sub, 'subordinationType'),
    supervisorId: pick(sub, 'supervisorId'),
  };
}

async function getDepartment(id) {
  if (!id) return null;
  if (deptCache.has(id)) return deptCache.get(id);
  const res = await authed(`https://${API_HOST}/department/${id}`, { accept: 'application/xml' });
  if (!res.ok) { deptCache.set(id, null); return null; }
  const dep = parseDepartment(await res.text());
  deptCache.set(id, dep);
  return dep;
}

// руководитель с учётом inherit: если унаследован — поднимаемся к родителю
async function resolveSupervisor(dep, guard = 0) {
  if (!dep || guard > 20) return { supervisorId: '', via: '' };
  if (dep.subType === 'manual' && dep.supervisorId) return { supervisorId: dep.supervisorId, via: dep.departmentId };
  if (dep.subType === 'inherit' && dep.parentId) return resolveSupervisor(await getDepartment(dep.parentId), guard + 1);
  return { supervisorId: '', via: '' }; // no_supervisor
}

// простой пул с ограничением параллелизма
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
    })
  );
  return out;
}

// ---------- CSV ----------
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------- main ----------
(async () => {
  console.log(`iSpring export → ${OUT}`);
  console.log('1) свип пользователей…');
  const users = await fetchAllUsers();

  const userById = new Map();
  const headcount = new Map();
  for (const u of users) {
    const email = fieldVal(u.fields, 'EMAIL');
    const fio = `${fieldVal(u.fields, 'LAST_NAME')} ${fieldVal(u.fields, 'FIRST_NAME')}`.trim();
    userById.set(u.userId, { fio, email });
    if (u.departmentId) headcount.set(u.departmentId, (headcount.get(u.departmentId) || 0) + 1);
  }

  const deptIds = [...headcount.keys()];
  console.log(`2) подразделений с сотрудниками: ${deptIds.length}. Читаю карточки…`);
  await mapLimit(deptIds, CONCURRENCY, (id) => getDepartment(id));

  console.log('3) резолвлю руководителей (inherit → вверх по дереву)…');
  const rows = [];
  for (const id of deptIds) {
    const dep = deptCache.get(id);
    if (!dep) { rows.push({ code: '', name: '(не удалось прочитать)', departmentId: id, parentId: '', subType: '', supId: '', supFio: '', supEmail: '', headcount: headcount.get(id) || 0 }); continue; }
    const { supervisorId } = await resolveSupervisor(dep);
    const sup = supervisorId ? userById.get(supervisorId) : null;
    rows.push({
      code: dep.code,
      name: dep.name,
      departmentId: dep.departmentId,
      parentId: dep.parentId,
      subType: dep.subType,
      supId: supervisorId,
      supFio: sup?.fio || (supervisorId ? '(не в списке активных)' : ''),
      supEmail: sup?.email || '',
      headcount: headcount.get(id) || 0,
    });
  }

  rows.sort((a, b) => String(a.code).localeCompare(String(b.code), 'ru'));

  const header = ['Код', 'Подразделение', 'Руководитель ФИО', 'Email руководителя', 'Тип назначения', 'Сотрудников', 'departmentId', 'parentDepartmentId', 'supervisorId'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([r.code, r.name, r.supFio, r.supEmail, r.subType, r.headcount, r.departmentId, r.parentId, r.supId].map(csvCell).join(','));
  }
  writeFileSync(OUT, '\uFEFF' + lines.join('\r\n'), 'utf8');

  const withSup = rows.filter((r) => r.supId).length;
  console.log(`\n✅ Готово: ${OUT}`);
  console.log(`   отделов: ${rows.length}, с руководителем: ${withSup}, без: ${rows.length - withSup}`);
})().catch((e) => { console.error('\n❌', e.message); process.exit(1); });
