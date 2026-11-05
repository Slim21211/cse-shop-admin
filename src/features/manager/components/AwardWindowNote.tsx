import { Box } from '@mui/material';
import { awardWindow } from '../../awardSettings/api';
import { T, useAwardSettings } from '../types';

/** Абзац про срок начисления — над списком подразделений. Даты из award_settings. */
export function AwardWindowNote() {
  const w = awardWindow(useAwardSettings());
  const text = w.open
    ? `Баллы начисляются один раз в месяц, с ${w.start} по ${w.deadline}. ` +
      `Не забудьте начислить до ${w.deadline} включительно: после этого ${w.monthName} ` +
      `будет пропущен, и начислить получится только в следующем месяце — с ${w.nextStart}.`
    : w.notYet
      ? `Начисление за ${w.monthName} откроется ${w.start} и продлится до ${w.deadline} включительно.`
      : `Срок начисления за ${w.monthName} закончился ${w.deadline}. ` +
        `Следующее начисление — с ${w.nextStart} по ${w.nextDeadline}.`;
  return (
    <Box
      sx={{
        p: 2,
        mb: 3,
        borderRadius: `${T.radius}px`,
        bgcolor: w.open ? T.accentSoft : '#FEF3C7',
        color: w.open ? T.ink : '#92400E',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {text}
    </Box>
  );
}
