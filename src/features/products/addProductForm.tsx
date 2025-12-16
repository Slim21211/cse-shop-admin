/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button, TextField, Box, Typography, Chip } from '@mui/material';
import { useState, useRef } from 'react';
import { useAddProductMutation } from './api';
import { supabase } from '../../lib/supabase';

type ProductForm = {
  name: string;
  size: string;
  price: string;
  old_price: string;
  description: string;
  remains: string;
  imageFiles: File[]; // ИЗМЕНЕНО: массив файлов
};

type Props = {
  isGift: boolean;
};

function extractErrorMessage(e: unknown): string {
  if (
    typeof e === 'object' &&
    e !== null &&
    'data' in e &&
    typeof (e as any).data === 'object' &&
    (e as any).data !== null &&
    typeof (e as any).data?.message === 'string'
  ) {
    return (e as any).data!.message!;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

export const AddProductForm = ({ isGift }: Props) => {
  const [form, setForm] = useState<ProductForm>({
    name: '',
    size: '',
    price: '',
    old_price: '',
    description: '',
    remains: '',
    imageFiles: [], // ИЗМЕНЕНО
  });

  const [addProduct] = useAddProductMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files).slice(0, 3); // Максимум 3 изображения
      setForm((prev) => ({ ...prev, imageFiles: fileArray }));
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    const image_urls: string[] = [];

    try {
      // Загружаем все изображения
      for (const file of form.imageFiles) {
        const filePath = `products/${Date.now()}_${file.name}`;

        const uploadResult = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadResult.error) {
          setErrorMessage(
            'Ошибка загрузки файла: ' + uploadResult.error.message
          );
          return;
        }

        const publicUrlResult = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        image_urls.push(publicUrlResult.data.publicUrl);
      }

      await addProduct({
        name: form.name,
        size: form.size || null,
        price: Number(form.price),
        old_price: form.old_price ? Number(form.old_price) : null,
        description: form.description || null,
        remains: Number(form.remains),
        image_urls: image_urls.length > 0 ? image_urls : null, // ИЗМЕНЕНО
        is_gift: isGift,
      }).unwrap();

      setForm({
        name: '',
        size: '',
        price: '',
        old_price: '',
        description: '',
        remains: '',
        imageFiles: [],
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setErrorMessage('Ошибка добавления товара: ' + extractErrorMessage(e));
    }
  };

  const onClickFileButton = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box display="flex" gap={2} flexDirection="column" mb={4}>
      <TextField
        label="Название"
        name="name"
        value={form.name}
        onChange={handleChange}
      />
      <TextField
        label="Размер"
        name="size"
        value={form.size}
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
        helperText="Краткое описание товара"
      />

      <TextField
        label="Остаток"
        name="remains"
        type="number"
        value={form.remains}
        onChange={handleChange}
      />

      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Button variant="outlined" onClick={onClickFileButton}>
            Выбрать изображения (макс. 3)
          </Button>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
          />
        </Box>

        {form.imageFiles.length > 0 && (
          <Box display="flex" gap={1} flexWrap="wrap">
            {form.imageFiles.map((file, index) => (
              <Chip
                key={index}
                label={`${index + 1}. ${file.name}`}
                onDelete={() => removeImage(index)}
                sx={{ maxWidth: 200 }}
              />
            ))}
          </Box>
        )}

        <Typography variant="caption" color="text.secondary">
          {form.imageFiles.length}/3 изображений
        </Typography>
      </Box>

      {errorMessage && <Box color="error.main">{errorMessage}</Box>}

      <Button variant="contained" onClick={handleSubmit}>
        Добавить товар
      </Button>
    </Box>
  );
};
