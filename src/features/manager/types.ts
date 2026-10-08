import { useEffect } from 'react';

export const T = {
  font: "'Inter', system-ui, -apple-system, sans-serif",
  accent: '#4F46E5',
  accentSoft: '#EEF0FF',
  ink: '#1A1A24',
  muted: '#6B7280',
  line: '#E8E8EF',
  ok: '#16A34A',
  okSoft: '#E9F8EF',
  danger: '#DC2626',
  surface: '#FFFFFF',
  bg: '#F7F7FB',
  radius: 14,
  shadow: '0 1px 2px rgba(16,24,40,.04), 0 6px 20px rgba(16,24,40,.06)',
};

export function useFont() {
  useEffect(() => {
    const id = 'inter-font-mgr';
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id;
    l.rel = 'stylesheet';
    l.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }, []);
}

export interface Department {
  departmentId: string;
  name: string;
  code: string;
  headcount: number;
  budget: number;
  submittedThisMonth: boolean;
}

export interface Employee {
  ispringUserId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
}

export type Pro = 'А' | 'Б' | 'В' | 'Г' | 'Д';

export interface Row {
  rez: boolean;
  pro: Pro;
  unknown: boolean;
  free: boolean;
  comment: string;
}

export type SubmitPhase = 'confirm' | 'loading' | 'success' | 'error';

export const PRO_POINTS: Record<Pro, number> = {
  А: 0,
  Б: 5,
  В: 10,
  Г: 15,
  Д: 20,
};
export const PRO_OPTS: Pro[] = ['А', 'Б', 'В', 'Г', 'Д'];

export const emptyRow = (): Row => ({
  rez: false,
  pro: 'А',
  unknown: false,
  free: false,
  comment: '',
});

export const rowPoints = (r: Row) =>
  (r.rez ? 60 : 0) +
  PRO_POINTS[r.pro] +
  (r.unknown ? 10 : 0) +
  (r.free ? 10 : 0);
