"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const jose_1 = require("jose");
const supabase_js_1 = require("@supabase/supabase-js");
const BUCKET = 'product-images';
const isNonNegativeInt = (v) => Number.isInteger(v) && v >= 0;
const isOptionalString = (v) => v === null || typeof v === 'string';
const OPTIONAL_FIELDS = ['size', 'old_price', 'description', 'image_urls'];
// Пропускаем только известные поля и проверяем типы, чтобы через ручку нельзя было
// записать в таблицу что-то лишнее или отрицательную цену
function pickProduct(body, partial) {
    const data = {};
    const checks = [
        ['name', (v) => typeof v === 'string' && v.trim().length > 0],
        ['size', isOptionalString],
        ['price', isNonNegativeInt],
        ['old_price', (v) => v === null || isNonNegativeInt(v)],
        ['description', isOptionalString],
        ['remains', isNonNegativeInt],
        [
            'image_urls',
            (v) => v === null ||
                (Array.isArray(v) && v.length <= 3 && v.every((u) => typeof u === 'string')),
        ],
        ['is_gift', (v) => typeof v === 'boolean'],
    ];
    for (const [key, isValid] of checks) {
        if (body[key] === undefined) {
            if (!partial && !OPTIONAL_FIELDS.includes(key))
                return { error: `поле ${key} обязательно` };
            continue;
        }
        if (!isValid(body[key]))
            return { error: `некорректное поле ${key}` };
        data[key] = body[key];
    }
    return { data };
}
async function handler(req, res) {
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
        const body = (req.body || {});
        if (req.method === 'GET') {
            const { data, error } = await sb
                .from('products')
                .select('*')
                .eq('is_gift', req.query.is_gift === 'true')
                // Без явной сортировки Postgres отдаёт строки в произвольном порядке
                // (изменённый товар «уезжает»), поэтому фиксируем: дороже — выше
                .order('price', { ascending: false })
                .order('id', { ascending: true });
            if (error)
                return res.status(500).json({ message: error.message });
            return res.status(200).json(data);
        }
        // Подписанная ссылка: браузер загружает файл сам, но только по выданному пути
        if (req.method === 'POST' && body.action === 'upload-url') {
            if (typeof body.fileName !== 'string' || !body.fileName)
                return res.status(400).json({ message: 'нет имени файла' });
            const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
            const path = `products/${Date.now()}_${safeName}`;
            const { data, error } = await sb.storage
                .from(BUCKET)
                .createSignedUploadUrl(path);
            if (error)
                return res.status(500).json({ message: error.message });
            const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
            return res
                .status(200)
                .json({ path: data.path, token: data.token, publicUrl: pub.publicUrl });
        }
        if (req.method === 'POST') {
            const picked = pickProduct(body, false);
            if ('error' in picked)
                return res.status(400).json({ message: picked.error });
            const { error } = await sb.from('products').insert([picked.data]);
            if (error)
                return res.status(500).json({ message: error.message });
            return res.status(201).json({ ok: true });
        }
        const id = Number(body.id);
        if (!Number.isInteger(id) || id <= 0)
            return res.status(400).json({ message: 'нет id товара' });
        if (req.method === 'PATCH') {
            const picked = pickProduct(body, true);
            if ('error' in picked)
                return res.status(400).json({ message: picked.error });
            const { error } = await sb.from('products').update(picked.data).eq('id', id);
            if (error)
                return res.status(500).json({ message: error.message });
            return res.status(200).json({ ok: true });
        }
        if (req.method === 'DELETE') {
            const { error } = await sb.from('products').delete().eq('id', id);
            if (error)
                return res.status(500).json({ message: error.message });
            return res.status(200).json({ ok: true });
        }
        return res.status(405).json({ message: 'method not allowed' });
    }
    catch (e) {
        console.error('products:', e);
        return res
            .status(500)
            .json({ message: 'SERVER: ' + String(e?.message || e) });
    }
}
