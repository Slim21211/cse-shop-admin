"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const jose_1 = require("jose");
const supabase_js_1 = require("@supabase/supabase-js");
async function loadWeights(sb) {
    const { data, error } = await sb
        .from('award_settings')
        .select('max_per_employee, budget_per_head, rez_points, pro_a_points, pro_b_points, pro_v_points, pro_g_points, pro_d_points, unknown_points, free_points')
        .eq('id', true)
        .maybeSingle();
    if (error)
        throw new Error('award_settings: ' + error.message);
    if (!data)
        throw new Error('award_settings не заполнены');
    return {
        maxPerEmployee: data.max_per_employee,
        budgetPerHead: data.budget_per_head,
        rez: data.rez_points,
        pro: {
            А: data.pro_a_points,
            Б: data.pro_b_points,
            В: data.pro_v_points,
            Г: data.pro_g_points,
            Д: data.pro_d_points,
        },
        unknown: data.unknown_points,
        free: data.free_points,
    };
}
function calcPoints(ind, w) {
    let p = 0;
    if (ind.rez)
        p += w.rez;
    p += w.pro[ind.pro ?? ''] ?? 0;
    if (ind.unknown)
        p += w.unknown;
    if (ind.free)
        p += w.free;
    return p;
}
function buildReason(ind, w, comment) {
    const parts = [];
    if (ind.rez)
        parts.push('результативность');
    if ((w.pro[ind.pro ?? ''] ?? 0) > 0)
        parts.push('проактивность');
    if (ind.unknown)
        parts.push('благодарности');
    if (ind.free)
        parts.push(comment ? `дополнительно (${comment})` : 'дополнительно');
    return 'Начисление баллов за: ' + (parts.join(', ') || '—');
}
function xmlEscape(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function monthKey() {
    const d = new Date(Date.now() + 3 * 3600 * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
async function ispringToken() {
    const r = await fetch(`https://${process.env.ISPRING_DOMAIN}/api/v3/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.ISPRING_CLIENT_ID,
            client_secret: process.env.ISPRING_CLIENT_SECRET,
        }),
    });
    if (!r.ok)
        throw new Error(`ispring token ${r.status}: ${(await r.text()).slice(0, 120)}`);
    return (await r.json()).access_token;
}
// Хост геймификации захардкожен — как в рабочем ispring-rewards.ts (env тут не тот домен).
const GAMI_HOST = 'api-learn.ispringlearn.ru';
async function awardOne(token, ispringUserId, amount, reason) {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<awardGamificationPoints>
    <userId>${ispringUserId}</userId>
    <amount>${amount}</amount>
    <reason>${xmlEscape(reason)}</reason>
</awardGamificationPoints>`;
    const r = await fetch(`https://${GAMI_HOST}/gamification/points/award`, {
        method: 'POST',
        headers: {
            Authorization: token,
            'Content-Type': 'application/xml',
            Accept: 'application/xml',
            'User-Agent': 'curl/8.0.1',
        },
        body,
    });
    const text = await r.text();
    if (!r.ok)
        throw new Error(`award ${r.status}: ${text.slice(0, 200)}`);
    return `HTTP ${r.status} :: ${text.slice(0, 160) || '(пустое тело)'}`;
}
async function pushPending(sb, periodId, w, res) {
    const { data: ents } = await sb
        .from('award_entries')
        .select('*')
        .eq('period_id', periodId)
        .in('ispring_status', ['pending', 'failed']);
    let sent = 0, failed = 0;
    let lastError = '';
    const ispringResponses = [];
    if (ents && ents.length) {
        let token;
        try {
            token = await ispringToken();
        }
        catch (e) {
            return res
                .status(500)
                .json({
                error: 'ISPRING TOKEN: ' + String(e?.message || e),
            });
        }
        for (const e of ents) {
            try {
                const resp = await awardOne(token, e.employee_ispring_id, e.points, buildReason(e.indicators, w, e.comment));
                ispringResponses.push({ userId: e.employee_ispring_id, result: resp });
                await sb
                    .from('award_entries')
                    .update({
                    ispring_status: 'sent',
                    sent_at: new Date().toISOString(),
                    ispring_error: null,
                })
                    .eq('id', e.id);
                sent++;
            }
            catch (err) {
                lastError = String(err?.message || err);
                ispringResponses.push({
                    userId: e.employee_ispring_id,
                    result: 'ERR ' + lastError,
                });
                await sb
                    .from('award_entries')
                    .update({ ispring_status: 'failed', ispring_error: lastError })
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
        .json({
        ok: failed === 0,
        sent,
        failed,
        remaining: remaining || 0,
        lastError: lastError || undefined,
        ispringResponses,
    });
}
async function handler(req, res) {
    if (req.method !== 'POST')
        return res.status(405).json({ error: 'method not allowed' });
    try {
        const tok = req.cookies?.['admin-session'];
        if (!tok)
            return res.status(401).json({ error: 'unauthorized' });
        let userId, role;
        try {
            const { payload } = await (0, jose_1.jwtVerify)(tok, new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || ''));
            userId = payload.sub;
            role = payload.role;
        }
        catch {
            return res.status(401).json({ error: 'unauthorized' });
        }
        if (role !== 'manager')
            return res.status(403).json({ error: 'forbidden' });
        const { departmentId, awards } = (req.body || {});
        if (!departmentId)
            return res.status(400).json({ error: 'no departmentId' });
        const sb = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
        const { data: u } = await sb
            .from('users')
            .select('ispring_user_id')
            .eq('id', userId)
            .maybeSingle();
        const ispringId = u?.ispring_user_id;
        if (!ispringId)
            return res.status(403).json({ error: 'forbidden (no ispring id)' });
        const { data: dep } = await sb
            .from('org_departments')
            .select('supervisor_ispring_id')
            .eq('department_id', departmentId)
            .maybeSingle();
        if (!dep || dep.supervisor_ispring_id !== ispringId)
            return res.status(403).json({ error: 'forbidden (not your dept)' });
        const { data: allowed } = await sb
            .from('available_departments')
            .select('department_id')
            .eq('department_id', departmentId)
            .maybeSingle();
        if (!allowed)
            return res.status(403).json({ error: 'forbidden (not allowed dept)' });
        const w = await loadWeights(sb);
        const month = monthKey();
        const { data: existing } = await sb
            .from('award_periods')
            .select('id')
            .eq('department_id', departmentId)
            .eq('period_month', month)
            .maybeSingle();
        if (existing)
            return await pushPending(sb, existing.id, w, res);
        if (!Array.isArray(awards) || awards.length === 0)
            return res.status(400).json({ error: 'no awards' });
        const { data: roster } = await sb
            .from('org_users')
            .select('ispring_user_id')
            .eq('department_id', departmentId)
            .eq('status', 1);
        const rosterSet = new Set((roster || []).map((r) => r.ispring_user_id));
        const budget = rosterSet.size * w.budgetPerHead;
        const entries = [];
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
            if (ind.pro && !(ind.pro in w.pro))
                return res.status(400).json({ error: `bad pro value: ${ind.pro}` });
            const points = calcPoints(ind, w);
            if (points <= 0)
                continue;
            if (points > w.maxPerEmployee)
                return res
                    .status(400)
                    .json({ error: `more than ${w.maxPerEmployee} per employee` });
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
            if (perr.code === '23505')
                return res.status(409).json({ error: 'already submitted this month' });
            return res.status(500).json({ error: 'PERIOD INSERT: ' + perr.message });
        }
        const rows = entries.map((e) => ({
            ...e,
            period_id: period.id,
            ispring_status: 'pending',
        }));
        const { error: eerr } = await sb.from('award_entries').insert(rows);
        if (eerr)
            return res
                .status(500)
                .json({
                error: 'ENTRIES INSERT: ' + eerr.message,
                periodId: period.id,
            });
        return await pushPending(sb, period.id, w, res);
    }
    catch (e) {
        console.error('award:', e);
        return res
            .status(500)
            .json({ error: 'SERVER: ' + String(e?.message || e) });
    }
}
