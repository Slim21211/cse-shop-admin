import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  useGetGiftProductsQuery,
  useDeleteProductMutation,
  pluralizePoints,
} from '../products/api';
import styles from './giftList.module.scss';

export const GiftsList = () => {
  const { data, isLoading } = useGetGiftProductsQuery();
  const [deleteProduct] = useDeleteProductMutation();

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
          Загрузка подарков...
        </Typography>
      </Box>
    );
  }

  return (
    <div className={styles.grid}>
      {data?.map((gift) => {
        const hasDiscount = !!gift.old_price && gift.old_price > gift.price;
        const pluralPrice = pluralizePoints(gift.price);

        return (
          <div key={gift.id} className={styles.card}>
            <Card>
              <CardContent>
                <Typography variant="h6" noWrap>
                  {gift.name}
                </Typography>
                {gift.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      mb: 1,
                    }}
                  >
                    {gift.description}
                  </Typography>
                )}
                <Box
                  display="flex"
                  gap={1}
                  alignItems="baseline"
                  flexWrap="wrap"
                >
                  <Typography component="span">Цена: {gift.price}</Typography>
                  {hasDiscount && (
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{ textDecoration: 'line-through' }}
                    >
                      {gift.old_price}
                    </Typography>
                  )}
                  <Typography component="span">{pluralPrice}</Typography>
                </Box>
                <Typography>Остаток: {gift.remains}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Button color="error" onClick={() => deleteProduct(gift.id)}>
                    Удалить
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default GiftsList;
