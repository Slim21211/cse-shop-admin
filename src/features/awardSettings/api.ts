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
  /** срок начисления: с awardStartDay по awardEndDay число каждого месяца (по Москве) */
  awardStartDay: number;
  awardEndDay: number;
  budgetPct: number;
  budgetPerHead: number;
  rez: Indicator;
  unknown: Indicator;
  free: Indicator;
  pro: { desc: string; levels: Record<Pro, Indicator> };
  updatedAt: string;
}

const MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];
const MONTHS_ACC = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

/**
 * Срок начисления на сегодня (по Москве, как на сервере в api/manager/award.ts).
 * Тексты — для подсказки руководителю, сервер проверяет срок сам.
 */
export function awardWindow(s: AwardSettings, now = new Date()) {
  const msk = new Date(now.getTime() + 3 * 3600 * 1000);
  const day = msk.getUTCDate();
  const month = msk.getUTCMonth();
  const next = (month + 1) % 12;
  return {
    open: day >= s.awardStartDay && day <= s.awardEndDay,
    notYet: day < s.awardStartDay,
    /** «10 ноября» */
    deadline: `${s.awardEndDay} ${MONTHS_GEN[month]}`,
    /** «1 ноября» */
    start: `${s.awardStartDay} ${MONTHS_GEN[month]}`,
    /** «1 декабря» */
    nextStart: `${s.awardStartDay} ${MONTHS_GEN[next]}`,
    /** «10 декабря» */
    nextDeadline: `${s.awardEndDay} ${MONTHS_GEN[next]}`,
    /** «ноябрь» */
    monthName: MONTHS_ACC[month],
  };
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
