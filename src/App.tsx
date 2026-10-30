import {
  Container,
  Typography,
  Tabs,
  Tab,
  Box,
  Button,
  Fab,
} from '@mui/material';
import { useState } from 'react';
import { useAuth } from './auth/AuthGate';
import { ManagerPanel } from './features/manager/ManagerPanel';
import { AddProductForm } from './features/products/addProductForm.tsx';
import { ProductsList } from './features/products/productList.tsx';
import OrdersTable from './features/orders/ordersTable.tsx';
import { AddGiftForm } from './features/gifts/addGiftForm.tsx';
import { GiftsList } from './features/gifts/giftList.tsx';
import { PointsUpload } from './features/points/PointsUpload.tsx';
import { AwardSettingsForm } from './features/awardSettings/AwardSettingsForm.tsx';

function App() {
  const { role } = useAuth();
  const [tab, setTab] = useState(0);
  const [asManager, setAsManager] = useState(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  // Руководитель видит ТОЛЬКО свой интерфейс, без админских вкладок.
  if (role === 'manager') {
    return <ManagerPanel />;
  }

  // Суперадмин может открыть панель руководителя и вернуться обратно.
  if (role === 'superadmin' && asManager) {
    return (
      <>
        <ManagerPanel />
        <Fab
          variant="extended"
          size="small"
          onClick={() => setAsManager(false)}
          sx={{ position: 'fixed', right: 16, bottom: 16 }}
        >
          Панель администратора
        </Fab>
      </>
    );
  }

  // Админ — как раньше.
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
        {role === 'superadmin' && (
          <Button variant="outlined" onClick={() => setAsManager(true)}>
            Панель руководителя
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 4 }}>
        <Tab label="Мерч" />
        <Tab label="Подарки" />
        <Tab label="Заказы" />
        <Tab label="Начисление баллов" />
        <Tab label="Показатели" />
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
      {tab === 4 && (
        <Box>
          <AwardSettingsForm />
        </Box>
      )}
    </Container>
  );
}

export default App;
