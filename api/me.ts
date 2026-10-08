// api/me.ts — текущая сессия (для бутстрапа фронта). 401, если не авторизован.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readSession } from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const s = await readSession(req);
  if (!s) return res.status(401).json({ error: 'unauthorized' });
  return res.status(200).json({ userId: s.sub, role: s.role });
}
