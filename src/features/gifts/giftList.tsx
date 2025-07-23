import { Card, CardContent, Typography, Button, Box, CircularProgress } from '@mui/material'
import { useGetGiftProductsQuery, useDeleteProductMutation } from '../products/api'
import  plural from 'plural-ru'
import styles from './giftList.module.scss'

export const GiftsList = () => {
  const { data, isLoading } = useGetGiftProductsQuery()
  const [deleteProduct] = useDeleteProductMutation()

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="300px"
        gap={2}
      >
        <CircularProgress size={48} thickness={4} />
        <Typography variant="body1" color="text.secondary">
          Загрузка подарков...
        </Typography>
      </Box>
    )
  }

  return (
    <div className={styles.grid}>
      {data?.map(gift => {
        const pluralPrice = plural(gift.price, 'балл', 'балла', 'баллов')
        return (
        <div key={gift.id} className={styles.card}>
          <Card>
            <CardContent>
              <Typography variant="h6" noWrap>{gift.name}</Typography>
              <Typography>Цена: {gift.price} {pluralPrice}</Typography>
              <Typography>Остаток: {gift.remains}</Typography>
              <Box sx={{ mt: 1 }}>
                <Button color="error" onClick={() => deleteProduct(gift.id)}>Удалить</Button>
              </Box>
            </CardContent>
          </Card>
        </div>
      )})}
    </div>
  )
}

export default GiftsList