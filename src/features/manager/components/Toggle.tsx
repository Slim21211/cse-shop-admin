import { Box } from '@mui/material';
import { T } from '../types';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

/** Кастомный переключатель 40×24 — как в макете. */
export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <Box
      component="button"
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      sx={{
        position: 'relative',
        width: 40,
        height: 24,
        p: 0,
        flexShrink: 0,
        border: 0,
        borderRadius: 999,
        cursor: disabled ? 'default' : 'pointer',
        bgcolor: checked ? T.accent : '#E5E7EB',
        opacity: disabled ? 0.55 : 1,
        transition: 'background-color .2s',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 18,
          height: 18,
          top: 3,
          left: checked ? 19 : 3,
          borderRadius: '50%',
          bgcolor: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.15)',
          transition: 'left .2s',
        },
      }}
    />
  );
}
