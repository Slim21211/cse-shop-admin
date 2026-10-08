// src/features/manager/ManagerPanel.tsx — начисление баллов руководителем (UI-полировка).
import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Dialog,
  Drawer,
  LinearProgress,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

/* ─── токены стиля ─────────────────────────────────────────── */
const T = {
  font: "'Inter', system-ui, -apple-system, sans-serif",
  accent: '#4F46E5',
  accentSoft: '#EEF0FF',
  ink: '#1A1A24',
  muted: '#6B7280',
  line: '#E8E8EF',
  ok: '#16A34A',
  okSoft: '#E9F8EF',
  danger: '#DC2626',
  surface: '#FFFFFF',
  bg: '#F7F7FB',
  radius: 14,
  shadow: '0 1px 2px rgba(16,24,40,.04), 0 6px 20px rgba(16,24,40,.06)',
};
function useFont() {
  useEffect(() => {
    const id = 'inter-font-mgr';
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id;
    l.rel = 'stylesheet';
    l.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }, []);
}

/* ─── данные/расчёт ────────────────────────────────────────── */
interface Department {
  departmentId: string;
  name: string;
  code: string;
  headcount: number;
  budget: number;
  submittedThisMonth: boolean;
}
interface Employee {
  ispringUserId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
}
type Pro = 'А' | 'Б' | 'В' | 'Г' | 'Д';
interface Row {
  rez: boolean;
  pro: Pro;
  unknown: boolean;
  free: boolean;
  comment: string;
}
const PRO_POINTS: Record<Pro, number> = { А: 0, Б: 5, В: 10, Г: 15, Д: 20 };
const PRO_OPTS: Pro[] = ['А', 'Б', 'В', 'Г', 'Д'];
const emptyRow = (): Row => ({
  rez: false,
  pro: 'А',
  unknown: false,
  free: false,
  comment: '',
});
const rowPoints = (r: Row) =>
  (r.rez ? 60 : 0) +
  PRO_POINTS[r.pro] +
  (r.unknown ? 10 : 0) +
  (r.free ? 10 : 0);

/* ─── мелкие UI-компоненты ─────────────────────────────────── */
function Pill({
  active,
  children,
  points,
  onClick,
  disabled,
}: {
  active: boolean;
  children: React.ReactNode;
  points?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        cursor: disabled ? 'default' : 'pointer',
        px: 1.5,
        py: 0.75,
        borderRadius: 999,
        font: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        border: '1.5px solid',
        transition: 'all .12s ease',
        whiteSpace: 'nowrap',
        borderColor: active ? T.accent : T.line,
        bgcolor: active ? T.accent : 'transparent',
        color: active ? '#fff' : T.ink,
        opacity: disabled ? 0.55 : 1,
        '&:hover': disabled
          ? {}
          : {
              borderColor: T.accent,
              bgcolor: active ? T.accent : T.accentSoft,
            },
      }}
    >
      {active && <CheckRoundedIcon sx={{ fontSize: 16 }} />}
      {children}
      {points && (
        <Box component="span" sx={{ fontSize: 12, opacity: 0.8 }}>
          {points}
        </Box>
      )}
    </Box>
  );
}
function ProGroup({
  value,
  onChange,
  disabled,
}: {
  value: Pro;
  onChange: (p: Pro) => void;
  disabled?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        border: `1.5px solid ${T.line}`,
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      {PRO_OPTS.map((o) => {
        const on = value === o;
        return (
          <Box
            key={o}
            component="button"
            type="button"
            disabled={disabled}
            onClick={() => onChange(o)}
            title={`+${PRO_POINTS[o]}`}
            sx={{
              font: 'inherit',
              fontSize: 14,
              fontWeight: 600,
              width: 34,
              py: 0.6,
              border: 0,
              cursor: disabled ? 'default' : 'pointer',
              bgcolor: on ? T.accent : 'transparent',
              color: on ? '#fff' : T.muted,
              opacity: disabled ? 0.55 : 1,
              '&:hover': disabled
                ? {}
                : { bgcolor: on ? T.accent : T.accentSoft },
            }}
          >
            {o}
          </Box>
        );
      })}
    </Box>
  );
}
function Total({ value }: { value: number }) {
  return (
    <Box
      sx={{
        minWidth: 48,
        textAlign: 'center',
        px: 1.25,
        py: 0.5,
        borderRadius: 10,
        fontWeight: 700,
        fontSize: 15,
        bgcolor: value > 0 ? T.okSoft : '#F2F2F6',
        color: value > 0 ? T.ok : T.muted,
      }}
    >
      {value}
    </Box>
  );
}

