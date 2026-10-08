import { Box, Typography, Button, LinearProgress } from '@mui/material';
import { type Department, T } from '../types';

interface BudgetBarProps {
  selected: Department;
  spent: number;
  remaining: number;
  canSubmit: boolean;
  onSubmitClick: () => void;
}

export function BudgetBar({
  selected,
  spent,
  remaining,
  canSubmit,
  onSubmitClick,
}: BudgetBarProps) {
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 12,
        zIndex: 10,
        mt: 2,
        mb: 3,
        p: 2,
        borderRadius: `${T.radius}px`,
        bgcolor: T.surface,
        border: `1px solid ${T.line}`,
        boxShadow: T.shadow,
      }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
      >
        <Box>
          <Typography sx={{ fontSize: 12, color: T.muted }}>
            Остаток бюджета
          </Typography>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 22,
              color: remaining < 0 ? T.danger : T.ink,
            }}
          >
            {remaining}
            <Box
              component="span"
              sx={{ fontSize: 14, color: T.muted, fontWeight: 500 }}
            >
              {' '}
              / {selected.budget}
            </Box>
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          disableElevation
          disabled={!canSubmit}
          onClick={onSubmitClick}
          sx={{
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            py: 1,
            fontWeight: 600,
            bgcolor: T.accent,
            '&:hover': { bgcolor: '#4338CA' },
          }}
        >
          Начислить · {spent}
        </Button>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(
          100,
          selected.budget ? (spent / selected.budget) * 100 : 0
        )}
        sx={{
          mt: 1.5,
          height: 6,
          borderRadius: 3,
          bgcolor: '#EEE',
          '& .MuiLinearProgress-bar': {
            bgcolor: remaining < 0 ? T.danger : T.accent,
          },
        }}
      />
    </Box>
  );
}
