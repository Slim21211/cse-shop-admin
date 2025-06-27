import { Button, TextField, Box } from '@mui/material'
import { useState } from 'react'
import { useAddProductMutation } from './api'

type ProductForm = {
  name: string
  size: string
  price: string
  remains: string
  image_url: string
}

export const AddProductForm = () => {
  const [form, setForm] = useState<ProductForm>({
    name: '',
    size: '',
    price: '',
    remains: '',
    image_url: '',
  })

  const [addProduct] = useAddProductMutation()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async () => {
    await addProduct({
      name: form.name,
      size: form.size,
      price: Number(form.price),
      remains: Number(form.remains),
      image_url: form.image_url || undefined,
    })
    setForm({ name: '', size: '', price: '', remains: '', image_url: '' })
  }

  const fields: (keyof ProductForm)[] = ['name', 'size', 'price', 'remains', 'image_url']

  return (
    <Box display="flex" gap={2} flexDirection="column" mb={4}>
      {fields.map((field) => (
        <TextField
          key={field}
          label={field === 'image_url' ? 'URL картинки' : field.charAt(0).toUpperCase() + field.slice(1)}
          name={field}
          type={field === 'price' || field === 'remains' ? 'number' : 'text'}
          value={form[field]}
          onChange={handleChange}
        />
      ))}
      <Button variant="contained" onClick={handleSubmit}>
        Добавить товар
      </Button>
    </Box>
  )
}
