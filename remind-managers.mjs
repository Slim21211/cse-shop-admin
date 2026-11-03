#!/usr/bin/env node
/**
 * Напоминание руководителям: в этом месяце (по Москве) ещё не начислены баллы.
 * Берёт отделы из available_departments, у которых нет award_periods за текущий месяц,
 * группирует по руководителю (org_departments.supervisor_ispring_id) и шлёт одно письмо
 * на человека со списком его отделов. Письма — с той же почты, что коды входа магазина.
 *
 * Запускается из GitHub Actions (.github/workflows/remind-managers.yml), локально:
 *   DRY_RUN=1 node --env-file=.env remind-managers.mjs
 * Нужны: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MAIL_PASSWORD.
 *   DRY_RUN=1          — ничего не отправлять, только посчитать
 *   TEST_TO=<email>    — все письма отправить на этот адрес вместо руководителей
 *
 * Репозиторий публичный, логи Actions тоже — поэтому в лог не пишем ни имён, ни адресов.
 */
import nodemailer from 'nodemailer';

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
const DRY_RUN = process.env.DRY_RUN === '1';
const TEST_TO = (process.env.TEST_TO || '').trim();
const SHOP_ACCOUNT_URL = 'https://cse-shop.ru/account';

// как в магазине (cse-shop-web/src/lib/mail.ts)
const SHOP_EMAIL = 'giftshop@cse.ru';
const MAIL_FROM = `"Магазин подарков КСЭ" <${SHOP_EMAIL}>`;

function monthKey() {
  const d = new Date(Date.now() + 3 * 3600 * 1000); // Москва UTC+3, как в api/manager/award.ts
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function select(table, query) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`${table} ${r.status}: ${await r.text()}`);
  return r.json();
}
const inList = (ids) => `in.(${ids.map((i) => `"${i}"`).join(',')})`;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildMail(firstName, departments) {
  const hello = firstName ? `Здравствуйте, ${firstName}!` : 'Здравствуйте!';
  const many = departments.length > 1;
  const lead = many
    ? 'В этом месяце ещё не начислены баллы сотрудникам ваших подразделений:'
    : 'В этом месяце ещё не начислены баллы сотрудникам вашего подразделения:';
  const text = [
    hello,
    '',
    lead,
    ...departments.map((d) => `• ${d}`),
    '',
    `Начислить можно в личном кабинете магазина подарков: ${SHOP_ACCOUNT_URL} → «Начислить баллы».`,
    'Неиспользованный бюджет отдела сгорает в конце месяца.',
    '',
    'Магазин подарков КСЭ',
  ].join('\n');
  const html = `<p>${escapeHtml(hello)}</p>
<p>${escapeHtml(lead)}</p>
<ul>${departments.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
<p>Начислить можно в <a href="${SHOP_ACCOUNT_URL}">личном кабинете магазина подарков</a> → «Начислить баллы».<br>
Неиспользованный бюджет отдела сгорает в конце месяца.</p>
<p>Магазин подарков КСЭ</p>`;
  return {
    subject: 'Напоминание: начислите баллы сотрудникам до конца месяца',
    text,
    html,
  };
}

(async () => {
  const month = monthKey();
  console.log(`Напоминания за ${month}${DRY_RUN ? ' (DRY_RUN)' : ''}${TEST_TO ? ' (TEST_TO)' : ''}`);

  const allowed = (await select('available_departments', 'select=department_id')).map(
    (a) => a.department_id
  );
  if (!allowed.length) return console.log('Аллоулист пуст — некому напоминать.');

  const submitted = new Set(
    (
      await select(
        'award_periods',
        `select=department_id&period_month=eq.${month}&department_id=${inList(allowed)}`
      )
    ).map((p) => p.department_id)
  );
  const pending = allowed.filter((id) => !submitted.has(id));
  console.log(`отделов: ${allowed.length}, начислено: ${submitted.size}, ждут: ${pending.length}`);
  if (!pending.length) return;

  const deps = await select(
    'org_departments',
    `select=department_id,name,supervisor_ispring_id&department_id=${inList(pending)}`
  );
  const byManager = new Map(); // supervisor_ispring_id -> [названия отделов]
  let noManager = 0;
  for (const d of deps) {
    if (!d.supervisor_ispring_id) {
      noManager++;
      continue;
    }
    const list = byManager.get(d.supervisor_ispring_id) || [];
    list.push(d.name);
    byManager.set(d.supervisor_ispring_id, list);
  }

  const managers = byManager.size
    ? await select(
        'org_users',
        `select=ispring_user_id,email,first_name&status=eq.1&ispring_user_id=${inList([...byManager.keys()])}`
      )
    : [];
  const managerById = new Map(managers.map((m) => [m.ispring_user_id, m]));

  const transporter = nodemailer.createTransport({
    host: 'smtp.cse.ru',
    port: 587,
    secure: false,
    requireTLS: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: process.env.SMTP_ALLOW_INVALID_CERT !== '1',
      secureProtocol: 'TLSv1_2_method',
    },
    auth: { user: SHOP_EMAIL, pass: DRY_RUN ? '' : env('MAIL_PASSWORD') },
  });

  let sent = 0,
    noEmail = 0,
    failed = 0;
  for (const [id, departments] of byManager) {
    const m = managerById.get(id);
    if (!m?.email) {
      noEmail++;
      continue;
    }
    if (DRY_RUN) {
      sent++;
      continue;
    }
    try {
      await transporter.sendMail({
        from: MAIL_FROM,
        to: TEST_TO || m.email,
        ...buildMail(m.first_name, departments.sort()),
      });
      sent++;
    } catch (e) {
      failed++;
      console.error(`❌ письмо не ушло: ${e.message}`); // без адреса — лог публичный
    }
  }

  console.log(
    `${DRY_RUN ? 'отправилось бы' : 'отправлено'}: ${sent}; без email: ${noEmail}; ` +
      `отделов без руководителя: ${noManager}; ошибок: ${failed}`
  );
  if (failed) process.exit(1);
})().catch((e) => {
  console.error('\n❌', e.message);
  process.exit(1);
});
