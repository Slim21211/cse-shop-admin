import { useState } from 'react';
import { Box, Typography, Dialog, IconButton } from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { PRO_OPTS, PRO_POINTS, T } from '../types';

// TODO(business): заменить на реальные формулировки А–Д от заказчика.
const PRO_DESC: Record<string, string> = {
  А: 'Инициативы не проявлял — работал строго в рамках задач.',
  Б: 'Разовые предложения по улучшению своей работы.',
  В: 'Регулярно предлагает идеи, помогает коллегам вне задач.',
  Г: 'Берёт на себя доп. ответственность, доводит инициативы до результата.',
  Д: 'Системно улучшает процессы, влияет на работу всего отдела.',
};

/** Иконка-триггер + модалка с расшифровкой уровней проактивности. */
export function IndicatorsInfo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        size="small"
        onClick={() => setOpen(true)}
        sx={{ color: T.muted, p: 0.25, '&:hover': { color: T.accent } }}
        aria-label="Что значат уровни проактивности"
      >
        <HelpOutlineRoundedIcon sx={{ fontSize: 17 }} />
      </IconButton>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, font: T.font } }}
      >
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 18, color: T.ink }}>
              Проактивность
            </Typography>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{ color: T.muted }}
            >
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
          <Typography sx={{ color: T.muted, fontSize: 13, mb: 2 }}>
            Выберите уровень — баллы начислятся автоматически.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {PRO_OPTS.map((o) => (
              <Box
                key={o}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'flex-start',
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: T.bg,
                }}
              >
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    bgcolor: T.surface,
                    border: `1px solid ${T.line}`,
                    color: T.ink,
                  }}
                >
                  {o}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    sx={{ fontSize: 13.5, color: T.ink, lineHeight: 1.35 }}
                  >
                    {PRO_DESC[o]}
                  </Typography>
                </Box>
                <Box
                  component="span"
                  sx={{
                    flexShrink: 0,
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: PRO_POINTS[o] > 0 ? T.accent : T.muted,
                  }}
                >
                  +{PRO_POINTS[o]}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
