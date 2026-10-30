"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const jose_1 = require("jose");
const supabase_js_1 = require("@supabase/supabase-js");
function monthKey() {
    const d = new Date(Date.now() + 3 * 3600 * 1000); // Москва UTC+3
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
async function handler(req, res) {
    try {
        const token = req.cookies?.['admin-session'];
        if (!token)
            return res.status(401).json({ error: 'unauthorized' });
        let userId, role;
        try {
            const { payload } = await (0, jose_1.jwtVerify)(token, new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || ''));
            userId = payload.sub;
            role = payload.role;
        }
        catch {
            return res.status(401).json({ error: 'unauthorized' });
        }
        if (role !== 'manager')
            return res.status(403).json({ error: 'forbidden' });
        const sb = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });
        const { data: u } = await sb
            .from('users')
            .select('ispring_user_id')
            .eq('id', userId)
            .maybeSingle();
        const ispringId = u?.ispring_user_id;
        if (!ispringId)
            return res.status(200).json({ departments: [] });
        const { data: deps } = await sb
            .from('org_departments')
            .select('department_id, name, code')
            .eq('supervisor_ispring_id', ispringId);
        const ids = (deps || []).map((d) => d.department_id);
        if (!ids.length)
            return res.status(200).json({ departments: [] });
        const { data: allowed } = await sb
            .from('available_departments')
            .select('department_id')
            .in('department_id', ids);
        const allowedSet = new Set((allowed || []).map((a) => a.department_id));
        const mine = (deps || []).filter((d) => allowedSet.has(d.department_id));
        // бюджет на человека — из award_settings (посчитан базой)
        const { data: settings, error: serr } = await sb
            .from('award_settings')
            .select('budget_per_head')
            .eq('id', true)
            .maybeSingle();
        if (serr || !settings) {
            console.error('manager/departments: award_settings', serr?.message);
            return res.status(500).json({ error: 'server error' });
        }
        const month = monthKey();
        const departments = [];
        for (const d of mine) {
            const { count } = await sb
                .from('org_users')
                .select('ispring_user_id', { count: 'exact', head: true })
                .eq('department_id', d.department_id)
                .eq('status', 1);
            const headcount = count || 0;
            const { data: period } = await sb
                .from('award_periods')
                .select('id')
                .eq('department_id', d.department_id)
                .eq('period_month', month)
                .maybeSingle();
            departments.push({
                departmentId: d.department_id,
                name: d.name,
                code: d.code,
                headcount,
                budget: headcount * settings.budget_per_head,
                submittedThisMonth: !!period,
            });
        }
        return res.status(200).json({ departments });
    }
    catch (e) {
        console.error('manager/departments:', e);
        return res.status(500).json({ error: 'server error' });
    }
}
