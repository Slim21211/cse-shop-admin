/* eslint-disable @typescript-eslint/no-explicit-any */
import { Box, Collapse, IconButton, Typography } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import  plural from 'plural-ru'

type OrderCardProps = {
  order: any
  isOpen: boolean
  toggle: () => void
}

const OrderCard = ({ order, isOpen, toggle }: OrderCardProps) => {
  const pluralCommonPrice = plural(order.total_cost, 'балл', 'балла', 'баллов');
  
  return (
    <Box mb={2} p={2} border="1px solid #ccc" borderRadius={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Заказ #{order.id}</Typography>
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
      <Typography>
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
      </Typography>
      <Typography>
        Дата: {new Date(order.created_at).toISOString().replace('T', ' ').substring(0, 19)}
      </Typography>
      <Typography>Сумма: {order.total_cost} { pluralCommonPrice }</Typography>

      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <Box mt={2}>
          <Typography variant="subtitle1" gutterBottom>
            Товары:
          </Typography>
          {order.items.map((item: any, idx: number) => {
            const pluralPrice = plural(item.price * item.quantity, 'балл', 'балла', 'баллов');
            return (<Box key={idx} mb={1} pl={1}>
              <Typography>• {item.name}</Typography>
              <Typography variant="body2">
                Цена: {item.price * item.quantity} {pluralPrice}
              </Typography>
            </Box>)
          })}
        </Box>
      </Collapse>
    </Box>
  )
}

export default OrderCard