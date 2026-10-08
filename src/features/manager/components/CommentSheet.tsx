import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Drawer,
  Dialog,
} from '@mui/material';
import { T } from '../types';

interface CommentSheetProps {
  open: boolean;
  isMobile: boolean;
  name: string;
  initial: string;
  onSave: (c: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function CommentSheet({
  open,
  isMobile,
  name,
  initial,
  onSave,
  onRemove,
  onClose,
}: CommentSheetProps) {
  const [val, setVal] = useState(initial);

  useEffect(() => {
    if (open) setVal(initial);
  }, [open, initial]);

  const body = (
    <Box sx={{ p: 3, font: T.font }}>
      <Typography sx={{ fontWeight: 700, fontSize: 18, color: T.ink }}>
        Свободный показатель
      </Typography>
      <Typography sx={{ color: T.muted, fontSize: 14, mb: 2 }}>
        {name} · +10 баллов
      </Typography>
      <TextField
        autoFocus
        fullWidth
        multiline
        minRows={3}
        placeholder="За что начисляется — обязательно"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, font: T.font } }}
      />
      <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
        <Button
          onClick={onRemove}
          color="inherit"
          sx={{ color: T.muted, textTransform: 'none' }}
        >
          Убрать
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          onClick={onClose}
          color="inherit"
          sx={{ textTransform: 'none' }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!val.trim()}
          onClick={() => onSave(val.trim())}
          sx={{ textTransform: 'none', borderRadius: 2, bgcolor: T.accent }}
        >
          Сохранить
        </Button>
      </Box>
    </Box>
  );

  if (isMobile)
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
        }}
      >
        {body}
      </Drawer>
    );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {body}
    </Dialog>
  );
}
