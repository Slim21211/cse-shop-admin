// api/session.ts — обмен handoff-токена магазина на сессию админки.
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

  const token = typeof req.body?.t === 'string' ? req.body.t : '';
  if (!token) return res.status(400).json({ error: 'no token' });

  let userId: string;
  try {
    ({ userId } = await verifyHandoff(token)); // проверка подписи + срока + iss/aud
  } catch {
    return res.status(401).json({ error: 'invalid handoff token' });
  }

  // Роль решает СЕРВЕР по проверенному userId — не клиент, не URL.
  const role = await resolveRole(userId);
  if (!role) return res.status(403).json({ error: 'no access' });

  const session = await signSession(userId, role);
  setSessionCookie(res, session);
  return res.status(200).json({ role });
}
