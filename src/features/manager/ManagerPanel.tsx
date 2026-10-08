// src/features/manager/ManagerPanel.tsx — пока заглушка (реальный UI на Этапе 5).
import { Container, Typography, Alert } from '@mui/material';
import { useAuth } from '../../auth/AuthGate';

export function ManagerPanel() {
  const { userId } = useAuth();
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Начисление баллов
      </Typography>
      <Alert severity="success" sx={{ mb: 2 }}>
        Вы вошли как руководитель. Доступа к админским разделам нет — так и
        задумано.
      </Alert>
      <Typography variant="body2" color="text.secondary">
        Здесь появятся ваши подразделения и начисление. (userId: {userId})
      </Typography>
    </Container>
  );
}
