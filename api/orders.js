"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const jose_1 = require("jose");
const supabase_js_1 = require("@supabase/supabase-js");
async function handler(req, res) {
    if (req.method !== 'GET')
        return res.status(405).json({ message: 'method not allowed' });
    // --- гард: только залогиненный админ ---
    try {
        const t = req.cookies?.['admin-session'];
        if (!t)
            return res.status(401).json({ error: 'unauthorized' });
        const { payload } = await (0, jose_1.jwtVerify)(t, new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || ''));
        if (payload.role !== 'admin')
            return res.status(403).json({ error: 'forbidden' });
    }
    catch {
        return res.status(401).json({ error: 'unauthorized' });
    }
    try {
        const sb = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
        const { data, error } = await sb
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false });
        if (error)
            return res.status(500).json({ message: error.message });
        return res.status(200).json(data);
    }
    catch (e) {
        console.error('orders:', e);
        return res
            .status(500)
            .json({ message: 'SERVER: ' + String(e?.message || e) });
    }
}
