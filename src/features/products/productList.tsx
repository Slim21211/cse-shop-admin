import {
  CardContent,
  Typography,
  Button,
  Box,
} from '@mui/material'
import { useGetProductsQuery, useDeleteProductMutation } from './api'
import styles from './productList.module.scss'

export const ProductsList = () => {
  const { data, isLoading } = useGetProductsQuery()
  const [deleteProduct] = useDeleteProductMutation()

  if (isLoading) return <p>Загрузка...</p>

  return (
    <div className={styles.grid}>
      {data?.map((p) => (
        <div key={p.id} className={styles.card}>
          <div className={styles.imageWrapper}>
            <img
              src={p.image_url || '/placeholder.png'}
              alt={p.name}
              className={styles.image}
            />
          </div>
          <CardContent className={styles.content}>
            <Typography variant="h6" noWrap>{p.name}</Typography>
            <Typography>Размер: {p.size}</Typography>
            <Typography>Цена: {p.price} ₽</Typography>
            <Typography>Остаток: {p.remains}</Typography>
          </CardContent>
          <Box className={styles.buttonWrapper}>
            <Button color="error" onClick={() => deleteProduct(p.id)}>
              Удалить
            </Button>
          </Box>
        </div>
      ))}
    </div>
  )
}
