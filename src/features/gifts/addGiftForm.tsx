/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box, Button, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useAddProductMutation } from '../products/api';

export const AddGiftForm = () => {
  const [form, setForm] = useState({
    name: '',
    price: '',
    old_price: '', // НОВОЕ
    description: '', // НОВОЕ
    remains: '',
  });

  const [addProduct] = useAddProductMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    try {
      await addProduct({
        name: form.name,
        size: null,
        price: Number(form.price),
        old_price: form.old_price ? Number(form.old_price) : null, // НОВОЕ
        description: form.description || null, // НОВОЕ
        remains: Number(form.remains),
        image_url: null,
        is_gift: true,
      }).unwrap();

      setForm({
        name: '',
        price: '',
        old_price: '', // НОВОЕ
        description: '', // НОВОЕ
        remains: '',
      });
    } catch (e: any) {
      setErrorMessage(e?.data?.message || 'Ошибка добавления подарка');
    }
  };

  return (
    <Box display="flex" gap={2} flexDirection="column" mb={4}>
      <TextField
        label="Название подарка"
        name="name"
        value={form.name}
        onChange={handleChange}
      />

      <Box display="flex" gap={2}>
        <TextField
          label="Цена"
          name="price"
          type="number"
          value={form.price}
          onChange={handleChange}
          fullWidth
        />
        <TextField
          label="Старая цена (опционально)"
          name="old_price"
          type="number"
          value={form.old_price}
          onChange={handleChange}
          fullWidth
          helperText="Для отображения скидки"
        />
      </Box>

      <TextField
        label="Описание (опционально)"
        name="description"
        value={form.description}
        onChange={handleChange}
        multiline
        rows={3}
        helperText="Краткое описание подарка"
      />

      <TextField
        label="Остаток"
        name="remains"
        type="number"
        value={form.remains}
        onChange={handleChange}
      />

      {errorMessage && <Typography color="error">{errorMessage}</Typography>}

      <Button variant="contained" onClick={handleSubmit}>
        Добавить подарок
      </Button>
    </Box>
  );
};
