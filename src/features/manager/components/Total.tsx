import { Box } from '@mui/material';
import { T } from '../types';

interface TotalProps {
  value: number;
}

export function Total({ value }: TotalProps) {
  return (
    <Box
      sx={{
        minWidth: 48,
        textAlign: 'center',
        px: 1.25,
        py: 0.5,
        borderRadius: 10,
        fontWeight: 700,
        fontSize: 15,
        bgcolor: value > 0 ? T.okSoft : '#F2F2F6',
        color: value > 0 ? T.ok : T.muted,
      }}
    >
      {value}
    </Box>
  );
}
