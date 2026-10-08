import { Box, Typography, Button } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { type Department, T } from '../types';

interface LockedDepartmentViewProps {
  department: Department;
  onBack: () => void;
}

export function LockedDepartmentView({
  department,
  onBack,
}: LockedDepartmentViewProps) {
  return (
    <>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={onBack}
        sx={{
          textTransform: 'none',
          color: T.muted,
          mb: 2,
          '&:hover': { bgcolor: 'transparent', color: T.ink },
        }}
      >
        К подразделениям
      </Button>
      <Box
        sx={{
          p: 4,
          borderRadius: `${T.radius}px`,
          bgcolor: T.surface,
          border: `1px solid ${T.line}`,
          boxShadow: T.shadow,
          textAlign: 'center',
        }}
      >
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
          <LockRoundedIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 20 }}>
          {department.name}
        </Typography>
        <Typography sx={{ color: T.muted, mt: 1 }}>
          В этом месяце баллы уже начислены. Следующее начисление — в следующем
          месяце.
        </Typography>
      </Box>
    </>
  );
}
