import { createContext, useContext, useEffect } from 'react';
import { type AwardSettings, type Pro, PRO_OPTS } from '../awardSettings/api';

export { type Pro, PRO_OPTS };

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

export interface Row {
  rez: boolean;
  pro: Pro;
  unknown: boolean;
  free: boolean;
  comment: string;
}

export type SubmitPhase = 'confirm' | 'loading' | 'success' | 'error';

// Баллы за показатели и подсказки — из award_settings, загружаются в ManagerPanel.
export const AwardSettingsContext = createContext<AwardSettings | null>(null);

export function useAwardSettings(): AwardSettings {
  const v = useContext(AwardSettingsContext);
  if (!v) throw new Error('useAwardSettings must be used within ManagerPanel');
  return v;
}

export const emptyRow = (): Row => ({
  rez: false,
  pro: 'А',
  unknown: false,
  free: false,
  comment: '',
});

export const rowPoints = (r: Row, s: AwardSettings) =>
  (r.rez ? s.rez.points : 0) +
  s.pro.levels[r.pro].points +
  (r.unknown ? s.unknown.points : 0) +
  (r.free ? s.free.points : 0);
