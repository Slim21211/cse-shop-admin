// src/features/manager/components/IndicatorCheck.tsx
import { Checkbox, FormControlLabel, Box } from '@mui/material';
import { T } from '../types';

interface Props {
  label: string;
  points: number;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function IndicatorCheck({
  label,
  points,
  checked,
  onChange,
  disabled,
}: Props) {
  return (
    <FormControlLabel
      sx={{ ml: 0, mr: 0, userSelect: 'none' }}
      control={
        <Checkbox
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          sx={{ p: 0.75, color: T.line, '&.Mui-checked': { color: T.accent } }}
        />
      }
      label={
        <Box
          component="span"
          sx={{ fontSize: 14.5, fontWeight: 500, color: T.ink }}
        >
          {label}{' '}
          <Box
            component="span"
            sx={{ fontWeight: 700, color: checked ? T.accent : T.muted }}
          >
            +{points}
          </Box>
        </Box>
      }
    />
  );
}
