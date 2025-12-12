import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase'; // ИСПОЛЬЗУЕМ СУЩЕСТВУЮЩИЙ КЛИЕНТ
import { AddProductForm } from './features/products/addProductForm.tsx';
import { ProductsList } from './features/products/productList.tsx';
import OrdersTable from './features/orders/ordersTable.tsx';
import { AddGiftForm } from './features/gifts/addGiftForm.tsx';
import { GiftsList } from './features/gifts/giftList.tsx';
import { PointsUpload } from './features/points/PointsUpload.tsx';

function App() {
  const [tab, setTab] = useState(0);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Получаем email из query параметра
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');

      if (!email) {
        console.error('❌ No email provided in URL');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setUserEmail(email);
      console.log('🔍 Checking admin access for:', email);

      // ПРАВИЛЬНО: Используем Supabase клиент
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('❌ Supabase error:', error);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('📡 Admin check result:', data);

      const isAdminUser = !!data;

      console.log(
        isAdminUser ? '✅ Admin access granted' : '❌ Admin access denied'
      );
      setIsAdmin(isAdminUser);
    } catch (error) {
      console.error('❌ Error checking admin access:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  if (loading) {
    return (
      <Container
        sx={{
          py: 4,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Проверка прав доступа...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (isAdmin === false) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Доступ запрещен
          </Typography>
          <Typography variant="body1">
            {userEmail
              ? `У пользователя ${userEmail} нет прав администратора.`
              : 'Не указан email в параметрах URL. Перейдите через личный кабинет магазина.'}
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Если вы считаете, что это ошибка, обратитесь к администратору системы.
        </Typography>
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Откройте консоль разработчика (F12) для просмотра логов отладки.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h4">Панель администратора</Typography>
        <Typography variant="body2" color="text.secondary">
          {userEmail}
        </Typography>
      </Box>

      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 4 }}>
        <Tab label="Мерч" />
        <Tab label="Подарки" />
        <Tab label="Заказы" />
        <Tab label="Начисление баллов" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <AddProductForm isGift={false} />
          <ProductsList />
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <AddGiftForm />
          <GiftsList />
        </Box>
      )}

      {tab === 2 && (
        <Box>
          <OrdersTable />
        </Box>
      )}

      {tab === 3 && (
        <Box>
          <PointsUpload />
        </Box>
      )}
    </Container>
  );
}

export default App;
