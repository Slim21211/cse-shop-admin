// api/manager/departments.ts — + признак "уже начислено в этом месяце".
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

function monthKey(): string {
  const d = new Date(Date.now() + 3 * 3600 * 1000); // Москва UTC+3
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const token = req.cookies?.['admin-session'];
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    let userId: string, role: string | undefined;
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || '')
      );
      userId = payload.sub as string;
      role = (payload as { role?: string }).role;
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (role !== 'manager') return res.status(403).json({ error: 'forbidden' });

    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );

    const { data: u } = await sb
      .from('users')
      .select('ispring_user_id')
      .eq('id', userId)
      .maybeSingle();
    const ispringId = u?.ispring_user_id;
    if (!ispringId) return res.status(200).json({ departments: [] });

    const { data: deps } = await sb
      .from('org_departments')
      .select('department_id, name, code')
      .eq('supervisor_ispring_id', ispringId);
    const ids = (deps || []).map(
      (d: { department_id: string }) => d.department_id
    );
    if (!ids.length) return res.status(200).json({ departments: [] });

    const { data: allowed } = await sb
      .from('available_departments')
      .select('department_id')
      .in('department_id', ids);
    const allowedSet = new Set(
      (allowed || []).map((a: { department_id: string }) => a.department_id)
    );
    const mine = (deps || []).filter((d: { department_id: string }) =>
      allowedSet.has(d.department_id)
    );

    const month = monthKey();
    const departments = [];
    for (const d of mine as {
      department_id: string;
      name: string;
      code: string;
    }[]) {
      const { count } = await sb
        .from('org_users')
        .select('ispring_user_id', { count: 'exact', head: true })
        .eq('department_id', d.department_id)
        .eq('status', 1);
      const headcount = count || 0;

      const { data: period } = await sb
        .from('award_periods')
        .select('id')
        .eq('department_id', d.department_id)
        .eq('period_month', month)
        .maybeSingle();

      departments.push({
        departmentId: d.department_id,
        name: d.name,
        code: d.code,
        headcount,
        budget: headcount * 70,
        submittedThisMonth: !!period,
      });
    }
    return res.status(200).json({ departments });
  } catch (e) {
    console.error('manager/departments:', e);
    return res.status(500).json({ error: 'server error' });
  }
}
