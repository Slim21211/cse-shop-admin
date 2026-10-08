import { Box, Typography, Chip } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { type Department, T } from '../types';

interface DepartmentListProps {
  departments: Department[];
  onSelect: (d: Department) => void;
}

export function DepartmentList({ departments, onSelect }: DepartmentListProps) {
  return (
    <>
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: '-0.02em',
          mb: 0.5,
        }}
      >
        Начисление баллов
      </Typography>
      <Typography sx={{ color: T.muted, mb: 4 }}>
        Выберите подразделение.
      </Typography>
      {departments.length === 0 ? (
        <Box
          sx={{ p: 3, borderRadius: 3, bgcolor: T.accentSoft, color: T.accent }}
        >
          Нет доступных подразделений.
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          {departments.map((d) => (
            <Box
              key={d.departmentId}
              onClick={() => onSelect(d)}
              sx={{
                p: 2.5,
                borderRadius: `${T.radius}px`,
                bgcolor: T.surface,
                border: `1px solid ${T.line}`,
                boxShadow: T.shadow,
                cursor: 'pointer',
                transition: 'transform .12s, box-shadow .12s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 28px rgba(16,24,40,.10)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: 1,
                }}
              >
                <Typography
                  sx={{ fontWeight: 600, fontSize: 17, lineHeight: 1.3 }}
                >
                  {d.name}
                </Typography>
                {d.submittedThisMonth && (
                  <Chip
                    size="small"
                    icon={<CheckRoundedIcon sx={{ fontSize: 15 }} />}
                    label="начислено"
                    sx={{
                      bgcolor: T.okSoft,
                      color: T.ok,
                      fontWeight: 600,
                      '& .MuiChip-icon': { color: T.ok },
                    }}
                  />
                )}
              </Box>
              <Typography sx={{ color: T.muted, fontSize: 13, mt: 0.5 }}>
                Код {d.code}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, color: T.muted }}>
                    Сотрудников
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {d.headcount}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: T.muted }}>
                    Бюджет
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: T.accent }}>
                    {d.budget}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </>
  );
}
