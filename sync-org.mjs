#!/usr/bin/env node
/**
 * Этап 1 — синк оргструктуры iSpring -> Supabase (кэш, перезаписывается целиком).
 *
 * Делает:
 *   1. свип всех юзеров (/api/v2/user/list) -> org_users
 *   2. по каждому встреченному отделу GET /department/{id} (+ родители) -> org_departments,
 *      руководитель РАЗРЕШАЕТСЯ вверх по дереву (inherit -> ближайший manual)
 *   3. upsert в Supabase с меткой текущего запуска, затем удаление «протухших» строк
 *      (которых в этом запуске не было) — так отражаются увольнения/переносы.
 *
 * Зависимостей нет (Node >= 18). Запуск:
 *   SUPABASE_URL=https://wjjwuljhrjxpqytsbstd.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqand1bGpocmp4cHF5dHNic3RkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDkyNzE3NSwiZXhwIjoyMDY2NTAzMTc1fQ.FJ4tXyTZyxeN5luWzPcAjBMBsNFghtxp-CFxjk_T77c \
 *   ISPRING_DOMAIN=cse.ispringlearn.ru \
 *   ISPRING_CLIENT_ID=92e83f33-5572-11f0-8e7e-666906879adb
 *   ISPRING_CLIENT_SECRET=zaUmPGeLH3LkN0Khi2CeZgKriJFS5EaC-u6TPppAHBg \
 *   node sync-org.mjs
 */

function env(n) {
  const v = process.env[n];
  if (!v) {
    console.error(`❌ нет env ${n}`);
    process.exit(1);
  }
  return v;
}

const SUPABASE_URL = env('SUPABASE_URL').replace(/\/+$/, '');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const ISPRING_DOMAIN = process.env.ISPRING_DOMAIN || 'cse.ispringlearn.ru';
const API_HOST = process.env.ISPRING_API_HOST || 'api-learn.ispringlearn.ru';
const USERLIST_URL =
  process.env.ISPRING_USERLIST_URL ||
  `https://${ISPRING_DOMAIN}/api/v2/user/list`;
const CLIENT_ID = env('ISPRING_CLIENT_ID');
const CLIENT_SECRET = env('ISPRING_CLIENT_SECRET');
const PAGE_SIZE = 1000;
const DEPT_CONCURRENCY = 5;
const RUN_TS = new Date().toISOString();

// ---------- iSpring токен (с авто-обновлением) ----------
let token = null;
async function getToken(force = false) {
  if (token && !force) return token;
  const r = await fetch(`https://${ISPRING_DOMAIN}/api/v3/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`);
  token = (await r.json()).access_token;
  return token;
}

// ---------- 1. свип юзеров ----------
function fieldVal(fields, name) {
  const arr = Array.isArray(fields) ? fields : fields ? [fields] : [];
  const f = arr.find((x) => x?.name === name);
  return (f?.value || '').trim();
}

async function fetchAllUsers() {
  const users = [];
  let page = 1;
  for (;;) {
    const t = await getToken();
    const res = await fetch(USERLIST_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ page, pageSize: PAGE_SIZE }),
    });
    if (res.status === 401) {
      await getToken(true);
      continue;
    }
    if (!res.ok)
      throw new Error(`user/list p${page} ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const batch = [].concat(data.userProfiles || []);
    for (const u of batch) {
      users.push({
        ispring_user_id: u.userId,
        email: fieldVal(u.fields, 'EMAIL'),
        first_name: fieldVal(u.fields, 'FIRST_NAME'),
        last_name: fieldVal(u.fields, 'LAST_NAME'),
        job_title: fieldVal(u.fields, 'JOB_TITLE'),
        department_id: u.departmentId || null,
        status:
          typeof u.status === 'number'
            ? u.status
            : parseInt(u.status, 10) || null,
        synced_at: RUN_TS,
      });
    }
    const total = data.totalUsersNumber ?? users.length;
    process.stdout.write(`\r  юзеры: ${users.length}/${total}   `);
    if (batch.length === 0 || users.length >= total) break;
    page++;
  }
  process.stdout.write('\n');
  return users;
}

// ---------- 2. отделы ----------
const deptCache = new Map(); // id -> raw dep | null
function pick(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}
function parseDepartment(xml) {
  const sub = (xml.match(/<subordination>([\s\S]*?)<\/subordination>/) || [
    ,
    '',
  ])[1];
  return {
    department_id: pick(xml, 'departmentId'),
    name: pick(xml, 'name'),
    code: pick(xml, 'code'),
    parent_department_id: pick(xml, 'parentDepartmentId') || null,
    subordination_type: pick(sub, 'subordinationType') || null,
    _supervisorId: pick(sub, 'supervisorId') || '',
  };
}
async function getDepartment(id) {
  if (!id) return null;
  if (deptCache.has(id)) return deptCache.get(id);
  const t = await getToken();
  const res = await fetch(`https://${API_HOST}/department/${id}`, {
    headers: { Authorization: t },
  });
  if (res.status === 401) {
    await getToken(true);
    deptCache.delete(id);
    return getDepartment(id);
  }
  if (!res.ok) {
    deptCache.set(id, null);
    return null;
  }
  const dep = parseDepartment(await res.text());
  deptCache.set(id, dep);
  return dep;
}
// разрешённый руководитель: inherit -> вверх по родителям до manual
async function resolveSupervisor(dep, guard = 0) {
  if (!dep || guard > 25) return '';
  if (dep.subordination_type === 'manual' && dep._supervisorId)
    return dep._supervisorId;
  if (dep.subordination_type === 'inherit' && dep.parent_department_id)
    return resolveSupervisor(
      await getDepartment(dep.parent_department_id),
      guard + 1
    );
  return '';
}
async function mapLimit(items, limit, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        await fn(items[idx]);
      }
    })
  );
}

// ---------- Supabase REST ----------
async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}
async function upsert(table, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await sb(table, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok)
      throw new Error(`upsert ${table} ${res.status}: ${await res.text()}`);
  }
}
async function deleteStale(table) {
  const res = await sb(`${table}?synced_at=lt.${encodeURIComponent(RUN_TS)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  if (!res.ok)
    throw new Error(`delete stale ${table} ${res.status}: ${await res.text()}`);
}

// ---------- main ----------
(async () => {
  console.log(`Синк оргструктуры → Supabase (run ${RUN_TS})`);
  console.log('1) юзеры…');
  const users = await fetchAllUsers();

  const deptIds = [
    ...new Set(users.map((u) => u.department_id).filter(Boolean)),
  ];
  console.log(`2) отделов с сотрудниками: ${deptIds.length}. Читаю карточки…`);
  await mapLimit(deptIds, DEPT_CONCURRENCY, (id) => getDepartment(id));

  console.log('3) резолвлю руководителей…');
  const deptRows = [];
  for (const id of deptIds) {
    const dep = deptCache.get(id);
    if (!dep) continue;
    deptRows.push({
      department_id: dep.department_id,
      name: dep.name,
      code: dep.code,
      parent_department_id: dep.parent_department_id,
      subordination_type: dep.subordination_type,
      supervisor_ispring_id: (await resolveSupervisor(dep)) || null,
      synced_at: RUN_TS,
    });
  }

  console.log(
    `4) пишу в Supabase: org_users=${users.length}, org_departments=${deptRows.length}…`
  );
  await upsert('org_users', users);
  await upsert('org_departments', deptRows);
  await deleteStale('org_users');
  await deleteStale('org_departments');

  console.log('✅ Готово.');
})().catch((e) => {
  console.error('\n❌', e.message);
  process.exit(1);
});
