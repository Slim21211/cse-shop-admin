/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CardContent,
  Typography,
  Button,
  Box,
  Modal,
  TextField,
  CircularProgress,
} from '@mui/material'
import { useRef, useState } from 'react'
import {
  useGetMerchProductsQuery,
  useDeleteProductMutation,
  useUpdateProductRemainsMutation,
} from './api'
import { supabase } from '../../lib/supabase'
import  plural from 'plural-ru'
import styles from './productList.module.scss'

export const ProductsList = () => {
  const { data, isLoading } = useGetMerchProductsQuery()
  const [deleteProduct] = useDeleteProductMutation()
  const [updateProduct] = useUpdateProductRemainsMutation()

  const [open, setOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [form, setForm] = useState({
    name: '',
    size: '',
    price: '',
    remains: '',
    imageFile: null as File | null,
    image_url: '',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpen = (product: any) => {
    setSelectedProduct(product)
    setForm({
      name: product.name,
      size: product.size ?? '',
      price: String(product.price),
      remains: String(product.remains),
      imageFile: null,
      image_url: product.image_url || '',
    })
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setSelectedProduct(null)
    setForm({
      name: '',
      size: '',
      price: '',
      remains: '',
      imageFile: null,
      image_url: '',
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target
    if (name === 'imageFile' && files && files.length > 0) {
      setForm((prev) => ({ ...prev, imageFile: files[0] }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSave = async () => {
    if (!selectedProduct) return

    let image_url = form.image_url

    if (form.imageFile) {
      const file = form.imageFile
      const filePath = `products/${Date.now()}_${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (uploadError) {
        alert('Ошибка загрузки изображения: ' + uploadError.message)
        return
      }

      const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      image_url = publicData?.publicUrl || image_url
    }

    await updateProduct({
      id: selectedProduct.id,
      remains: Number(form.remains),
      name: form.name,
      size: form.size,
      price: Number(form.price),
      image_url,
    })

    handleClose()
  }

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
          Загрузка товаров...
        </Typography>
      </Box>
    )
  }

  return (
    <>
      <div className={styles.grid}>
        {data?.map((p) => {
          const pluralPrice = plural(p.price, 'балл', 'балла', 'баллов')
          return(
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
              <Typography>Цена: {p.price} {pluralPrice}</Typography>
              <Typography>Остаток: {p.remains}</Typography>
            </CardContent>
            <Box className={styles.buttonWrapper}>
              <Button color="error" onClick={() => deleteProduct(p.id)}>Удалить</Button>
              <Button onClick={() => handleOpen(p)}>Изменить</Button>
            </Box>
          </div>
        )})}
      </div>

      <Modal open={open} onClose={handleClose}>
        <Box sx={{
          p: 4,
          bgcolor: 'background.paper',
          borderRadius: 2,
          maxWidth: 500,
          m: '100px auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          <Typography variant="h6">Редактировать: {selectedProduct?.name}</Typography>
          <TextField label="Название" name="name" value={form.name} onChange={handleChange} />
          <TextField label="Размер" name="size" value={form.size} onChange={handleChange} />
          <TextField label="Цена" name="price" type="number" value={form.price} onChange={handleChange} />
          <TextField label="Остаток" name="remains" type="number" value={form.remains} onChange={handleChange} />
          
          <Box display="flex" alignItems="center" gap={1}>
            <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>
              Заменить изображение
            </Button>
            <input
              type="file"
              name="imageFile"
              accept="image/*"
              onChange={handleChange}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            {form.imageFile && (
              <Typography variant="caption" noWrap maxWidth={200}>
                {form.imageFile.name}
              </Typography>
            )}
          </Box>

          <Box display="flex" gap={2}>
            <Button onClick={handleClose}>Отмена</Button>
            <Button variant="contained" onClick={handleSave}>Сохранить</Button>
          </Box>
        </Box>
      </Modal>
    </>
  )
}
