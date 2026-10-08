import { useState } from 'react';
import { Button, Dialog, Box, Typography } from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { T, PRO_POINTS, PRO_OPTS } from '../types';

// TODO(business): заменить моковые описания на реальные формулировки
const PRO_DESC: Record<string, string> = {
  А: 'Инициативы не проявлял',
  Б: 'Разовые предложения по своей задаче',
  В: 'Регулярно предлагает улучшения',
  Г: 'Доводит инициативы до результата сам',
  Д: 'Системно улучшает процессы команды',
};

export function IndicatorsInfo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="small"
        startIcon={<HelpOutlineRoundedIcon />}
        onClick={() => setOpen(true)}
        sx={{
          textTransform: 'none',
          color: T.muted,
          '&:hover': { color: T.ink, bgcolor: 'transparent' },
        }}
      >
        Как считаются баллы
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, font: T.font } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography
            sx={{ fontWeight: 700, fontSize: 18, color: T.ink, mb: 2 }}
          >
            Показатели
          </Typography>

          {(
            [
              ['Результативность', 60],
              ['Благодарности', 10],
              ['Свободный', 10],
            ] as [string, number][]
          ).map(([name, pts]) => (
            <Box
              key={name}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 0.6,
                color: T.ink,
              }}
            >
              <span>
                {name}
                {name === 'Свободный' ? ' · с комментарием' : ''}
              </span>
              <b style={{ color: T.accent }}>+{pts}</b>
            </Box>
          ))}

          <Typography sx={{ fontWeight: 600, color: T.ink, mt: 2, mb: 1 }}>
            Проактивность · уровень А–Д
          </Typography>
          {PRO_OPTS.map((o) => (
            <Box
              key={o}
              sx={{
                display: 'flex',
                gap: 1.5,
                alignItems: 'baseline',
                py: 0.5,
              }}
            >
              <b style={{ minWidth: 16, color: T.ink }}>{o}</b>
              <span style={{ minWidth: 40, color: T.accent, fontWeight: 600 }}>
                +{PRO_POINTS[o]}
              </span>
              <span style={{ color: T.muted, fontSize: 14 }}>
                {PRO_DESC[o]}
              </span>
            </Box>
          ))}

          <Typography sx={{ color: T.muted, fontSize: 13, mt: 2 }}>
            Максимум на сотрудника — 100. Бюджет отдела — 70 × число
            сотрудников, обнуляется каждый месяц.
          </Typography>
        </Box>
      </Dialog>
    </>
  );
}
