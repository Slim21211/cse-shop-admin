import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Dialog,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { type SubmitPhase, T } from '../types';

interface SubmitDialogProps {
  open: boolean;
  phase: SubmitPhase;
  spent: number;
  count: number;
  result?: { sent: number; failed: number };
  errorText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function SubmitDialog({
  open,
  phase,
  spent,
  count,
  result,
  errorText,
  onConfirm,
  onClose,
}: SubmitDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={phase === 'loading' ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, font: T.font } }}
    >
      <Box sx={{ p: 3.5, textAlign: 'center' }}>
        {phase === 'confirm' && (
          <>
            <Typography
              sx={{ fontWeight: 700, fontSize: 19, color: T.ink, mb: 1 }}
            >
              Начислить баллы?
            </Typography>
            <Typography sx={{ color: T.muted, mb: 3 }}>
              {spent} баллов · {count} сотрудникам. Отменить начисление будет
              нельзя.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                fullWidth
                onClick={onClose}
                color="inherit"
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Отмена
              </Button>
              <Button
                fullWidth
                variant="contained"
                disableElevation
                onClick={onConfirm}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  bgcolor: T.accent,
                }}
              >
                Начислить
              </Button>
            </Box>
          </>
        )}
        {phase === 'loading' && (
          <Box sx={{ py: 2 }}>
            <CircularProgress sx={{ color: T.accent }} />
            <Typography sx={{ mt: 2, color: T.muted }}>
              Начисляем баллы…
            </Typography>
          </Box>
        )}
        {phase === 'success' && (
          <>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: T.okSoft,
                color: T.ok,
                display: 'grid',
                placeItems: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <CheckRoundedIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 19, color: T.ink }}>
              Готово
            </Typography>
            <Typography sx={{ color: T.muted, mt: 0.5, mb: 3 }}>
              Начислено {result?.sent ?? 0} сотрудникам
              {result?.failed ? ` · не удалось: ${result.failed}` : ''}.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              disableElevation
              onClick={onClose}
              sx={{ textTransform: 'none', borderRadius: 2, bgcolor: T.accent }}
            >
              К подразделениям
            </Button>
          </>
        )}
        {phase === 'error' && (
          <>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: '#FDECEC',
                color: T.danger,
                display: 'grid',
                placeItems: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <ErrorOutlineRoundedIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 19, color: T.ink }}>
              Не отправилось
            </Typography>
            <Typography sx={{ color: T.muted, mt: 0.5, mb: 3 }}>
              {errorText || 'Попробуйте ещё раз.'}
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              onClick={onClose}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Закрыть
            </Button>
          </>
        )}
      </Box>
    </Dialog>
  );
}
