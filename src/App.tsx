import { Container, Typography } from '@mui/material'
import { AddProductForm } from './features/products/addProductForm.tsx'
import { ProductsList } from './features/products/productList.tsx'

function App() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Управление товарами
      </Typography>
      <AddProductForm />
      <ProductsList />
    </Container>
  )
}

export default App
