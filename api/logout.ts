// api/logout.ts — самодостаточная версия. Гасит куку сессии.
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader(
    'Set-Cookie',
    'admin-session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
  );
  return res.status(200).json({ ok: true });
}
