"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const jose_1 = require("jose");
const supabase_js_1 = require("@supabase/supabase-js");
// уровни проактивности -> суффикс колонок
const PRO_COLS = { А: 'a', Б: 'b', В: 'v', Г: 'g', Д: 'd' };
const PRO_KEYS = Object.keys(PRO_COLS);
const SIMPLE = ['rez', 'unknown', 'free'];
const MAX_DESC = 2000;
function fromRow(r) {
    const ind = (p) => ({
        pct: r[`${p}_pct`],
        points: r[`${p}_points`],
        desc: r[`${p}_desc`],
    });
    const levels = {};
    for (const k of PRO_KEYS)
        levels[k] = ind(`pro_${PRO_COLS[k]}`);
    return {
        maxPerEmployee: r.max_per_employee,
        budgetPct: r.budget_pct,
        budgetPerHead: r.budget_per_head,
        rez: ind('rez'),
        unknown: ind('unknown'),
        free: ind('free'),
        pro: { desc: r.pro_desc, levels },
        updatedAt: r.updated_at,
    };
}
const isPct = (v) => Number.isInteger(v) && v >= 0 && v <= 100;
const isDesc = (v) => typeof v === 'string' && v.length <= MAX_DESC;
// Проверяем всё тело целиком и собираем строку для update. Те же правила стоят
// constraint'ами в базе — здесь они дублируются ради понятного текста ошибки.
function toRow(b) {
    if (!Number.isInteger(b.maxPerEmployee) || b.maxPerEmployee <= 0)
        return { error: 'Максимум на сотрудника — целое число больше 0' };
    if (!isPct(b.budgetPct))
        return { error: 'Бюджет — целое число от 0 до 100%' };
    const row = {
        max_per_employee: b.maxPerEmployee,
        budget_pct: b.budgetPct,
    };
    for (const p of SIMPLE) {
        const ind = b[p];
        if (!ind || !isPct(ind.pct))
            return { error: `${p}: процент — целое число от 0 до 100` };
        if (!isDesc(ind.desc))
            return { error: `${p}: описание до ${MAX_DESC} символов` };
        row[`${p}_pct`] = ind.pct;
        row[`${p}_desc`] = ind.desc;
    }
    if (!b.pro || !isDesc(b.pro.desc))
        return { error: `Проактивность: описание до ${MAX_DESC} символов` };
    row.pro_desc = b.pro.desc;
    for (const k of PRO_KEYS) {
        const ind = b.pro.levels?.[k];
        if (!ind || !isPct(ind.pct))
            return { error: `Проактивность ${k}: процент — целое число от 0 до 100` };
        if (!isDesc(ind.desc))
            return { error: `Проактивность ${k}: описание до ${MAX_DESC} символов` };
        row[`pro_${PRO_COLS[k]}_pct`] = ind.pct;
        row[`pro_${PRO_COLS[k]}_desc`] = ind.desc;
    }
    const total = b.rez.pct +
        Math.max(...PRO_KEYS.map((k) => b.pro.levels[k].pct)) +
        b.unknown.pct +
        b.free.pct;
    if (total > 100)
        return { error: `Сумма максимальных показателей ${total}% — больше 100%` };
    return { row };
}
async function handler(req, res) {
    let userId, role;
    try {
        const t = req.cookies?.['admin-session'];
        if (!t)
            return res.status(401).json({ error: 'unauthorized' });
        const { payload } = await (0, jose_1.jwtVerify)(t, new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || ''));
        userId = payload.sub;
        role = payload.role;
    }
    catch {
        return res.status(401).json({ error: 'unauthorized' });
    }
    if (role !== 'admin' && role !== 'manager')
        return res.status(403).json({ error: 'forbidden' });
    try {
        const sb = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
        if (req.method === 'GET') {
            const { data, error } = await sb
                .from('award_settings')
                .select('*')
                .eq('id', true)
                .maybeSingle();
            if (error)
                return res.status(500).json({ error: error.message });
            if (!data)
                return res.status(500).json({ error: 'award_settings не заполнены' });
            return res.status(200).json(fromRow(data));
        }
        if (req.method === 'PUT') {
            if (role !== 'admin')
                return res.status(403).json({ error: 'forbidden' });
            const parsed = toRow((req.body || {}));
            if ('error' in parsed)
                return res.status(400).json({ error: parsed.error });
            const { data, error } = await sb
                .from('award_settings')
                .update({ ...parsed.row, updated_at: new Date().toISOString(), updated_by: userId })
                .eq('id', true)
                .select('*')
                .maybeSingle();
            if (error) {
                // 23514 — сработал check constraint в базе
                const code = error.code;
                return res
                    .status(code === '23514' ? 400 : 500)
                    .json({ error: code === '23514' ? 'Настройки нарушают ограничения базы' : error.message });
            }
            if (!data)
                return res.status(500).json({ error: 'award_settings не заполнены' });
            return res.status(200).json(fromRow(data));
        }
        return res.status(405).json({ error: 'method not allowed' });
    }
    catch (e) {
        console.error('award-settings:', e);
        return res.status(500).json({ error: 'server error' });
    }
}
