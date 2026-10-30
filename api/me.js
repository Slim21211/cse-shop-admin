"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const jose_1 = require("jose");
const supabase_js_1 = require("@supabase/supabase-js");
async function handler(req, res) {
    try {
        const token = req.cookies?.['admin-session'];
        if (!token)
            return res.status(401).json({ error: 'unauthorized' });
        const secret = new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || '');
        const { payload } = await (0, jose_1.jwtVerify)(token, secret);
        const userId = payload.sub;
        // ключевая проверка: жив ли вход в магазине
        const sb = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        });
        const { data, error } = await sb
            .from('users')
            .select('logged_out_at')
            .eq('id', userId)
            .maybeSingle();
        if (error) {
            console.error('users check failed:', error.message);
            return res.status(500).json({ error: 'server error' });
        }
        if (!data || data.logged_out_at) {
            return res.status(401).json({ error: 'shop session ended' });
        }
        return res
            .status(200)
            .json({ userId, role: payload.role });
    }
    catch {
        return res.status(401).json({ error: 'unauthorized' });
    }
}
