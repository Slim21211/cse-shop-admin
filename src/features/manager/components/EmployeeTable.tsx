import {
  Box,
  Typography,
  Checkbox,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { type Employee, type Row, rowPoints, T, emptyRow } from '../types';
import { Segmented } from './Segmented';
import { IndicatorsInfo } from './IndicatorsInfo';

interface EmployeeTableProps {
  employees: Employee[];
  rows: Record<string, Row>;
  onUpdate: (id: string, patch: Partial<Row>) => void;
  onOpenComment: (id: string) => void;
}

const checkSx = {
  p: 0.5,
  color: T.line,
  '&.Mui-checked': { color: T.accent },
};

function HeadCell({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <TableCell
      align="center"
      sx={{ borderBottom: `1px solid ${T.line}`, py: 1.25 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            {children}
          </Typography>
        </Box>
        {sub && (
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: T.accent }}>
            {sub}
          </Typography>
        )}
      </Box>
    </TableCell>
  );
}

/** Плотная таблица начисления для десктопа. */
export function EmployeeTable({
  employees,
  rows,
  onUpdate,
  onOpenComment,
}: EmployeeTableProps) {
  const handleFree = (id: string, v: boolean) => {
    if (v) {
      onUpdate(id, { free: true });
      onOpenComment(id);
    } else onUpdate(id, { free: false, comment: '' });
  };

  return (
    <Box
      sx={{
        bgcolor: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: `${T.radius}px`,
        boxShadow: T.shadow,
        overflow: 'hidden',
      }}
    >
      <Table size="small" sx={{ '& td, & th': { font: T.font } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: '#FAFBFC' }}>
            <TableCell sx={{ borderBottom: `1px solid ${T.line}`, py: 1.25 }}>
              <Typography
                sx={{ fontSize: 12.5, fontWeight: 600, color: T.muted }}
              >
                Сотрудник
              </Typography>
            </TableCell>
            <HeadCell sub="+60">Результат</HeadCell>
            <TableCell
              align="center"
              sx={{ borderBottom: `1px solid ${T.line}`, py: 1.25 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                }}
              >
                <Typography
                  sx={{ fontSize: 12.5, fontWeight: 600, color: T.muted }}
                >
                  Проактивность
                </Typography>
                <IndicatorsInfo />
              </Box>
            </TableCell>
            <HeadCell sub="+10">Благодарности</HeadCell>
            <HeadCell sub="+10">Свободный</HeadCell>
            <TableCell
              align="right"
              sx={{ borderBottom: `1px solid ${T.line}`, py: 1.25, pr: 2 }}
            >
              <Typography
                sx={{ fontSize: 12.5, fontWeight: 600, color: T.muted }}
              >
                Итого
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.map((e) => {
            const row = rows[e.ispringUserId] || emptyRow();
            const total = rowPoints(row);
            const active = total > 0;
            return (
              <TableRow
                key={e.ispringUserId}
                sx={{
                  bgcolor: active ? T.accentSoft + '55' : 'transparent',
                  '&:hover': { bgcolor: active ? T.accentSoft : '#FAFAFD' },
                  '& td': { borderBottom: `1px solid ${T.line}` },
                  '&:last-of-type td': { borderBottom: 0 },
                }}
              >
                <TableCell sx={{ py: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: T.ink,
                      lineHeight: 1.2,
                    }}
                  >
                    {e.lastName} {e.firstName}
                  </Typography>
                  <Typography sx={{ color: T.muted, fontSize: 12 }} noWrap>
                    {e.jobTitle}
                  </Typography>
                  {row.free && row.comment && (
                    <Typography
                      onClick={() => onOpenComment(e.ispringUserId)}
                      sx={{
                        color: T.accent,
                        fontSize: 12,
                        mt: 0.25,
                        cursor: 'pointer',
                        maxWidth: 240,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      noWrap
                    >
                      «{row.comment}» · изменить
                    </Typography>
                  )}
                </TableCell>

                <TableCell align="center" sx={{ py: 1 }}>
                  <Checkbox
                    checked={row.rez}
                    onChange={(_, v) => onUpdate(e.ispringUserId, { rez: v })}
                    checkedIcon={<CheckRoundedIcon />}
                    sx={checkSx}
                  />
                </TableCell>

                <TableCell align="center" sx={{ py: 1 }}>
                  <Segmented
                    variant="compact"
                    value={row.pro}
                    onChange={(p) => onUpdate(e.ispringUserId, { pro: p })}
                  />
                </TableCell>

                <TableCell align="center" sx={{ py: 1 }}>
                  <Checkbox
                    checked={row.unknown}
                    onChange={(_, v) =>
                      onUpdate(e.ispringUserId, { unknown: v })
                    }
                    checkedIcon={<CheckRoundedIcon />}
                    sx={checkSx}
                  />
                </TableCell>

                <TableCell align="center" sx={{ py: 1 }}>
                  <Checkbox
                    checked={row.free}
                    onChange={(_, v) => handleFree(e.ispringUserId, v)}
                    checkedIcon={<CheckRoundedIcon />}
                    sx={checkSx}
                  />
                </TableCell>

                <TableCell align="right" sx={{ py: 1, pr: 2 }}>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: 18,
                      color: active ? T.ok : T.muted,
                    }}
                  >
                    {total}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
