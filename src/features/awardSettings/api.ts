// Настройки начисления баллов — api/award-settings.ts (таблица award_settings).
// Баллы (points) считает база, в форме редактируются только pct и desc.

export type Pro = 'А' | 'Б' | 'В' | 'Г' | 'Д';
export const PRO_OPTS: Pro[] = ['А', 'Б', 'В', 'Г', 'Д'];

export interface Indicator {
  pct: number;
  points: number;
  desc: string;
}

export interface AwardSettings {
  maxPerEmployee: number;
  budgetPct: number;
  budgetPerHead: number;
  rez: Indicator;
  unknown: Indicator;
  free: Indicator;
  pro: { desc: string; levels: Record<Pro, Indicator> };
  updatedAt: string;
}

async function request(init?: RequestInit): Promise<AwardSettings> {
  const r = await fetch('/api/award-settings', init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
  return body as AwardSettings;
}

export const fetchAwardSettings = () => request();

export const saveAwardSettings = (s: AwardSettings) =>
  request({
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s),
  });
