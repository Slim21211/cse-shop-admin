import React from 'react'
import { Card, CardContent, Typography, Button, Box } from '@mui/material'
import { useGetGiftProductsQuery, useDeleteProductMutation } from '../products/api'
import styles from './giftList.module.scss' // создай такой css-модуль

export const GiftsList = () => {
  const { data, isLoading } = useGetGiftProductsQuery()
  const [deleteProduct] = useDeleteProductMutation()

  if (isLoading) return <p>Загрузка...</p>

  return (
    <div className={styles.grid}>
      {data?.map(gift => (
        <div key={gift.id} className={styles.card}>
          <Card>
            <CardContent>
              <Typography variant="h6" noWrap>{gift.name}</Typography>
              <Typography>Цена: {gift.price} ₽</Typography>
              <Typography>Остаток: {gift.remains}</Typography>
              <Box sx={{ mt: 1 }}>
                <Button color="error" onClick={() => deleteProduct(gift.id)}>Удалить</Button>
              </Box>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}

export default GiftsList
