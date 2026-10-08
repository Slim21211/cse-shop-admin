import { Box, Typography } from '@mui/material';
import { type Employee, type Row, rowPoints, PRO_POINTS, T } from '../types';
import { IndicatorCheck } from './IndicatorCheck';
import { ProGroup } from './ProGroup';

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
  const active = rowPoints(row) > 0;

  const handleFree = (v: boolean) => {
    if (v) {
      onUpdate({ free: true });
      onOpenComment();
    } // включили — просим комментарий
    else onUpdate({ free: false });
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: `${T.radius}px`,
        bgcolor: T.surface,
        border: `1px solid ${active ? T.accent : T.line}`,
        boxShadow: T.shadow,
        transition: 'border-color .12s',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {/* сотрудник */}
        <Box sx={{ minWidth: { md: 210 }, flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 15.5, color: T.ink }}>
            {employee.lastName} {employee.firstName}
          </Typography>
          <Typography sx={{ color: T.muted, fontSize: 13 }}>
            {employee.jobTitle}
          </Typography>
          {row.free && row.comment && (
            <Typography
              onClick={onOpenComment}
              sx={{
                color: T.accent,
                fontSize: 12.5,
                mt: 0.25,
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
              noWrap
            >
              «{row.comment}» · изменить
            </Typography>
          )}
        </Box>

        {/* показатели */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            columnGap: 3,
            rowGap: 1.25,
          }}
        >
          <IndicatorCheck
            label="Результативность"
            points={60}
            checked={row.rez}
            onChange={(v) => onUpdate({ rez: v })}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 500, color: T.ink }}>
              Проактивность
            </Typography>
            <ProGroup value={row.pro} onChange={(p) => onUpdate({ pro: p })} />
            <Box
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: 13,
                color: PRO_POINTS[row.pro] > 0 ? T.accent : T.muted,
              }}
            >
              +{PRO_POINTS[row.pro]}
            </Box>
          </Box>

          <IndicatorCheck
            label="Благодарности"
            points={10}
            checked={row.unknown}
            onChange={(v) => onUpdate({ unknown: v })}
          />
          <IndicatorCheck
            label="Свободный"
            points={10}
            checked={row.free}
            onChange={handleFree}
          />
        </Box>

        {/* итог — обособленный блок */}
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: { xs: 'row', md: 'column' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 0.25,
            minWidth: { md: 92 },
            ml: { md: 1 },
            pl: { md: 2 },
            pt: { xs: 1.25, md: 0 },
            borderLeft: { md: `1px solid ${T.line}` },
            borderTop: { xs: `1px solid ${T.line}`, md: 'none' },
          }}
        >
          <Typography sx={{ fontSize: 12, color: T.muted }}>Итого</Typography>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 22,
              lineHeight: 1,
              color: active ? T.ok : T.muted,
            }}
          >
            {rowPoints(row)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
