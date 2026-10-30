import { useState } from 'react';
import { Box, Typography, Dialog, IconButton } from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { PRO_OPTS, T, useAwardSettings } from '../types';

export type IndicatorKey = 'rez' | 'pro' | 'unknown' | 'free';

const TITLES: Record<IndicatorKey, string> = {
  rez: 'Результативность',
  pro: 'Проактивность',
  unknown: 'Благодарности',
  free: 'Свободный',
};

/**
 * Иконка-триггер + модалка с подсказкой, как оценивать показатель.
 * Тексты и баллы — из award_settings (правят админы на вкладке «Показатели»).
 */
export function IndicatorsInfo({ indicator }: { indicator: IndicatorKey }) {
  const [open, setOpen] = useState(false);
  const s = useAwardSettings();
  const title = TITLES[indicator];
  const desc = indicator === 'pro' ? s.pro.desc : s[indicator].desc;
  return (
    <>
      <IconButton
        size="small"
        onClick={() => setOpen(true)}
        sx={{ color: T.muted, p: 0.25, '&:hover': { color: T.accent } }}
        aria-label={`Как оценивать: ${title}`}
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
              {title}
              {indicator !== 'pro' && (
                <Box
                  component="span"
                  sx={{ ml: 1, fontSize: 14, color: T.accent }}
                >
                  +{s[indicator].points}
                </Box>
              )}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{ color: T.muted }}
            >
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
          {desc && (
            <Typography
              sx={{
                color: T.muted,
                fontSize: 13,
                whiteSpace: 'pre-line',
                mb: indicator === 'pro' ? 2 : 0,
              }}
            >
              {desc}
            </Typography>
          )}

          {indicator === 'pro' && (
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
                      sx={{
                        fontSize: 13.5,
                        color: T.ink,
                        lineHeight: 1.35,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {s.pro.levels[o].desc}
                    </Typography>
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      fontWeight: 700,
                      fontSize: 12.5,
                      color: s.pro.levels[o].points > 0 ? T.accent : T.muted,
                    }}
                  >
                    +{s.pro.levels[o].points}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Dialog>
    </>
  );
}