/* ─── комментарий: модалка (десктоп) / боттом-шит (мобилка) ─── */
function CommentSheet({
  open,
  isMobile,
  name,
  initial,
  onSave,
  onRemove,
  onClose,
}: {
  open: boolean;
  isMobile: boolean;
  name: string;
  initial: string;
  onSave: (c: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(initial);
  useEffect(() => {
    if (open) setVal(initial);
  }, [open, initial]);
  const body = (
    <Box sx={{ p: 3, font: T.font }}>
      <Typography sx={{ fontWeight: 700, fontSize: 18, color: T.ink }}>
        Свободный показатель
      </Typography>
      <Typography sx={{ color: T.muted, fontSize: 14, mb: 2 }}>
        {name} · +10 баллов
      </Typography>
      <TextField
        autoFocus
        fullWidth
        multiline
        minRows={3}
        placeholder="За что начисляется — обязательно"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, font: T.font } }}
      />
      <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
        <Button
          onClick={onRemove}
          color="inherit"
          sx={{ color: T.muted, textTransform: 'none' }}
        >
          Убрать
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          onClick={onClose}
          color="inherit"
          sx={{ textTransform: 'none' }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!val.trim()}
          onClick={() => onSave(val.trim())}
          sx={{ textTransform: 'none', borderRadius: 2, bgcolor: T.accent }}
        >
          Сохранить
        </Button>
      </Box>
    </Box>
  );
  if (isMobile)
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
        }}
      >
        {body}
      </Drawer>
    );
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {body}
    </Dialog>
  );
}

