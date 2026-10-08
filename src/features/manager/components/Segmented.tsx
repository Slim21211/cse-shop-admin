import { Box } from '@mui/material';
import { type Pro, PRO_OPTS, PRO_POINTS, T } from '../types';

interface SegmentedProps {
  value: Pro;
  onChange: (p: Pro) => void;
  disabled?: boolean;
  /** compact — для таблицы (десктоп), full — на всю ширину (карточка/мобилка). */
  variant?: 'full' | 'compact';
}

/** Сегментированный контрол проактивности А–Д — как в макете. */
export function Segmented({
  value,
  onChange,
  disabled,
  variant = 'full',
}: SegmentedProps) {
  const compact = variant === 'compact';
  return (
    <Box
      sx={{
        display: compact ? 'inline-flex' : 'flex',
        bgcolor: '#F3F4F6',
        borderRadius: compact ? '8px' : '10px',
        p: '3px',
        gap: '2px',
      }}
    >
      {PRO_OPTS.map((o) => {
        const on = value === o;
        return (
          <Box
            key={o}
            component="button"
            type="button"
            disabled={disabled}
            onClick={() => onChange(o)}
            title={`+${PRO_POINTS[o]}`}
            sx={{
              flex: compact ? 'none' : 1,
              width: compact ? 30 : 'auto',
              border: 0,
              py: compact ? '4px' : '7px',
              font: 'inherit',
              fontSize: 13,
              fontWeight: on ? 600 : 500,
              borderRadius: compact ? '6px' : '8px',
              cursor: disabled ? 'default' : 'pointer',
              transition: '.15s',
              bgcolor: on ? '#fff' : 'transparent',
              color: on ? T.accent : T.muted,
              boxShadow: on ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              opacity: disabled ? 0.55 : 1,
              '&:hover': disabled || on ? {} : { color: T.ink },
            }}
          >
            {o}
          </Box>
        );
      })}
    </Box>
  );
}
