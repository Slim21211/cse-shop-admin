// api/_auth.ts — env читается ЛЕНИВО (при вызове, не при импорте), чтобы отсутствие
// переменной давало читаемую ошибку в ответе, а не генерик FUNCTION_INVOCATION_FAILED.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const SESSION_COOKIE = 'admin-session';
const SESSION_TTL_SEC = 8 * 60 * 60; // 8 часов

// Ленивые секреты и клиент — ничего не читаем на этапе импорта модуля.
function handoffSecret() {
  return new TextEncoder().encode(env('HANDOFF_SECRET'));
}
function sessionSecret() {
  return new TextEncoder().encode(env('ADMIN_SESSION_SECRET'));
}

let _sb: SupabaseClient | null = null;
function supa(): SupabaseClient {
  if (!_sb) {
    _sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });
  }
  return _sb;
}

export type Role = 'admin' | 'manager';
export interface SessionClaims extends JWTPayload {
  sub: string;
  role: Role;
}

export async function verifyHandoff(
  token: string
): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, handoffSecret(), {
    issuer: 'shop',
    audience: 'admin',
  });
  if (!payload.sub) throw new Error('handoff without sub');
  return { userId: payload.sub };
}

export async function signSession(userId: string, role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(sessionSecret());
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
    const { payload } = await jwtVerify(token, sessionSecret());
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

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

export async function resolveRole(userId: string): Promise<Role | null> {
  const { data, error } = await supa()
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`supabase admins query: ${error.message}`);
  if (data) return 'admin';
  // TODO(managers): проверка supervisor из кэша оргструктуры -> 'manager'
  return null;
}
