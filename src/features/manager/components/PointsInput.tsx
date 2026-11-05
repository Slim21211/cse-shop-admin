import { Box } from '@mui/material';
import { T } from '../types';

interface PointsInputProps {
  value: number;
  max: number;
  onChange: (v: number) => void;
}

/** Ввод баллов: только целые от 0 до max, лишнее обрезается до max. */
export function PointsInput({ value, max, onChange }: PointsInputProps) {
  return (
    <Box
      component="input"
      type="text"
      inputMode="numeric"
      placeholder="0"
      aria-label={`Баллы, от 0 до ${max}`}
      title={`от 0 до ${max}`}
      value={value ? String(value) : ''}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '');
        onChange(digits ? Math.min(max, Number(digits)) : 0);
      }}
      sx={{
        width: 72,
        px: 1,
        py: '6px',
        border: `1px solid ${value > 0 ? T.accent : T.line}`,
        borderRadius: '8px',
        outline: 0,
        font: T.font,
        fontSize: 14,
        fontWeight: 600,
        textAlign: 'right',
        color: T.ink,
        bgcolor: T.surface,
        '&:focus': { borderColor: T.accent },
        '&::placeholder': { color: T.muted, fontWeight: 500 },
      }}
    />
  );
}
