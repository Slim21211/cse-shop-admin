// api/award-settings.ts — настройки начисления баллов (таблица award_settings, см. sql/award_settings.sql).
// GET — админ и руководитель (руководителю нужны баллы и подсказки), PUT — только админ.
// Баллы считает база (generated-колонки), здесь только проценты и тексты. Самодостаточный.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

// уровни проактивности -> суффикс колонок
const PRO_COLS = { А: 'a', Б: 'b', В: 'v', Г: 'g', Д: 'd' } as const;
type Pro = keyof typeof PRO_COLS;
const PRO_KEYS = Object.keys(PRO_COLS) as Pro[];
const SIMPLE = ['rez', 'unknown', 'free'] as const;
const MAX_DESC = 2000;

type Indicator = { pct: number; points: number; desc: string };
type Settings = {
  maxPerEmployee: number;
  budgetPct: number;
  budgetPerHead: number;
  rez: Indicator;
  unknown: Indicator;
  free: Indicator;
  pro: { desc: string; levels: Record<Pro, Indicator> };
  updatedAt: string;
};

function fromRow(r: Record<string, unknown>): Settings {
  const ind = (p: string): Indicator => ({
    pct: r[`${p}_pct`] as number,
    points: r[`${p}_points`] as number,
    desc: r[`${p}_desc`] as string,
  });
  const levels = {} as Record<Pro, Indicator>;
  for (const k of PRO_KEYS) levels[k] = ind(`pro_${PRO_COLS[k]}`);
  return {
    maxPerEmployee: r.max_per_employee as number,
    budgetPct: r.budget_pct as number,
    budgetPerHead: r.budget_per_head as number,
    rez: ind('rez'),
    unknown: ind('unknown'),
    free: ind('free'),
    pro: { desc: r.pro_desc as string, levels },
    updatedAt: r.updated_at as string,
  };
}

const isPct = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100;
const isDesc = (v: unknown) => typeof v === 'string' && v.length <= MAX_DESC;

// Проверяем всё тело целиком и собираем строку для update. Те же правила стоят
// constraint'ами в базе — здесь они дублируются ради понятного текста ошибки.
function toRow(b: Partial<Settings>): { row: Record<string, unknown> } | { error: string } {
  if (!Number.isInteger(b.maxPerEmployee) || (b.maxPerEmployee as number) <= 0)
    return { error: 'Максимум на сотрудника — целое число больше 0' };
  if (!isPct(b.budgetPct)) return { error: 'Бюджет — целое число от 0 до 100%' };

  const row: Record<string, unknown> = {
    max_per_employee: b.maxPerEmployee,
    budget_pct: b.budgetPct,
  };
  for (const p of SIMPLE) {
    const ind = b[p];
    if (!ind || !isPct(ind.pct)) return { error: `${p}: процент — целое число от 0 до 100` };
    if (!isDesc(ind.desc)) return { error: `${p}: описание до ${MAX_DESC} символов` };
    row[`${p}_pct`] = ind.pct;
    row[`${p}_desc`] = ind.desc;
  }
  if (!b.pro || !isDesc(b.pro.desc))
    return { error: `Проактивность: описание до ${MAX_DESC} символов` };
  row.pro_desc = b.pro.desc;
  for (const k of PRO_KEYS) {
    const ind = b.pro.levels?.[k];
    if (!ind || !isPct(ind.pct)) return { error: `Проактивность ${k}: процент — целое число от 0 до 100` };
    if (!isDesc(ind.desc)) return { error: `Проактивность ${k}: описание до ${MAX_DESC} символов` };
    row[`pro_${PRO_COLS[k]}_pct`] = ind.pct;
    row[`pro_${PRO_COLS[k]}_desc`] = ind.desc;
  }

  const total =
    b.rez!.pct +
    Math.max(...PRO_KEYS.map((k) => b.pro!.levels[k].pct)) +
    b.unknown!.pct +
    b.free!.pct;
  if (total > 100)
    return { error: `Сумма максимальных показателей ${total}% — больше 100%` };
  return { row };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let userId: string, role: string | undefined;
  try {
    const t = req.cookies?.['admin-session'];
    if (!t) return res.status(401).json({ error: 'unauthorized' });
    const { payload } = await jwtVerify(
      t,
      new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || '')
    );
    userId = payload.sub as string;
    role = (payload as { role?: string }).role;
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin')
    return res.status(403).json({ error: 'forbidden' });

  try {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('award_settings')
        .select('*')
        .eq('id', true)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(500).json({ error: 'award_settings не заполнены' });
      return res.status(200).json(fromRow(data));
    }

    if (req.method === 'PUT') {
      if (role !== 'admin' && role !== 'superadmin')
        return res.status(403).json({ error: 'forbidden' });
      const parsed = toRow((req.body || {}) as Partial<Settings>);
      if ('error' in parsed) return res.status(400).json({ error: parsed.error });

      const { data, error } = await sb
        .from('award_settings')
        .update({ ...parsed.row, updated_at: new Date().toISOString(), updated_by: userId })
        .eq('id', true)
        .select('*')
        .maybeSingle();
      if (error) {
        // 23514 — сработал check constraint в базе
        const code = (error as { code?: string }).code;
        return res
          .status(code === '23514' ? 400 : 500)
          .json({ error: code === '23514' ? 'Настройки нарушают ограничения базы' : error.message });
      }
      if (!data) return res.status(500).json({ error: 'award_settings не заполнены' });
      return res.status(200).json(fromRow(data));
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error('award-settings:', e);
    return res.status(500).json({ error: 'server error' });
  }
}
