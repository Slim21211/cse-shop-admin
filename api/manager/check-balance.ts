// api/manager/check-balance.ts — баланс по id (хост геймификации = api-${ISPRING_API_DOMAIN}).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';

function gamiHost(): string {
  const d = (process.env.ISPRING_API_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  return d.startsWith('api-') ? d : `api-${d}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const tok = req.cookies?.['admin-session'];
    if (!tok) return res.status(401).json({ error: 'unauthorized' });
    try {
      await jwtVerify(
        tok,
        new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || '')
      );
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ error: 'no userId' });

    const tr = await fetch(
      `https://${process.env.ISPRING_DOMAIN}/api/v3/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.ISPRING_CLIENT_ID!,
          client_secret: process.env.ISPRING_CLIENT_SECRET!,
        }),
      }
    );
    if (!tr.ok) return res.status(500).json({ error: `token ${tr.status}` });
    const token = ((await tr.json()) as { access_token: string }).access_token;

    const br = await fetch(
      `https://${gamiHost()}/gamification/points?userIds=${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: token, Accept: 'application/xml' },
      }
    );
    const raw = await br.text();
    const m = raw.match(/<points>(\d+)<\/points>/);
    return res
      .status(200)
      .json({
        userId,
        host: gamiHost(),
        httpStatus: br.status,
        balance: m ? Number(m[1]) : null,
        raw: raw.slice(0, 400),
      });
  } catch (e) {
    return res
      .status(500)
      .json({ error: 'server: ' + String((e as Error)?.message || e) });
  }
}
