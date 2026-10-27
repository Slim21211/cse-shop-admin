import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useState } from 'react'
import plural from 'plural-ru'
import { useCancelOrderMutation, type Order } from '../products/api'

type CancelOrderDialogProps = {
  order: Order | null
  onClose: () => void
}

const CancelOrderDialog = ({ order, onClose }: CancelOrderDialogProps) => {
  const [cancelOrder, { isLoading }] = useCancelOrderMutation()
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const handleClose = () => {
    if (isLoading) return
    setError(null)
    setWarning(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (!order) return
    setError(null)
    const result = await cancelOrder(order.id)
    if ('error' in result) {
      setError((result.error as { message?: string })?.message || 'Не удалось отменить заказ')
      return
    }
    if (result.data.warning) {
      setWarning(result.data.warning)
      return
    }
    onClose()
  }

  return (
    <Dialog open={!!order} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Отменить заказ {order?.id}?</DialogTitle>
      <DialogContent>
        {order && !warning && (
          <DialogContentText>
            Заказ будет удалён, товары вернутся на склад, а пользователю {order.user_name}{' '}
            вернутся {order.total_cost} {plural(order.total_cost, 'балл', 'балла', 'баллов')}{' '}
            с причиной «Отмена заказа в Магазине подарков».
          </DialogContentText>
        )}
        {warning && <Alert severity="warning">{warning}</Alert>}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          {warning ? 'Закрыть' : 'Назад'}
        </Button>
        {!warning && <Button
          color="error"
          variant="contained"
          onClick={handleConfirm}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Отменить заказ
        </Button>}
      </DialogActions>
    </Dialog>
  )
}

export default CancelOrderDialog
