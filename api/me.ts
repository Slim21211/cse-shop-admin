// api/me.ts — самодостаточная версия (без ./_auth). Читает сессию из куки.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = req.cookies?.['admin-session'];
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    const secret = new TextEncoder().encode(
      process.env.ADMIN_SESSION_SECRET || ''
    );
    const { payload } = await jwtVerify(token, secret);
    return res
      .status(200)
      .json({ userId: payload.sub, role: (payload as { role?: string }).role });
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}
