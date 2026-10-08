// api/logout.ts — выход: гасим куку сессии.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie } from './_auth.js';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
