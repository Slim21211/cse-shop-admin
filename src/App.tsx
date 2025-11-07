import { Container, Typography, Tabs, Tab, Box } from '@mui/material';
import { useState } from 'react';
import { AddProductForm } from './features/products/addProductForm.tsx';
import { ProductsList } from './features/products/productList.tsx';
import OrdersTable from './features/orders/ordersTable.tsx';
import { AddGiftForm } from './features/gifts/addGiftForm.tsx';
import { GiftsList } from './features/gifts/giftList.tsx';
import { PointsUpload } from './features/points/PointsUpload.tsx';

function App() {
  const [tab, setTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Панель администратора
      </Typography>

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
