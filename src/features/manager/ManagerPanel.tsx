import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import {
  T,
  useFont,
  type Department,
  type Employee,
  type Row,
  type SubmitPhase,
  emptyRow,
  rowPoints,
} from './types';
import { DepartmentList } from './components/DepartmentList';
import { LockedDepartmentView } from './components/LockedDepartmentView';
import { BudgetBar } from './components/BudgetBar';
import { EmployeeList } from './components/EmployeeList';
import { CommentSheet } from './components/CommentSheet';
import { SubmitDialog } from './components/SubmitDialog';

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
    }
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
  if (!selected)
    return page(
      <DepartmentList departments={departments} onSelect={openDepartment} />
    );
  if (selected.submittedThisMonth)
    return page(
      <LockedDepartmentView
        department={selected}
        onBack={() => {
          setSelected(null);
          loadDepartments();
        }}
      />
    );

  const filtered = (employees || []).filter((e) =>
    `${e.lastName} ${e.firstName}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );
  const commentEmp = commentFor
    ? (employees || []).find((e) => e.ispringUserId === commentFor)
    : null;

  return page(
    <>
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

      <Typography
        sx={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em' }}
      >
        {selected.name}
      </Typography>

      <BudgetBar
        selected={selected}
        spent={spent}
        remaining={remaining}
        canSubmit={canSubmit}
        onSubmitClick={() => setSubmit({ open: true, phase: 'confirm' })}
      />

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
        <EmployeeList
          employees={filtered}
          rows={rows}
          onUpdate={update}
          onOpenComment={(id) => setCommentFor(id)}
        />
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
