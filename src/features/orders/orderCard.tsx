/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box, Button, Chip, Collapse, IconButton, Typography } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import  plural from 'plural-ru'

type OrderCardProps = {
  order: any
  isOpen: boolean
  toggle: () => void
  onCancel: () => void
}

const OrderCard = ({ order, isOpen, toggle, onCancel }: OrderCardProps) => {
  const pluralCommonPrice = plural(order.total_cost, 'балл', 'балла', 'баллов');
  const isCancelled = !!order.cancelled_at

  return (
    <Box mb={2} p={2} border="1px solid #ccc" borderRadius={2} sx={isCancelled ? { opacity: 0.6 } : undefined}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">
          Заказ {order.id}
          {isCancelled && <Chip label="Отменён" color="error" size="small" sx={{ ml: 1 }} />}
        </Typography>
        <IconButton size="small" onClick={toggle}>
          {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </Box>
      <Typography>Пользователь: {order.user_name}</Typography>
      <Typography>
        Почта:
        <a
          href={`mailto:${order.email}`}
          style={{
            textDecoration: 'none',
            color: '#1976d2', // цвет MUI primary
            fontWeight: 500,
          }}
          onMouseOver={(e) => {
            (e.target as HTMLAnchorElement).style.textDecoration = 'underline'
          }}
          onMouseOut={(e) => {
            (e.target as HTMLAnchorElement).style.textDecoration = 'none'
          }}
        >
          {` ${order.email}`}
        </a>
      </Typography>
      {order.telegram_login && <Typography>
        Телеграм:
        <Box
          component="a"
          href={`https://t.me/${order.telegram_login}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            textDecoration: 'none',
            color: 'primary.main',
            fontWeight: 500,
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          {` @${order.telegram_login}`}
        </Box>
      </Typography>}
      <Typography>
        Дата: {new Date(order.created_at).toISOString().replace('T', ' ').substring(0, 19)}
      </Typography>
      <Typography>Сумма: {order.total_cost} { pluralCommonPrice }</Typography>
      {!isCancelled && <Button
        size="small"
        color="error"
        startIcon={<CancelOutlinedIcon />}
        onClick={onCancel}
        sx={{ mt: 1 }}
      >
        Отменить заказ
      </Button>}

      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <Box mt={2}>
          <Typography variant="subtitle1" gutterBottom>
            Товары:
          </Typography>
          {order.items.map((item: any, idx: number) => {
            // item.price в заказе — уже сумма по позиции (цена × количество)
            const pluralPrice = plural(item.price, 'балл', 'балла', 'баллов');
            return (<Box key={idx} mb={1} pl={1}>
              <Typography>• {item.name} × {item.quantity}</Typography>
              <Typography variant="body2">
                Цена: {item.price} {pluralPrice}
              </Typography>
            </Box>)
          })}
        </Box>
      </Collapse>
    </Box>
  )
}

export default OrderCard