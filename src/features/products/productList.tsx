/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CardContent,
  Typography,
  Button,
  Box,
  Modal,
  TextField,
  CircularProgress,
  Chip,
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
    old_price: '',
    description: '',
    remains: '',
    imageFiles: [] as File[],
    image_urls: [] as string[],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = (product: any) => {
    setSelectedProduct(product);
    const images =
      product.image_urls || (product.image_url ? [product.image_url] : []);
    setForm({
      name: product.name,
      size: product.size ?? '',
      price: String(product.price),
      old_price: product.old_price ? String(product.old_price) : '',
      description: product.description ?? '',
      remains: String(product.remains),
      imageFiles: [],
      image_urls: images,
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
      old_price: '',
      description: '',
      remains: '',
      imageFiles: [],
      image_urls: [],
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const currentTotal = form.image_urls.length + form.imageFiles.length;
      const available = 3 - currentTotal;
      const fileArray = Array.from(files).slice(0, available);
      setForm((prev) => ({
        ...prev,
        imageFiles: [...prev.imageFiles, ...fileArray],
      }));
    }
  };

  const removeExistingImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index),
    }));
  };

  const removeNewImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!selectedProduct) return;

    const image_urls = [...form.image_urls];

    // Загружаем новые изображения
    for (const file of form.imageFiles) {
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

      image_urls.push(publicData?.publicUrl || '');
    }

    await updateProduct({
      id: selectedProduct.id,
      remains: Number(form.remains),
      name: form.name,
      size: form.size || null,
      price: Number(form.price),
      old_price: form.old_price ? Number(form.old_price) : null,
      description: form.description || null,
      image_urls: image_urls.length > 0 ? image_urls : null,
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
          const images = p.image_urls || (p.image_url ? [p.image_url] : []);
          const mainImage = images[0] || '/placeholder.png';

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
                {images.length > 1 && (
                  <div className={styles.imageCount}>{images.length} фото</div>
                )}
                <img src={mainImage} alt={p.name} className={styles.image} />
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
                <Box
                  display="flex"
                  gap={1}
                  alignItems="baseline"
                  flexWrap="wrap"
                >
                  <Typography component="span">Цена: {p.price}</Typography>
                  {hasDiscount && (
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{ textDecoration: 'line-through' }}
                    >
                      {p.old_price}
                    </Typography>
                  )}
                  <Typography component="span">{pluralPrice}</Typography>
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

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Изображения (макс. 3)
            </Typography>

            {/* Существующие изображения */}
            {form.image_urls.length > 0 && (
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary">
                  Текущие изображения:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                  {form.image_urls.map((_, index) => (
                    <Chip
                      key={index}
                      label={`Изображение ${index + 1}`}
                      onDelete={() => removeExistingImage(index)}
                      sx={{ maxWidth: 150 }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Новые изображения */}
            {form.imageFiles.length > 0 && (
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary">
                  Новые изображения:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                  {form.imageFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      onDelete={() => removeNewImage(index)}
                      color="primary"
                      sx={{ maxWidth: 150 }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              disabled={form.image_urls.length + form.imageFiles.length >= 3}
            >
              Добавить изображения
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              style={{ display: 'none' }}
              multiple
            />
            <Typography variant="caption" display="block" mt={1}>
              {form.image_urls.length + form.imageFiles.length}/3 изображений
            </Typography>
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
