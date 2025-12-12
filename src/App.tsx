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

// Константа для URL личного кабинета
const ACCOUNT_PAGE_URL = 'https://cse-shop.ru/account';

function App() {
  const [tab, setTab] = useState(0);
  // Используем `null` как начальное состояние, `undefined` для отсутствия email
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // Новое состояние для отслеживания необходимости редиректа
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');

      if (!email) {
        console.error('❌ No email provided in URL. Redirecting...');
        // Устанавливаем флаг для редиректа
        setShouldRedirect(true);
        setLoading(false);
        // Не продолжаем проверку, если нет email
        return;
      }

      setUserEmail(email);
      console.log('🔍 Checking admin access for:', email);

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

  // ************ Новая логика редиректа ************
  useEffect(() => {
    if (shouldRedirect) {
      // Выполняем редирект на страницу личного кабинета
      window.location.href = ACCOUNT_PAGE_URL;
    }
  }, [shouldRedirect]);
  // **********************************************

  if (loading || shouldRedirect) {
    // Показываем загрузку, пока не решится вопрос с редиректом или правами
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
            {shouldRedirect
              ? 'Перенаправление в личный кабинет...'
              : 'Проверка прав доступа...'}
          </Typography>
        </Box>
      </Container>
    );
  }

  // Оставляем сообщение "Доступ запрещен" для случаев, когда email ЕСТЬ, но он НЕ админский
  if (isAdmin === false) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Доступ запрещен
          </Typography>
          <Typography variant="body1">
            {userEmail
              ? `У пользователя ${userEmail} нет прав администратора для доступа к этой панели.`
              : `Непредвиденная ошибка при проверке доступа.`}
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Если вы считаете, что это ошибка, обратитесь к администратору системы.
        </Typography>
      </Container>
    );
  }

  // Основной контент панели администратора
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
