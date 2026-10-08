// api/manager/employees.ts — активные сотрудники отдела (с проверкой, что отдел — его и разрешён).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

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

    const departmentId = String(req.query.departmentId || '');
    if (!departmentId)
      return res.status(400).json({ error: 'no departmentId' });

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
    if (!ispringId) return res.status(403).json({ error: 'forbidden' });

    // отдел должен быть его И в разрешённых
    const { data: dep } = await sb
      .from('org_departments')
      .select('department_id, supervisor_ispring_id')
      .eq('department_id', departmentId)
      .maybeSingle();
    if (!dep || dep.supervisor_ispring_id !== ispringId)
      return res.status(403).json({ error: 'forbidden' });
    const { data: allowed } = await sb
      .from('available_departments')
      .select('department_id')
      .eq('department_id', departmentId)
      .maybeSingle();
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    const { data: emps } = await sb
      .from('org_users')
      .select('ispring_user_id, first_name, last_name, job_title')
      .eq('department_id', departmentId)
      .eq('status', 1)
      .order('last_name');

    const employees = (emps || []).map(
      (e: {
        ispring_user_id: string;
        first_name: string;
        last_name: string;
        job_title: string;
      }) => ({
        ispringUserId: e.ispring_user_id,
        firstName: e.first_name,
        lastName: e.last_name,
        jobTitle: e.job_title,
      })
    );
    return res.status(200).json({ employees });
  } catch (e) {
    console.error('manager/employees:', e);
    return res.status(500).json({ error: 'server error' });
  }
}
