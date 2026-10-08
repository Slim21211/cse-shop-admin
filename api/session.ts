// api/session.ts — + ветка manager. Самодостаточный.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SignJWT, jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

const SESSION_TTL_SEC = 60 * 60; // 1 час (если у тебя стоит другое значение — оставь своё)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'method not allowed' });

  try {
    const token = typeof req.body?.t === 'string' ? req.body.t : '';
    if (!token) return res.status(400).json({ error: 'no token' });

    // 1) пропуск из магазина -> userId (= users.id)
    let userId: string;
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

    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );

    let role: 'admin' | 'manager' | null = null;

    // 2a) админ? (admins.user_id = users.id)
    {
      const { data, error } = await sb
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.error('admins query failed:', error.message);
        return res.status(500).json({ error: 'server error' });
      }
      if (data) role = 'admin';
    }

    // 2b) иначе руководитель? есть разрешённый отдел, где он supervisor
    if (!role) {
      const { data: u, error: ue } = await sb
        .from('users')
        .select('ispring_user_id')
        .eq('id', userId)
        .maybeSingle();
      if (ue) {
        console.error('users lookup failed:', ue.message);
        return res.status(500).json({ error: 'server error' });
      }
      const ispringId = u?.ispring_user_id;
      if (ispringId) {
        const { data: deps } = await sb
          .from('org_departments')
          .select('department_id')
          .eq('supervisor_ispring_id', ispringId);
        const ids = (deps || []).map(
          (d: { department_id: string }) => d.department_id
        );
        if (ids.length) {
          const { data: allowed } = await sb
            .from('available_departments')
            .select('department_id')
            .in('department_id', ids);
          if (allowed && allowed.length) role = 'manager';
        }
      }
    }

    if (!role) return res.status(403).json({ error: 'no access' });

    // 3) сессия
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
