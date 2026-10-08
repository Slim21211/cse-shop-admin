// api/session.ts — САМОДОСТАТОЧНАЯ диагностическая версия: без импорта ./_auth.
// Вся логика (jose, supabase, env) внутри файла, всё обёрнуто в try/catch с выводом причины.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SignJWT, jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'method not allowed' });

  try {
    const need = (n: string): string => {
      const v = process.env[n];
      if (!v) throw new Error(`Missing env ${n}`);
      return v;
    };

    const token = typeof req.body?.t === 'string' ? req.body.t : '';
    if (!token) return res.status(400).json({ error: 'no token' });

    // 1) проверка пропуска
    let userId: string;
    try {
      const HANDOFF = new TextEncoder().encode(need('HANDOFF_SECRET'));
      const { payload } = await jwtVerify(token, HANDOFF, {
        issuer: 'shop',
        audience: 'admin',
      });
      if (!payload.sub) throw new Error('no sub in token');
      userId = payload.sub;
    } catch (e) {
      return res
        .status(401)
        .json({
          error: 'invalid handoff token',
          detail: String((e as Error)?.message || e),
        });
    }

    // 2) роль через supabase
    let isAdmin = false;
    try {
      const sb = createClient(
        need('SUPABASE_URL'),
        need('SUPABASE_SERVICE_ROLE_KEY'),
        {
          auth: { persistSession: false },
        }
      );
      const { data, error } = await sb
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      isAdmin = !!data;
    } catch (e) {
      return res
        .status(500)
        .json({
          error: 'resolveRole failed',
          userId,
          detail: String((e as Error)?.message || e),
        });
    }

    if (!isAdmin) return res.status(403).json({ error: 'no access', userId });

    // 3) сессия
    const SESSION = new TextEncoder().encode(need('ADMIN_SESSION_SECRET'));
    const jwt = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime('28800s')
      .sign(SESSION);
    res.setHeader(
      'Set-Cookie',
      `admin-session=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
    );
    return res.status(200).json({ role: 'admin' });
  } catch (e) {
    return res
      .status(500)
      .json({
        error: 'server error',
        detail: String((e as Error)?.stack || (e as Error)?.message || e),
      });
  }
}
