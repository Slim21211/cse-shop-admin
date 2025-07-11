/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box, Button, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useAddProductMutation } from '../products/api'

export const AddGiftForm = () => {
  const [form, setForm] = useState({
    name: '',
    price: '',
    remains: '',
  })

  const [addProduct] = useAddProductMutation()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    setErrorMessage(null)

    try {
      await addProduct({
        name: form.name,
        size: null,
        price: Number(form.price),
        remains: Number(form.remains),
        image_url: null,
        is_gift: true,
      }).unwrap()

      setForm({ name: '', price: '', remains: '' })
    } catch (e: any) {
      setErrorMessage(e?.data?.message || 'Ошибка добавления подарка')
    }
  }

  return (
    <Box display="flex" gap={2} flexDirection="column" mb={4}>
      <TextField label="Название подарка" name="name" value={form.name} onChange={handleChange} />
      <TextField label="Цена" name="price" type="number" value={form.price} onChange={handleChange} />
      <TextField label="Остаток" name="remains" type="number" value={form.remains} onChange={handleChange} />

      {errorMessage && <Typography color="error">{errorMessage}</Typography>}

      <Button variant="contained" onClick={handleSubmit}>
        Добавить подарок
      </Button>
    </Box>
  )
}
