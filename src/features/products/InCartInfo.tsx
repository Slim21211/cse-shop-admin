import { Box, Button, Typography } from '@mui/material';
import { type Product, useClearProductFromCartsMutation } from './api';

/**
 * «В корзинах: N шт.» + кнопка убрать товар из корзин всех пользователей.
 * Пока товар в корзинах, его нельзя удалить, а корзина показывает старую цену.
 */
export function InCartInfo({ product }: { product: Product }) {
  const [clear, { isLoading }] = useClearProductFromCartsMutation();
  const count = product.in_cart || 0;

  const handleClear = async () => {
    if (
      !window.confirm(
        `Убрать «${product.name}» из корзин всех пользователей (${count} шт.)? Пользователи увидят, что товар пропал из корзины.`,
      )
    )
      return;
    const result = await clear(product.id);
    if ('error' in result)
      alert(
        'Не удалось очистить корзины: ' +
          ((result.error as { data?: { message?: string } })?.data?.message ||
            'попробуйте ещё раз'),
      );
  };

  return (
    // mt: auto — прижать к низу карточки (родитель — flex-колонка), pt — отступ от описания
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      flexWrap="wrap"
      sx={{ mt: 'auto', pt: 1.5 }}
    >
      <Typography color={count ? 'warning.main' : 'text.secondary'}>
        В корзинах: {count} шт.
      </Typography>
      {count > 0 && (
        <Button
          size="small"
          color="warning"
          onClick={handleClear}
          disabled={isLoading}
        >
          Убрать из корзин
        </Button>
      )}
    </Box>
  );
}
