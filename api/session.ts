// api/session.ts — ФИНАЛ. Самодостаточный (без ./_auth), без утечки деталей ошибок наружу.
// Меняет handoff-пропуск магазина на сессию админки. Роль решает сервер.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SignJWT, jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

const SESSION_TTL_SEC = 8 * 60 * 60; // 8 часов

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'method not allowed' });

  try {
    const token = typeof req.body?.t === 'string' ? req.body.t : '';
    if (!token) return res.status(400).json({ error: 'no token' });

    // 1) проверка пропуска из магазина
    let userId: string; // это users.id из магазина
    try {
      const handoffSecret = new TextEncoder().encode(
        process.env.HANDOFF_SECRET!
      );
      const { payload } = await jwtVerify(token, handoffSecret, {
        issuer: 'shop',
        audience: 'admin',
      });
      if (!payload.sub) throw new Error('no sub');
      userId = payload.sub;
    } catch {
      return res.status(401).json({ error: 'invalid handoff token' });
    }

    // 2) роль. Пока только admin по таблице admins (ключ = users.id).
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );
    const { data, error } = await sb
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('admins query failed:', error.message);
      return res.status(500).json({ error: 'server error' });
    }
    const role: 'admin' | 'manager' | null = data ? 'admin' : null;
    // TODO(managers): если не admin — по users.ispring_user_id проверить, руководитель ли он
    //   (кэш оргструктуры), и тогда role = 'manager'.

    if (!role) return res.status(403).json({ error: 'no access' });

    // 3) своя сессия админки
    const sessionSecret = new TextEncoder().encode(
      process.env.ADMIN_SESSION_SECRET!
    );
    const jwt = await new SignJWT({ role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${SESSION_TTL_SEC}s`)
      .sign(sessionSecret);
    res.setHeader(
      'Set-Cookie',
      `admin-session=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SEC}`
    );
    return res.status(200).json({ role });
  } catch (e) {
    console.error('session error:', e);
    return res.status(500).json({ error: 'server error' });
  }
}
