// api/session.ts — ВРЕМЕННАЯ диагностическая версия: любую ошибку возвращает текстом,
// чтобы было видно реальную причину 500. После починки вернём обычную.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  verifyHandoff,
  resolveRole,
  signSession,
  setSessionCookie,
} from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'method not allowed' });

  try {
    const token = typeof req.body?.t === 'string' ? req.body.t : '';
    if (!token) return res.status(400).json({ error: 'no token' });

    let userId: string;
    try {
      ({ userId } = await verifyHandoff(token));
    } catch (e) {
      return res
        .status(401)
        .json({
          error: 'invalid handoff token',
          detail: String((e as Error)?.message || e),
        });
    }

    let role;
    try {
      role = await resolveRole(userId);
    } catch (e) {
      // сюда попадёт, если падает запрос в Supabase (таблица/колонка/ключ)
      return res.status(500).json({
        error: 'resolveRole failed',
        userId,
        detail: String((e as Error)?.message || e),
      });
    }

    if (!role) return res.status(403).json({ error: 'no access', userId });

    const session = await signSession(userId, role);
    setSessionCookie(res, session);
    return res.status(200).json({ role });
  } catch (e) {
    return res.status(500).json({
      error: 'server error',
      detail: String((e as Error)?.stack || (e as Error)?.message || e),
    });
  }
}
