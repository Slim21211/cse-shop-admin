import { Card, CardContent, Typography, Button, Grid } from '@mui/material'
import { useGetGiftProductsQuery, useDeleteProductMutation } from '../products/api'

export const GiftsList = () => {
  const { data, isLoading } = useGetGiftProductsQuery()
  const [deleteProduct] = useDeleteProductMutation()

  if (isLoading) return <p>Загрузка...</p>

  return (
    <Grid container spacing={2}>
      {data?.map((gift) => (
        <Grid item xs={12} sm={6} md={4} key={gift.id}>
          <Card>
            <CardContent>
              <Typography variant="h6" noWrap>{gift.name}</Typography>
              <Typography>Цена: {gift.price} ₽</Typography>
              <Typography>Остаток: {gift.remains}</Typography>
              <Button color="error" onClick={() => deleteProduct(gift.id)}>
                Удалить
              </Button>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
