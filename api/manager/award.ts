// api/manager/award.ts — отправка начислений (денежный путь).
// POST { departmentId, awards: [{ employeeId, indicators:{rez:bool, pro:'А'..'Д', unknown:bool, free:bool}, comment }] }
// - всё считается и валидируется НА СЕРВЕРЕ (клиенту не верим);
// - замок «раз в месяц на отдел» = unique(department_id, period_month);
// - идемпотентность: период уже есть -> дослать только pending/failed, payload игнорируется;
// - частичный сбой: статус по каждой записи, успешные повторно не шлём.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PRO: Record<string, number> = { А: 0, Б: 5, В: 10, Г: 15, Д: 20 };
const POINTS_PER_HEAD = 70;
const MAX_PER_EMPLOYEE = 100;

type Indicators = {
  rez?: boolean;
  pro?: string;
  unknown?: boolean;
  free?: boolean;
};

function calcPoints(ind: Indicators): number {
  let p = 0;
  if (ind.rez) p += 60;
  p += PRO[ind.pro ?? ''] ?? 0;
  if (ind.unknown) p += 10;
  if (ind.free) p += 10;
  return p;
}
function buildReason(ind: Indicators, comment?: string | null): string {
  const parts: string[] = [];
  if (ind.rez) parts.push('результативность');
  if ((PRO[ind.pro ?? ''] ?? 0) > 0) parts.push('проактивность');
  if (ind.unknown) parts.push('благодарности');
  if (ind.free)
    parts.push(comment ? `дополнительно (${comment})` : 'дополнительно');
  return 'Начисление баллов за: ' + (parts.join(', ') || '—');
}
function xmlEscape(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
// месяц по Москве (UTC+3, без переходов)
function monthKey(): string {
  const d = new Date(Date.now() + 3 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function ispringToken(): Promise<string> {
  const r = await fetch(`https://${process.env.ISPRING_DOMAIN}/api/v3/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.ISPRING_CLIENT_ID!,
      client_secret: process.env.ISPRING_CLIENT_SECRET!,
    }),
  });
  if (!r.ok) throw new Error(`ispring token ${r.status}`);
  return ((await r.json()) as { access_token: string }).access_token;
}
async function awardOne(
  token: string,
  ispringUserId: string,
  amount: number,
  reason: string
) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<awardGamificationPoints>
    <userId>${ispringUserId}</userId>
    <amount>${amount}</amount>
    <reason>${xmlEscape(reason)}</reason>
</awardGamificationPoints>`;
  const r = await fetch(
    `https://${process.env.ISPRING_API_DOMAIN}/gamification/points/award`,
    {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/xml' },
      body,
    }
  );
  if (!r.ok)
    throw new Error(`award ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

// дослать все pending/failed записи периода
async function pushPending(
  sb: SupabaseClient,
  periodId: string,
  res: VercelResponse
) {
  const { data: ents } = await sb
    .from('award_entries')
    .select('*')
    .eq('period_id', periodId)
    .in('ispring_status', ['pending', 'failed']);

  let sent = 0,
    failed = 0;
  if (ents && ents.length) {
    const token = await ispringToken();
    for (const e of ents) {
      try {
        await awardOne(
          token,
          e.employee_ispring_id,
          e.points,
          buildReason(e.indicators, e.comment)
        );
        await sb
          .from('award_entries')
          .update({
            ispring_status: 'sent',
            sent_at: new Date().toISOString(),
            ispring_error: null,
          })
          .eq('id', e.id);
        sent++;
      } catch (err) {
        await sb
          .from('award_entries')
          .update({
            ispring_status: 'failed',
            ispring_error: String((err as Error)?.message || err),
          })
          .eq('id', e.id);
        failed++;
      }
    }
  }
  const { count: remaining } = await sb
    .from('award_entries')
    .select('id', { count: 'exact', head: true })
    .eq('period_id', periodId)
    .in('ispring_status', ['pending', 'failed']);
  return res
    .status(200)
    .json({ ok: failed === 0, sent, failed, remaining: remaining || 0 });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'method not allowed' });
  try {
    // auth: руководитель
    const tok = req.cookies?.['admin-session'];
    if (!tok) return res.status(401).json({ error: 'unauthorized' });
    let userId: string, role: string | undefined;
    try {
      const { payload } = await jwtVerify(
        tok,
        new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || '')
      );
      userId = payload.sub as string;
      role = (payload as { role?: string }).role;
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (role !== 'manager') return res.status(403).json({ error: 'forbidden' });

    const { departmentId, awards } = (req.body || {}) as {
      departmentId?: string;
      awards?: {
        employeeId: string;
        indicators: Indicators;
        comment?: string;
      }[];
    };
    if (!departmentId)
      return res.status(400).json({ error: 'no departmentId' });

    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // руководитель отдела?
    const { data: u } = await sb
      .from('users')
      .select('ispring_user_id')
      .eq('id', userId)
      .maybeSingle();
    const ispringId = u?.ispring_user_id;
    if (!ispringId) return res.status(403).json({ error: 'forbidden' });
    const { data: dep } = await sb
      .from('org_departments')
      .select('supervisor_ispring_id')
      .eq('department_id', departmentId)
      .maybeSingle();
    if (!dep || dep.supervisor_ispring_id !== ispringId)
      return res.status(403).json({ error: 'forbidden' });
    const { data: allowed } = await sb
      .from('available_departments')
      .select('department_id')
      .eq('department_id', departmentId)
      .maybeSingle();
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    const month = monthKey();

    // период уже есть -> это ретрай (дослать проблемные), payload игнорируем
    const { data: existing } = await sb
      .from('award_periods')
      .select('id')
      .eq('department_id', departmentId)
      .eq('period_month', month)
      .maybeSingle();
    if (existing) return await pushPending(sb, existing.id, res);

    // новая отправка
    if (!Array.isArray(awards) || awards.length === 0)
      return res.status(400).json({ error: 'no awards' });

    const { data: roster } = await sb
      .from('org_users')
      .select('ispring_user_id')
      .eq('department_id', departmentId)
      .eq('status', 1);
    const rosterSet = new Set(
      (roster || []).map((r: { ispring_user_id: string }) => r.ispring_user_id)
    );
    const budget = rosterSet.size * POINTS_PER_HEAD;

    const entries: {
      employee_ispring_id: string;
      indicators: Indicators;
      comment: string | null;
      points: number;
    }[] = [];
    let spent = 0;
    for (const a of awards) {
      if (!rosterSet.has(a.employeeId))
        return res
          .status(400)
          .json({ error: `employee not in department: ${a.employeeId}` });
      const ind = a.indicators || {};
      if (ind.free && !(a.comment && String(a.comment).trim()))
        return res
          .status(400)
          .json({ error: 'comment required for free indicator' });
      if (ind.pro && !(ind.pro in PRO))
        return res.status(400).json({ error: `bad pro value: ${ind.pro}` });
      const points = calcPoints(ind);
      if (points <= 0) continue;
      if (points > MAX_PER_EMPLOYEE)
        return res.status(400).json({ error: 'more than 100 per employee' });
      spent += points;
      entries.push({
        employee_ispring_id: a.employeeId,
        indicators: ind,
        comment: a.comment?.trim() || null,
        points,
      });
    }
    if (entries.length === 0)
      return res.status(400).json({ error: 'nothing to award' });
    if (spent > budget)
      return res
        .status(400)
        .json({ error: `over budget: ${spent} > ${budget}` });

    // создать период — замок на месяц
    const { data: period, error: perr } = await sb
      .from('award_periods')
      .insert({
        department_id: departmentId,
        period_month: month,
        manager_ispring_id: ispringId,
        budget_total: budget,
        budget_spent: spent,
        status: 'submitted',
      })
      .select('id')
      .single();
    if (perr) {
      if ((perr as { code?: string }).code === '23505')
        return res.status(409).json({ error: 'already submitted this month' });
      throw perr;
    }

    const rows = entries.map((e) => ({
      ...e,
      period_id: period.id,
      ispring_status: 'pending',
    }));
    const { error: eerr } = await sb.from('award_entries').insert(rows);
    if (eerr) throw eerr;

    return await pushPending(sb, period.id, res);
  } catch (e) {
    console.error('award:', e);
    return res.status(500).json({ error: 'server error' });
  }
}
