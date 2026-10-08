// src/features/manager/ManagerPanel.tsx — Этап 3: реальные отделы + сотрудники.
// Начисление (4 чекбокса, бюджет, submit) появится на Этапе 5.
import { useEffect, useState } from 'react';
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
  List,
  ListItem,
  ListItemText,
  Button,
} from '@mui/material';

interface Department {
  departmentId: string;
  name: string;
  code: string;
  headcount: number;
  budget: number;
}
interface Employee {
  ispringUserId: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
}

export function ManagerPanel() {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [empLoading, setEmpLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/manager/departments');
        if (!r.ok) throw new Error('Не удалось загрузить подразделения');
        const data = await r.json();
        setDepartments(data.departments || []);
      } catch (e) {
        setError(String((e as Error).message || e));
      }
    })();
  }, []);

  const openDepartment = async (d: Department) => {
    setSelected(d);
    setEmployees(null);
    setEmpLoading(true);
    try {
      const r = await fetch(
        `/api/manager/employees?departmentId=${encodeURIComponent(d.departmentId)}`
      );
      if (!r.ok) throw new Error('Не удалось загрузить сотрудников');
      const data = await r.json();
      setEmployees(data.employees || []);
    } catch {
      setEmployees([]);
    } finally {
      setEmpLoading(false);
    }
  };

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }
  if (departments === null) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }
  if (departments.length === 0) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Начисление баллов
        </Typography>
        <Alert severity="info">
          Нет доступных подразделений для начисления.
        </Alert>
      </Container>
    );
  }

  // Экран сотрудников выбранного отдела
  if (selected) {
    return (
      <Container sx={{ py: 4 }}>
        <Button onClick={() => setSelected(null)} sx={{ mb: 2 }}>
          ← К подразделениям
        </Button>
        <Typography variant="h5" gutterBottom>
          {selected.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip label={`Код: ${selected.code}`} size="small" />
          <Chip label={`Сотрудников: ${selected.headcount}`} size="small" />
          <Chip
            label={`Бюджет: ${selected.budget}`}
            size="small"
            color="primary"
          />
        </Box>
        {empLoading && <CircularProgress />}
        {employees && (
          <List dense>
            {employees.map((e) => (
              <ListItem key={e.ispringUserId} divider>
                <ListItemText
                  primary={`${e.lastName} ${e.firstName}`}
                  secondary={e.jobTitle}
                />
              </ListItem>
            ))}
          </List>
        )}
        <Alert severity="info" sx={{ mt: 2 }}>
          Начисление по показателям появится на следующем этапе.
        </Alert>
      </Container>
    );
  }

  // Экран выбора подразделения
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
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip label={`${d.headcount} чел.`} size="small" />
                  <Chip
                    label={`Бюджет ${d.budget}`}
                    size="small"
                    color="primary"
                  />
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Container>
  );
}
