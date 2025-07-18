import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Typography,
  Box,
  Collapse,
  IconButton,
} from '@mui/material'
import { useState } from 'react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { useGetOrdersQuery } from '../products/api'

const OrdersTable = () => {
  const { data: orders, error, isLoading } = useGetOrdersQuery()
  const [openRowId, setOpenRowId] = useState<number | null>(null)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Typography color="error">Ошибка загрузки заказов</Typography>
  }

  if (!orders || orders.length === 0) {
    return <Typography>Заказы не найдены</Typography>
  }

  const toggleRow = (id: number) => {
    setOpenRowId(openRowId === id ? null : id)
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell />
          <TableCell>Номер заказа</TableCell>
          <TableCell>Пользователь</TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Телеграм</TableCell>
          <TableCell>Дата</TableCell>
          <TableCell align="right">Сумма</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {orders.map((order) => (
          <>
            <TableRow key={order.id}>
              <TableCell>
                <IconButton
                  aria-label="expand row"
                  size="small"
                  onClick={() => toggleRow(order.id)}
                >
                  {openRowId === order.id ? (
                    <KeyboardArrowUpIcon />
                  ) : (
                    <KeyboardArrowDownIcon />
                  )}
                </IconButton>
              </TableCell>
              <TableCell>{order.id}</TableCell>
              <TableCell>{order.user_name}</TableCell>
              <TableCell>
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
                  {order.email}
                </a>
              </TableCell>
              <TableCell>
                <a
                  href={`https://t.me/${order.telegram_login}`}
                  target="_blank"
                  rel="noopener noreferrer"
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
                  @{order.telegram_login}
                </a>
              </TableCell>
              <TableCell>
                  {new Date(order.created_at).toISOString().replace('T', ' ').substring(0, 19)}
              </TableCell>
              <TableCell align="right">{order.total_cost} ₽</TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                <Collapse in={openRowId === order.id} timeout="auto" unmountOnExit>
                  <Box margin={1}>
                    <Typography variant="subtitle1" gutterBottom component="div">
                      Товары в заказе:
                    </Typography>
                    <Table size="small" aria-label="items">
                      <TableHead>
                        <TableRow>
                          <TableCell>Название</TableCell>
                          <TableCell>Цена</TableCell>
                          <TableCell>Количество</TableCell>
                          <TableCell>Сумма</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {order.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.price} ₽</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.price * item.quantity} ₽</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Collapse>
              </TableCell>
            </TableRow>
          </>
        ))}
      </TableBody>
    </Table>
  )
}

export default OrdersTable
