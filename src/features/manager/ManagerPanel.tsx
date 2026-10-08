// src/features/manager/ManagerPanel.tsx — Этап 5: начисление баллов руководителем.
import { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Checkbox,
  Select,
  MenuItem,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  useMediaQuery,
  useTheme,
  Snackbar,
} from '@mui/material';

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

export function ManagerPanel() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [done, setDone] = useState(false); // отправлено в этом сеансе

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
    setEmployees(null);
    setRows({});
    setSearch('');
    setDone(d.submittedThisMonth);
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
  const canSubmit =
    !done && !submitting && spent > 0 && remaining >= 0 && !invalidComment;

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
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
      if (!res.ok) {
        setToast(
          data.error === 'already submitted this month'
            ? 'В этом месяце уже начислено'
            : `Ошибка: ${data.error || res.status}`
        );
      } else {
        setToast(
          `Отправлено: ${data.sent}${data.failed ? `, с ошибкой: ${data.failed}` : ''}`
        );
        setDone(true);
      }
    } catch {
      setToast('Сеть недоступна, попробуйте ещё раз');
    } finally {
      setSubmitting(false);
    }
  };

  if (error)
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  if (departments === null)
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );

  // --- выбор подразделения ---
  if (!selected) {
    if (departments.length === 0)
      return (
        <Container sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom>
            Начисление баллов
          </Typography>
          <Alert severity="info">Нет доступных подразделений.</Alert>
        </Container>
      );
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Начисление баллов
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Выберите подразделение.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          {departments.map((d) => (
            <Card key={d.departmentId} variant="outlined">
              <CardActionArea onClick={() => openDepartment(d)}>
                <CardContent>
                  <Typography variant="h6">{d.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Код: {d.code}
                  </Typography>
                  <Box
                    sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}
                  >
                    <Chip label={`${d.headcount} чел.`} size="small" />
                    <Chip
                      label={`Бюджет ${d.budget}`}
                      size="small"
                      color="primary"
                    />
                    {d.submittedThisMonth && (
                      <Chip
                        label="начислено в этом месяце"
                        size="small"
                        color="success"
                      />
                    )}
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Container>
    );
  }

  // --- экран начисления ---
  const filtered = (employees || []).filter((e) =>
    `${e.lastName} ${e.firstName}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const Controls = (id: string) => {
    const r = rows[id] || emptyRow();
    return {
      rez: (
        <Checkbox
          checked={r.rez}
          disabled={done}
          onChange={(e) => update(id, { rez: e.target.checked })}
        />
      ),
      pro: (
        <Select
          size="small"
          value={r.pro}
          disabled={done}
          onChange={(e) => update(id, { pro: e.target.value as Pro })}
        >
          {PRO_OPTS.map((o) => (
            <MenuItem key={o} value={o}>
              {o} (+{PRO_POINTS[o]})
            </MenuItem>
          ))}
        </Select>
      ),
      unknown: (
        <Checkbox
          checked={r.unknown}
          disabled={done}
          onChange={(e) => update(id, { unknown: e.target.checked })}
        />
      ),
      free: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Checkbox
            checked={r.free}
            disabled={done}
            onChange={(e) => update(id, { free: e.target.checked })}
          />
          {r.free && (
            <TextField
              size="small"
              placeholder="Комментарий (обязательно)"
              value={r.comment}
              error={!r.comment.trim()}
              disabled={done}
              onChange={(e) => update(id, { comment: e.target.value })}
              sx={{ minWidth: 180 }}
            />
          )}
        </Box>
      ),
      total: <b>{rowPoints(r)}</b>,
    };
  };

  return (
    <Container sx={{ py: 4 }}>
      <Button
        onClick={() => {
          setSelected(null);
          loadDepartments();
        }}
        sx={{ mb: 2 }}
      >
        ← К подразделениям
      </Button>
      <Typography variant="h5" gutterBottom>
        {selected.name}
      </Typography>

      {/* липкая плашка бюджета */}
      <Paper
        elevation={2}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          p: 1.5,
          mb: 2,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
          bgcolor: remaining < 0 ? 'error.light' : undefined,
        }}
      >
        <Chip label={`Сотрудников: ${selected.headcount}`} />
        <Chip label={`Бюджет: ${selected.budget}`} color="primary" />
        <Chip label={`Начислено: ${spent}`} />
        <Chip
          label={`Остаток: ${remaining}`}
          color={remaining < 0 ? 'error' : 'default'}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" onClick={submit} disabled={!canSubmit}>
          {done ? 'Отправлено' : submitting ? 'Отправка…' : 'Отправить'}
        </Button>
      </Paper>

      {done && (
        <Alert severity="success" sx={{ mb: 2 }}>
          В этом месяце начисление по отделу отправлено. Повторная отправка
          кнопкой «Отправить» дошлёт только незавершённые.
        </Alert>
      )}
      {remaining < 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Превышен бюджет отдела на {Math.abs(remaining)}.
        </Alert>
      )}
      {invalidComment && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          У «свободного» показателя обязателен комментарий.
        </Alert>
      )}

      <TextField
        fullWidth
        size="small"
        placeholder="Поиск по фамилии…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      {employees === null ? (
        <CircularProgress />
      ) : isMobile ? (
        // мобилка — карточки
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.map((e) => {
            const c = Controls(e.ispringUserId);
            return (
              <Card key={e.ispringUserId} variant="outlined">
                <CardContent>
                  <Typography fontWeight={600}>
                    {e.lastName} {e.firstName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {e.jobTitle}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      rowGap: 0.5,
                      alignItems: 'center',
                      mt: 1,
                    }}
                  >
                    <span>Результативность</span>
                    {c.rez}
                    <span>Проактивность</span>
                    {c.pro}
                    <span>Благодарности</span>
                    {c.unknown}
                    <span>Свободный</span>
                    <Box>{c.free}</Box>
                    <span>Итог</span>
                    {c.total}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      ) : (
        // десктоп — таблица
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Сотрудник</TableCell>
              <TableCell align="center">Результативность</TableCell>
              <TableCell align="center">Проактивность</TableCell>
              <TableCell align="center">Благодарности</TableCell>
              <TableCell>Свободный</TableCell>
              <TableCell align="center">Итог</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((e) => {
              const c = Controls(e.ispringUserId);
              return (
                <TableRow key={e.ispringUserId} hover>
                  <TableCell>
                    <b>
                      {e.lastName} {e.firstName}
                    </b>
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {e.jobTitle}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{c.rez}</TableCell>
                  <TableCell align="center">{c.pro}</TableCell>
                  <TableCell align="center">{c.unknown}</TableCell>
                  <TableCell>{c.free}</TableCell>
                  <TableCell align="center">{c.total}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        message={toast || ''}
      />
    </Container>
  );
}
