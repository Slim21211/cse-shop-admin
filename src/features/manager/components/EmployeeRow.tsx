import { Box, Typography } from '@mui/material';
import { type Employee, type Row, rowPoints, T } from '../types';
import { Pill } from './Pill';
import { ProGroup } from './ProGroup';
import { Total } from './Total';

interface EmployeeRowProps {
  employee: Employee;
  row: Row;
  onUpdate: (patch: Partial<Row>) => void;
  onOpenComment: () => void;
}

export function EmployeeRow({
  employee,
  row,
  onUpdate,
  onOpenComment,
}: EmployeeRowProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: `${T.radius}px`,
        bgcolor: T.surface,
        border: `1px solid ${rowPoints(row) > 0 ? T.accent : T.line}`,
        boxShadow: T.shadow,
        transition: 'border-color .12s',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        <Box sx={{ minWidth: { md: 220 }, flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 15.5 }}>
            {employee.lastName} {employee.firstName}
          </Typography>
          <Typography sx={{ color: T.muted, fontSize: 13 }}>
            {employee.jobTitle}
          </Typography>
          {row.free && row.comment && (
            <Typography
              sx={{ color: T.accent, fontSize: 12.5, mt: 0.25 }}
              noWrap
            >
              «{row.comment}»
            </Typography>
          )}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Pill
            active={row.rez}
            points="+60"
            onClick={() => onUpdate({ rez: !row.rez })}
          >
            Результат
          </Pill>
          <ProGroup value={row.pro} onChange={(p) => onUpdate({ pro: p })} />
          <Pill
            active={row.unknown}
            points="+10"
            onClick={() => onUpdate({ unknown: !row.unknown })}
          >
            Благодарности
          </Pill>
          <Pill
            active={row.free}
            points="+10"
            onClick={() => {
              if (row.free) onOpenComment();
              else {
                onUpdate({ free: true });
                onOpenComment();
              }
            }}
          >
            Свободный{row.free && row.comment ? ' ✎' : ''}
          </Pill>
          <Total value={rowPoints(row)} />
        </Box>
      </Box>
    </Box>
  );
}
