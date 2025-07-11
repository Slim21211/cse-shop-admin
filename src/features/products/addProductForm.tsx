/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button, TextField, Box, Typography } from '@mui/material'
import { useState, useRef } from 'react'
import { useAddProductMutation } from './api'
import { supabase } from '../../lib/supabase'

type ProductForm = {
  name: string
  size: string
  price: string
  remains: string
  imageFile: File | null
}

type Props = {
  isGift: boolean
}

function extractErrorMessage(e: unknown): string {
  if (
    typeof e === 'object' &&
    e !== null &&
    'data' in e &&
    typeof (e as any).data === 'object' &&
    (e as any).data !== null &&
    typeof (e as any).data?.message === 'string'
  ) {
    return (e as any).data!.message!
  }
  if (e instanceof Error) return e.message
  return String(e)
}

export const AddProductForm = ({ isGift }: Props) => {
  const [form, setForm] = useState<ProductForm>({
    name: '',
    size: '',
    price: '',
    remains: '',
    imageFile: null,
  })

  const [addProduct] = useAddProductMutation()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target
    if (name === 'imageFile' && files && files.length > 0) {
      setForm((prev) => ({ ...prev, imageFile: files[0] }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async () => {
    setErrorMessage(null)
    let image_url: string | undefined = undefined

    try {
      if (form.imageFile) {
        const file = form.imageFile
        const filePath = `products/${Date.now()}_${file.name}`

        const uploadResult = await supabase.storage
          .from('product-images')
          .upload(filePath, file)

        if (uploadResult.error) {
          setErrorMessage('Ошибка загрузки файла: ' + uploadResult.error.message)
          return
        }

        const publicUrlResult = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        image_url = publicUrlResult.data.publicUrl
      }

      await addProduct({
        name: form.name,
        size: form.size,
        price: Number(form.price),
        remains: Number(form.remains),
        image_url,
        is_gift: isGift,
      }).unwrap()

      setForm({ name: '', size: '', price: '', remains: '', imageFile: null })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setErrorMessage('Ошибка добавления товара: ' + extractErrorMessage(e))
    }
  }

  const onClickFileButton = () => {
    fileInputRef.current?.click()
  }

  return (
    <Box display="flex" gap={2} flexDirection="column" mb={4}>
      <TextField label="Название" name="name" value={form.name} onChange={handleChange} />
      <TextField label="Размер" name="size" value={form.size} onChange={handleChange} />
      <TextField label="Цена" name="price" type="number" value={form.price} onChange={handleChange} />
      <TextField label="Остаток" name="remains" type="number" value={form.remains} onChange={handleChange} />

      <Box display="flex" alignItems="center" gap={1}>
        <Button variant="outlined" onClick={onClickFileButton}>
          Выбрать изображение
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

      {errorMessage && <Box color="error.main">{errorMessage}</Box>}

      <Button variant="contained" onClick={handleSubmit}>
        Добавить товар
      </Button>
    </Box>
  )
}
