// api/_auth.ts — общие помощники авторизации для serverless-функций админки (@vercel/node)
// Всё, что связано с проверкой личности и прав, живёт ЗДЕСЬ (на сервере), не на клиенте.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { createClient } from '@supabase/supabase-js';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const HANDOFF_SECRET = new TextEncoder().encode(env('HANDOFF_SECRET')); // общий секрет с магазином
const SESSION_SECRET = new TextEncoder().encode(env('ADMIN_SESSION_SECRET')); // секрет сессии админки
const SESSION_COOKIE = 'admin-session';
const SESSION_TTL_SEC = 8 * 60 * 60; // 8 часов

// Сервисный клиент Supabase — ТОЛЬКО на сервере (service_role, не анонимный ключ фронта).
export const supabaseAdmin = createClient(
  env('SUPABASE_URL'),
  env('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } }
);

export type Role = 'admin' | 'manager';
export interface SessionClaims extends JWTPayload {
  sub: string; // userId iSpring
  role: Role;
}

// --- handoff-токен из магазина (короткоживущий, подписан общим секретом) ---
export async function verifyHandoff(
  token: string
): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, HANDOFF_SECRET, {
    issuer: 'shop',
    audience: 'admin',
  });
  if (!payload.sub) throw new Error('handoff without sub');
  return { userId: payload.sub };
}

// --- сессия админки (своя кука на домене админки) ---
export async function signSession(userId: string, role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(SESSION_SECRET);
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SEC}`
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  );
}

export async function readSession(
  req: VercelRequest
): Promise<SessionClaims | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

// Гард для защищённых ручек: либо возвращает claims, либо сам отвечает 401/403 и возвращает null.
export async function requireSession(
  req: VercelRequest,
  res: VercelResponse,
  role?: Role
): Promise<SessionClaims | null> {
  const s = await readSession(req);
  if (!s) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  if (role && s.role !== role) {
    res.status(403).json({ error: 'forbidden' });
    return null;
  }
  return s;
}

// Роль по userId. Сейчас: admin по таблице admins (по колонке user_id).
// Позже сюда добавится ветка manager (supervisor из кэша оргструктуры).
export async function resolveRole(userId: string): Promise<Role | null> {
  const { data } = await supabaseAdmin
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (data) return 'admin';
  // TODO(managers): if (await isSupervisor(userId)) return 'manager';
  return null;
}
