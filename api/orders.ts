// api/orders.ts — список заказов для админки (вместе с отменёнными). Только админ.
// Таблица orders закрыта RLS, поэтому читаем её service-role ключом на сервере. Самодостаточный.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET')
    return res.status(405).json({ message: 'method not allowed' });

  // --- гард: только залогиненный админ ---
  try {
    const t = req.cookies?.['admin-session'];
    if (!t) return res.status(401).json({ error: 'unauthorized' });
    const { payload } = await jwtVerify(
      t,
      new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || '')
    );
    if ((payload as { role?: string }).role !== 'admin')
      return res.status(403).json({ error: 'forbidden' });
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data, error } = await sb
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    return res.status(200).json(data);
  } catch (e) {
    console.error('orders:', e);
    return res
      .status(500)
      .json({ message: 'SERVER: ' + String((e as Error)?.message || e) });
  }
}
