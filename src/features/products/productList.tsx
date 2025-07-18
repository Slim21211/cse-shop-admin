import {
  CardContent,
  Typography,
  Button,
  Box,
  Modal,
  TextField,
} from '@mui/material'
import { useState } from 'react'
import {
  useGetMerchProductsQuery,
  useDeleteProductMutation,
  useUpdateProductRemainsMutation,
} from './api'
import styles from './productList.module.scss'

export const ProductsList = () => {
  const { data, isLoading } = useGetMerchProductsQuery()
  const [deleteProduct] = useDeleteProductMutation()
  const [updateRemains] = useUpdateProductRemainsMutation()

  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [newRemains, setNewRemains] = useState('')

  const handleOpen = (id: number, current: number) => {
    setSelectedId(id)
    setNewRemains(String(current))
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setSelectedId(null)
    setNewRemains('')
  }

  const handleSave = async () => {
    if (selectedId !== null) {
      await updateRemains({ id: selectedId, remains: Number(newRemains) })
    }
    handleClose()
  }

  if (isLoading) return <p>Загрузка...</p>

  return (
    <>
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
              <Button color="error" onClick={() => deleteProduct(p.id)}>Удалить</Button>
              <Button onClick={() => handleOpen(p.id, p.remains)}>Изменить</Button>
            </Box>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={handleClose}>
        <Box sx={{
          p: 4,
          bgcolor: 'background.paper',
          borderRadius: 2,
          maxWidth: 400,
          m: '100px auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          <Typography variant="h6">Изменить остаток</Typography>
          <TextField
            type="number"
            label="Новое значение"
            value={newRemains}
            onChange={(e) => setNewRemains(e.target.value)}
          />
          <Box display="flex" gap={2}>
            <Button onClick={handleClose}>Отмена</Button>
            <Button variant="contained" onClick={handleSave}>Сохранить</Button>
          </Box>
        </Box>
      </Modal>
    </>
  )
}