/* ─── модалка отправки: подтверждение → загрузка → итог ────── */
type SubmitPhase = 'confirm' | 'loading' | 'success' | 'error';
function SubmitDialog({
  open,
  phase,
  spent,
  count,
  result,
  errorText,
  onConfirm,
  onClose,
}: {
  open: boolean;
  phase: SubmitPhase;
  spent: number;
  count: number;
  result?: { sent: number; failed: number };
  errorText?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
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

/* ─── главный компонент ────────────────────────────────────── */
export function ManagerPanel() {
  useFont();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [search, setSearch] = useState('');
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [submit, setSubmit] = useState<{
    open: boolean;
    phase: SubmitPhase;
    result?: { sent: number; failed: number };
    errorText?: string;
  }>({ open: false, phase: 'confirm' });

  const loadDepartments = async () => {
    try {
      const r = await fetch('/api/manager/departments');
      if (!r.ok) throw new Error('Не удалось загрузить подразделения');
      setDepartments((await r.json()).departments || []);
    } catch (e) {
      setError(String((e as Error).message || e));
    }
  };
  useEffect(() => {
    loadDepartments();
  }, []);

  const openDepartment = async (d: Department) => {
    setSelected(d);
    setSearch('');
    setRows({});
    if (d.submittedThisMonth) {
      setEmployees([]);
      return;
    } // залочено — сотрудников не грузим
    setEmployees(null);
    try {
      const r = await fetch(
        `/api/manager/employees?departmentId=${encodeURIComponent(d.departmentId)}`
      );
      if (!r.ok) throw new Error();
      const emps: Employee[] = (await r.json()).employees || [];
      setEmployees(emps);
      const init: Record<string, Row> = {};
      emps.forEach((e) => (init[e.ispringUserId] = emptyRow()));
      setRows(init);
    } catch {
      setEmployees([]);
    }
  };

  const update = (id: string, patch: Partial<Row>) =>
    setRows((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  const spent = useMemo(
    () => Object.values(rows).reduce((s, r) => s + rowPoints(r), 0),
    [rows]
  );
  const remaining = (selected?.budget || 0) - spent;
  const invalidComment = Object.values(rows).some(
    (r) => r.free && !r.comment.trim()
  );
  const awardCount = Object.values(rows).filter((r) => rowPoints(r) > 0).length;
  const canSubmit = spent > 0 && remaining >= 0 && !invalidComment;

  const doSubmit = async () => {
    if (!selected) return;
    setSubmit({ open: true, phase: 'loading' });
    try {
      const awards = Object.entries(rows)
        .filter(([, r]) => rowPoints(r) > 0)
        .map(([employeeId, r]) => ({
          employeeId,
          indicators: {
            rez: r.rez,
            pro: r.pro,
            unknown: r.unknown,
            free: r.free,
          },
          comment: r.comment,
        }));
      const res = await fetch('/api/manager/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: selected.departmentId, awards }),
      });
      const data = await res.json();
      if (!res.ok)
        setSubmit({
          open: true,
          phase: 'error',
          errorText:
            data.error === 'already submitted this month'
              ? 'В этом месяце по отделу уже начислено.'
              : `Ошибка: ${data.error || res.status}`,
        });
      else {
        setSubmit({
          open: true,
          phase: 'success',
          result: { sent: data.sent, failed: data.failed },
        });
        setDepartments((ds) =>
          (ds || []).map((d) =>
            d.departmentId === selected.departmentId
              ? { ...d, submittedThisMonth: true }
              : d
          )
        );
      }
    } catch {
      setSubmit({
        open: true,
        phase: 'error',
        errorText: 'Сеть недоступна. Попробуйте ещё раз.',
      });
    }
  };
  const closeSubmit = () => {
    const wasSuccess = submit.phase === 'success';
    setSubmit({ open: false, phase: 'confirm' });
    if (wasSuccess) {
      setSelected(null);
      loadDepartments();
    }
  };

  const page = (children: React.ReactNode) => (
    <Box sx={{ font: T.font, color: T.ink, bgcolor: T.bg, minHeight: '100vh' }}>
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        {children}
      </Container>
    </Box>
  );

  if (error)
    return page(
      <Box sx={{ p: 3, borderRadius: 3, bgcolor: '#FDECEC', color: T.danger }}>
        {error}
      </Box>
    );
  if (departments === null)
    return page(
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress sx={{ color: T.accent }} />
      </Box>
    );

  /* ── список подразделений ── */
  if (!selected) {
    return page(
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
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: T.accentSoft,
              color: T.accent,
            }}
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
                onClick={() => openDepartment(d)}
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

  const back = (
    <Button
      startIcon={<ArrowBackRoundedIcon />}
      onClick={() => {
        setSelected(null);
        loadDepartments();
      }}
      sx={{
        textTransform: 'none',
        color: T.muted,
        mb: 2,
        '&:hover': { bgcolor: 'transparent', color: T.ink },
      }}
    >
      К подразделениям
    </Button>
  );

  /* ── залоченный отдел (уже начислено) ── */
  if (selected.submittedThisMonth) {
    return page(
      <>
        {back}
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
            {selected.name}
          </Typography>
          <Typography sx={{ color: T.muted, mt: 1 }}>
            В этом месяце баллы уже начислены. Следующее начисление — в
            следующем месяце.
          </Typography>
        </Box>
      </>
    );
  }

  /* ── экран начисления ── */
  const filtered = (employees || []).filter((e) =>
    `${e.lastName} ${e.firstName}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );
  const commentEmp = commentFor
    ? (employees || []).find((e) => e.ispringUserId === commentFor)
    : null;

  const controls = (id: string) => {
    const r = rows[id] || emptyRow();
    return (
      <>
        <Pill
          active={r.rez}
          points="+60"
          onClick={() => update(id, { rez: !r.rez })}
        >
          Результат
        </Pill>
        <ProGroup value={r.pro} onChange={(p) => update(id, { pro: p })} />
        <Pill
          active={r.unknown}
          points="+10"
          onClick={() => update(id, { unknown: !r.unknown })}
        >
          Благодарности
        </Pill>
        <Pill
          active={r.free}
          points="+10"
          onClick={() => {
            if (r.free)
              setCommentFor(id); // редактировать комментарий
            else {
              update(id, { free: true });
              setCommentFor(id);
            }
          }}
        >
          Свободный{r.free && r.comment ? ' ✎' : ''}
        </Pill>
        <Total value={rowPoints(r)} />
      </>
    );
  };

  return page(
    <>
      {back}
      <Typography
        sx={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em' }}
      >
        {selected.name}
      </Typography>

      {/* липкая плашка бюджета */}
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
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
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
            onClick={() => setSubmit({ open: true, phase: 'confirm' })}
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

      {/* поиск */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          mb: 2,
          borderRadius: 999,
          bgcolor: T.surface,
          border: `1px solid ${T.line}`,
        }}
      >
        <SearchRoundedIcon sx={{ color: T.muted }} />
        <Box
          component="input"
          placeholder="Поиск по фамилии"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          sx={{
            flexGrow: 1,
            border: 0,
            outline: 0,
            font: T.font,
            fontSize: 15,
            bgcolor: 'transparent',
            color: T.ink,
            '&::placeholder': { color: T.muted },
          }}
        />
      </Box>

      {employees === null ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress sx={{ color: T.accent }} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {filtered.map((e) => {
            const r = rows[e.ispringUserId] || emptyRow();
            return (
              <Box
                key={e.ispringUserId}
                sx={{
                  p: 2,
                  borderRadius: `${T.radius}px`,
                  bgcolor: T.surface,
                  border: `1px solid ${rowPoints(r) > 0 ? T.accent : T.line}`,
                  boxShadow: T.shadow,
                  transition: 'border-color .12s',
                }}
              >
                {/* десктоп: имя слева, контролы в ряд; мобилка: имя сверху, контролы ниже */}
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
                      {e.lastName} {e.firstName}
                    </Typography>
                    <Typography sx={{ color: T.muted, fontSize: 13 }}>
                      {e.jobTitle}
                    </Typography>
                    {r.free && r.comment && (
                      <Typography
                        sx={{ color: T.accent, fontSize: 12.5, mt: 0.25 }}
                        noWrap
                      >
                        «{r.comment}»
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
                    {controls(e.ispringUserId)}
                  </Box>
                </Box>
              </Box>
            );
          })}
          {filtered.length === 0 && (
            <Typography sx={{ color: T.muted, textAlign: 'center', py: 4 }}>
              Никого не нашли.
            </Typography>
          )}
        </Box>
      )}

      <CommentSheet
        open={!!commentFor}
        isMobile={isMobile}
        name={
          commentEmp ? `${commentEmp.lastName} ${commentEmp.firstName}` : ''
        }
        initial={commentFor ? rows[commentFor]?.comment || '' : ''}
        onSave={(c) => {
          if (commentFor) update(commentFor, { free: true, comment: c });
          setCommentFor(null);
        }}
        onRemove={() => {
          if (commentFor) update(commentFor, { free: false, comment: '' });
          setCommentFor(null);
        }}
        onClose={() => {
          if (commentFor && !(rows[commentFor]?.comment || '').trim())
            update(commentFor, { free: false });
          setCommentFor(null);
        }}
      />

      <SubmitDialog
        open={submit.open}
        phase={submit.phase}
        spent={spent}
        count={awardCount}
        result={submit.result}
        errorText={submit.errorText}
        onConfirm={doSubmit}
        onClose={closeSubmit}
      />
    </>
  );
}
