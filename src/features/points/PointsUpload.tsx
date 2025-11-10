/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { read, utils } from 'xlsx';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface ExcelRow {
  fullName: string;
  email: string;
  points: number;
}

interface ProcessResult {
  success: boolean;
  fullName: string;
  email: string;
  points: number;
  error?: string;
}

export function PointsUpload() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [error, setError] = useState<string>('');

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setResults([]);
    setLoading(true);

    try {
      // Читаем Excel файл
      const fileData = await file.arrayBuffer();
      const workbook = read(fileData);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Пропускаем заголовок и парсим данные
      const rows: ExcelRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row[0] || !row[1]) continue; // Пропускаем пустые строки

        rows.push({
          fullName: String(row[0]).trim(),
          email: String(row[1]).trim(),
          points: Number(row[2]) || 0,
        });
      }

      if (rows.length === 0) {
        setError('Файл пустой или неверный формат');
        setLoading(false);
        return;
      }

      // Отправляем данные на бэкенд
      const response = await fetch('/api/ispring-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при обработке запроса');
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
      // Сбрасываем input для возможности повторной загрузки того же файла
      event.target.value = '';
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Начисление баллов из Excel
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Формат файла: ФИО | Почта | Баллы | Причина начисления
        </Typography>

        <Button
          component="label"
          variant="contained"
          startIcon={<CloudUploadIcon />}
          disabled={loading}
        >
          {loading ? 'Обработка...' : 'Загрузить Excel файл'}
          <input
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
          />
        </Button>

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Обработка данных...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {results.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Chip
              label={`Успешно: ${successCount}`}
              color="success"
              variant="outlined"
            />
            <Chip
              label={`Ошибок: ${errorCount}`}
              color="error"
              variant="outlined"
            />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Статус</TableCell>
                  <TableCell>ФИО</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Баллы</TableCell>
                  <TableCell>Ошибка</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      backgroundColor: result.success
                        ? 'success.light'
                        : 'error.light',
                      opacity: result.success ? 0.3 : 1,
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={result.success ? 'Успешно' : 'Ошибка'}
                        color={result.success ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{result.fullName}</TableCell>
                    <TableCell>{result.email}</TableCell>
                    <TableCell align="right">{result.points}</TableCell>
                    <TableCell>
                      {result.error && (
                        <Typography variant="body2" color="error">
                          {result.error}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
