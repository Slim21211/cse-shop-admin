// АДМИНКА: api/me.ts — проверяет сессию админки И что пользователь ещё залогинен в магазине.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = req.cookies?.['admin-session'];
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const secret = new TextEncoder().encode(
      process.env.ADMIN_SESSION_SECRET || ''
    );
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;

    // ключевая проверка: жив ли вход в магазине
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );
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
      .json({ userId, role: (payload as { role?: string }).role });
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}
