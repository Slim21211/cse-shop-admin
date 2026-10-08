import { Box } from '@mui/material';
import { type Pro, PRO_OPTS, PRO_POINTS, T } from '../types';

interface ProGroupProps {
  value: Pro;
  onChange: (p: Pro) => void;
  disabled?: boolean;
}

export function ProGroup({ value, onChange, disabled }: ProGroupProps) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        border: `1.5px solid ${T.line}`,
        borderRadius: 999,
        overflow: 'hidden',
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
              font: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              width: 34,
              py: 0.6,
              border: 0,
              cursor: disabled ? 'default' : 'pointer',
              bgcolor: on ? T.accent : 'transparent',
              color: on ? '#fff' : T.muted,
              opacity: disabled ? 0.55 : 1,
              '&:hover': disabled
                ? {}
                : { bgcolor: on ? T.accent : T.accentSoft },
            }}
          >
            {o}
          </Box>
        );
      })}
    </Box>
  );
}
