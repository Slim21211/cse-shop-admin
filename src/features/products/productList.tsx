/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CardContent,
  Typography,
  Button,
  Box,
  Modal,
  TextField,
  CircularProgress,
} from '@mui/material';
import { useRef, useState } from 'react';
import {
  useGetMerchProductsQuery,
  useDeleteProductMutation,
  useUpdateProductRemainsMutation,
} from './api';
import { supabase } from '../../lib/supabase';
import plural from 'plural-ru';
import styles from './productList.module.scss';

export const ProductsList = () => {
  const { data, isLoading } = useGetMerchProductsQuery();
  const [deleteProduct] = useDeleteProductMutation();
  const [updateProduct] = useUpdateProductRemainsMutation();

  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    size: '',
    price: '',
    old_price: '', // НОВОЕ
    description: '', // НОВОЕ
    remains: '',
    imageFile: null as File | null,
    image_url: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = (product: any) => {
    setSelectedProduct(product);
    setForm({
      name: product.name,
      size: product.size ?? '',
      price: String(product.price),
      old_price: product.old_price ? String(product.old_price) : '', // НОВОЕ
      description: product.description ?? '', // НОВОЕ
      remains: String(product.remains),
      imageFile: null,
      image_url: product.image_url || '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedProduct(null);
    setForm({
      name: '',
      size: '',
      price: '',
      old_price: '', // НОВОЕ
      description: '', // НОВОЕ
      remains: '',
      imageFile: null,
      image_url: '',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, files } = target;
    if (name === 'imageFile' && files && files.length > 0) {
      setForm((prev) => ({ ...prev, imageFile: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!selectedProduct) return;

    let image_url = form.image_url;

    if (form.imageFile) {
      const file = form.imageFile;
      const filePath = `products/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        alert('Ошибка загрузки изображения: ' + uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      image_url = publicData?.publicUrl || image_url;
    }

    await updateProduct({
      id: selectedProduct.id,
      remains: Number(form.remains),
      name: form.name,
      size: form.size || null,
      price: Number(form.price),
      old_price: form.old_price ? Number(form.old_price) : null, // НОВОЕ
      description: form.description || null, // НОВОЕ
      image_url,
    });

    handleClose();
  };

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
    );
  }

  return (
    <>
      <div className={styles.grid}>
        {data?.map((p) => {
          const pluralPrice = plural(p.price, 'балл', 'балла', 'баллов');
          const hasDiscount = !!p.old_price && p.old_price > p.price;

          return (
            <div key={p.id} className={styles.card}>
              <div className={styles.imageWrapper}>
                {hasDiscount && (
                  <div className={styles.discountBadge}>
                    -
                    {Math.round(
                      ((p.old_price! - p.price) / p.old_price!) * 100
                    )}
                    %
                  </div>
                )}
                <img
                  src={p.image_url || '/placeholder.png'}
                  alt={p.name}
                  className={styles.image}
                />
              </div>
              <CardContent className={styles.content}>
                <Typography variant="h6" noWrap>
                  {p.name}
                </Typography>
                {p.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {p.description}
                  </Typography>
                )}
                <Typography>Размер: {p.size}</Typography>
                <Box display="flex" gap={1} alignItems="baseline">
                  {hasDiscount && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ textDecoration: 'line-through' }}
                    >
                      {p.old_price}
                    </Typography>
                  )}
                  <Typography>
                    Цена: {p.price} {pluralPrice}
                  </Typography>
                </Box>
                <Typography>Остаток: {p.remains}</Typography>
              </CardContent>
              <Box className={styles.buttonWrapper}>
                <Button color="error" onClick={() => deleteProduct(p.id)}>
                  Удалить
                </Button>
                <Button onClick={() => handleOpen(p)}>Изменить</Button>
              </Box>
            </div>
          );
        })}
      </div>

      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            p: 4,
            bgcolor: 'background.paper',
            borderRadius: 2,
            maxWidth: 600,
            maxHeight: '90vh',
            overflow: 'auto',
            m: '50px auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography variant="h6">
            Редактировать: {selectedProduct?.name}
          </Typography>
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
              label="Старая цена"
              name="old_price"
              type="number"
              value={form.old_price}
              onChange={handleChange}
              fullWidth
              helperText="Для скидки"
            />
          </Box>

          <TextField
            label="Описание"
            name="description"
            value={form.description}
            onChange={handleChange}
            multiline
            rows={3}
          />

          <TextField
            label="Остаток"
            name="remains"
            type="number"
            value={form.remains}
            onChange={handleChange}
          />

          <Box display="flex" alignItems="center" gap={1}>
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
            >
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
            <Button variant="contained" onClick={handleSave}>
              Сохранить
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};
