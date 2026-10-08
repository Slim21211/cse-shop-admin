import { Box } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { T } from '../types';

interface PillProps {
  active: boolean;
  children: React.ReactNode;
  points?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function Pill({
  active,
  children,
  points,
  onClick,
  disabled,
}: PillProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        cursor: disabled ? 'default' : 'pointer',
        px: 1.5,
        py: 0.75,
        borderRadius: 999,
        font: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        border: '1.5px solid',
        transition: 'all .12s ease',
        whiteSpace: 'nowrap',
        borderColor: active ? T.accent : T.line,
        bgcolor: active ? T.accent : 'transparent',
        color: active ? '#fff' : T.ink,
        opacity: disabled ? 0.55 : 1,
        '&:hover': disabled
          ? {}
          : {
              borderColor: T.accent,
              bgcolor: active ? T.accent : T.accentSoft,
            },
      }}
    >
      {active && <CheckRoundedIcon sx={{ fontSize: 16 }} />}
      {children}
      {points && (
        <Box component="span" sx={{ fontSize: 12, opacity: 0.8 }}>
          {points}
        </Box>
      )}
    </Box>
  );
}
