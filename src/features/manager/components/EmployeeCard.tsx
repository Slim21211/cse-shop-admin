import { Box, Typography } from '@mui/material';
import { type Employee, type Row, rowPoints, PRO_POINTS, T } from '../types';
import { Toggle } from './Toggle';
import { Segmented } from './Segmented';
import { IndicatorsInfo } from './IndicatorsInfo';

interface EmployeeCardProps {
  employee: Employee;
  row: Row;
  onUpdate: (patch: Partial<Row>) => void;
  onOpenComment: () => void;
}

function ValueBadge({ points, on }: { points: number; on: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 12,
        fontWeight: 600,
        px: '9px',
        py: '3px',
        borderRadius: '8px',
        whiteSpace: 'nowrap',
        bgcolor: on ? T.accentSoft : '#F3F4F6',
        color: on ? T.accent : T.muted,
      }}
    >
      +{points}
    </Box>
  );
}

/** Карточка сотрудника для мобилки — по макету заказчика. */
export function EmployeeCard({
  employee,
  row,
  onUpdate,
  onOpenComment,
}: EmployeeCardProps) {
  const total = rowPoints(row);
  const active = total > 0;
  const initials = `${employee.lastName[0] || ''}${employee.firstName[0] || ''}`;

  const handleFree = (v: boolean) => {
    if (v) {
      onUpdate({ free: true });
      onOpenComment();
    } else onUpdate({ free: false, comment: '' });
  };

  return (
    <Box
      sx={{
        bgcolor: T.surface,
        borderRadius: '16px',
        border: `1px solid ${active ? T.accent : T.line}`,
        boxShadow: T.shadow,
        overflow: 'hidden',
        transition: 'border-color .12s',
      }}
    >
      {/* шапка */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.75,
          p: '16px',
          borderBottom: `1px solid ${T.line}`,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 18,
            background: 'linear-gradient(135deg, #A78BFA, #6366F1)',
          }}
        >
          {initials}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: 17,
              color: T.ink,
              lineHeight: 1.2,
            }}
          >
            {employee.lastName} {employee.firstName}
          </Typography>
          {employee.jobTitle && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                mt: 0.5,
                px: '8px',
                py: '2px',
                borderRadius: 999,
                bgcolor: '#F3F4F6',
                color: '#4B5563',
                fontSize: 11,
                fontWeight: 500,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {employee.jobTitle}
            </Box>
          )}
        </Box>
      </Box>

      {/* тело */}
      <Box
        sx={{ p: '16px', display: 'flex', flexDirection: 'column', gap: 2.25 }}
      >
        {/* результативность */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              minWidth: 0,
            }}
          >
            <Toggle checked={row.rez} onChange={(v) => onUpdate({ rez: v })} />
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: T.ink }}>
              Результативность
            </Typography>
          </Box>
          <ValueBadge points={60} on={row.rez} />
        </Box>

        {/* проактивность */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 500, color: T.ink }}>
                Проактивность
              </Typography>
              <IndicatorsInfo />
            </Box>
            <ValueBadge
              points={PRO_POINTS[row.pro]}
              on={PRO_POINTS[row.pro] > 0}
            />
          </Box>
          <Segmented value={row.pro} onChange={(p) => onUpdate({ pro: p })} />
        </Box>

        {/* доп. критерии */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
          }}
        >
          <ExtraItem
            label="Благодарности"
            points={10}
            on={row.unknown}
            onToggle={(v) => onUpdate({ unknown: v })}
          />
          <ExtraItem
            label={row.free && row.comment ? 'Свободный ✎' : 'Свободный'}
            points={10}
            on={row.free}
            onToggle={handleFree}
            onLabelClick={row.free ? onOpenComment : undefined}
          />
        </Box>

        {row.free && row.comment && (
          <Typography
            onClick={onOpenComment}
            sx={{
              color: T.accent,
              fontSize: 12.5,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
            noWrap
          >
            «{row.comment}» · изменить
          </Typography>
        )}
      </Box>

      {/* итого */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: '20px',
          py: '14px',
          bgcolor: '#FAFBFC',
          borderTop: `1px solid ${T.line}`,
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: T.muted }}>
          Итого
        </Typography>
        <Typography
          sx={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: active ? T.ok : T.muted,
          }}
        >
          {total}
        </Typography>
      </Box>
    </Box>
  );
}

function ExtraItem({
  label,
  points,
  on,
  onToggle,
  onLabelClick,
}: {
  label: string;
  points: number;
  on: boolean;
  onToggle: (v: boolean) => void;
  onLabelClick?: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        bgcolor: '#F9FAFB',
        borderRadius: '12px',
        p: '12px 14px',
      }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}
      >
        <Toggle checked={on} onChange={onToggle} />
        <Typography
          onClick={onLabelClick}
          sx={{
            fontSize: 13,
            fontWeight: 500,
            color: T.ink,
            cursor: onLabelClick ? 'pointer' : 'default',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Typography>
      </Box>
      <ValueBadge points={points} on={on} />
    </Box>
  );
}
