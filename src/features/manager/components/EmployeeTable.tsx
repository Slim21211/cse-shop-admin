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
import {
  type Employee,
  type Row,
  rowPoints,
  T,
  emptyRow,
  useAwardSettings,
} from '../types';
import { Segmented } from './Segmented';
import { IndicatorsInfo, type IndicatorKey } from './IndicatorsInfo';

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

const ALIGN_ITEMS = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const;

/**
 * Ячейка шапки: всегда две строки (название и баллы) одинаковой высоты,
 * чтобы названия всех колонок стояли на одной линии.
 */
function HeadCell({
  children,
  sub,
  info,
  align = 'center',
}: {
  children: React.ReactNode;
  sub?: string;
  info?: IndicatorKey;
  align?: keyof typeof ALIGN_ITEMS;
}) {
  return (
    <TableCell
      align={align}
      sx={{
        borderBottom: `1px solid ${T.line}`,
        py: 1.25,
        verticalAlign: 'top',
        ...(align === 'right' && { pr: 2 }),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: ALIGN_ITEMS[align],
          gap: 0.25,
        }}
      >
        {/* высота строки = высота иконки «?», с ней и без неё одинаково */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: 22 }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            {children}
          </Typography>
          {info && <IndicatorsInfo indicator={info} />}
        </Box>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: T.accent,
            lineHeight: '16px',
            minHeight: 16,
          }}
        >
          {sub}
        </Typography>
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
  const s = useAwardSettings();
  const proMax = Math.max(...Object.values(s.pro.levels).map((l) => l.points));
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
            <HeadCell align="left">Сотрудник</HeadCell>
            <HeadCell sub={`+${s.rez.points}`} info="rez">
              Результат
            </HeadCell>
            <HeadCell sub={`до +${proMax}`} info="pro">
              Проактивность
            </HeadCell>
            <HeadCell sub={`+${s.unknown.points}`} info="unknown">
              Благодарности
            </HeadCell>
            <HeadCell sub={`+${s.free.points}`} info="free">
              Свободный
            </HeadCell>
            <HeadCell align="right">Итого</HeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.map((e) => {
            const row = rows[e.ispringUserId] || emptyRow();
            const total = rowPoints(row, s);
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
                        // не влияет на ширину колонки: занимает ту ширину,
                        // что задали ФИО и должность, остальное — в многоточие
                        width: 0,
                        minWidth: '100%',
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
