import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { type Employee, type Row, emptyRow, T } from '../types';
import { EmployeeCard } from './EmployeeCard';
import { EmployeeTable } from './EmployeeTable';

interface EmployeeListProps {
  employees: Employee[];
  rows: Record<string, Row>;
  onUpdate: (id: string, patch: Partial<Row>) => void;
  onOpenComment: (id: string) => void;
}

/**
 * Список сотрудников: карточки на мобилке, плотная таблица на десктопе.
 * Чтобы сделать карточки и на десктопе — убрать ветку isDesktop и всегда рендерить карточки.
 */
export function EmployeeList({
  employees,
  rows,
  onUpdate,
  onOpenComment,
}: EmployeeListProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  if (employees.length === 0)
    return (
      <Typography sx={{ color: T.muted, textAlign: 'center', py: 4 }}>
        Никого не нашли.
      </Typography>
    );

  if (isDesktop)
    return (
      <EmployeeTable
        employees={employees}
        rows={rows}
        onUpdate={onUpdate}
        onOpenComment={onOpenComment}
      />
    );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {employees.map((e) => (
        <EmployeeCard
          key={e.ispringUserId}
          employee={e}
          row={rows[e.ispringUserId] || emptyRow()}
          onUpdate={(patch) => onUpdate(e.ispringUserId, patch)}
          onOpenComment={() => onOpenComment(e.ispringUserId)}
        />
      ))}
    </Box>
  );
}
