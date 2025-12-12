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

      // Проверяем через Supabase API
      const response = await fetch(
        `${
          import.meta.env.VITE_SUPABASE_URL
        }/rest/v1/admins?email=eq.${encodeURIComponent(email)}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        console.error('❌ Failed to check admin status:', response.status);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const data = await response.json();
      const isAdminUser = Array.isArray(data) && data.length > 0;

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
        <CircularProgress />
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
              : 'Доступ разрешен только через личный кабинет магазина.'}
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Если вы считаете, что это ошибка, обратитесь к администратору системы.
        </Typography>
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
