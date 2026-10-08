// src/auth/AuthGate.tsx — ФИНАЛ (без диагностического вывода ошибок).
// На старте: пропуск из магазина (#t) -> сессия; иначе проверка /api/me; иначе -> в ЛК магазина.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  Container,
  Box,
  CircularProgress,
  Typography,
  Alert,
} from '@mui/material';

const SHOP_ACCOUNT_URL = 'https://cse-shop.ru/account';

export type Role = 'admin' | 'manager';
interface Auth {
  userId: string;
  role: Role;
}

const AuthContext = createContext<Auth | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): Auth {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used within <AuthGate>');
  return v;
}

type State =
  | { status: 'loading' }
  | { status: 'authed'; auth: Auth }
  | { status: 'denied' };

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) пропуск из магазина в hash (#t=...)
        const hash = new URLSearchParams(
          window.location.hash.replace(/^#/, '')
        );
        const t = hash.get('t');
        if (t) {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
          );
          const r = await fetch('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ t }),
          });
          if (!r.ok) {
            if (!cancelled) setState({ status: 'denied' });
            return;
          }
        }

        // 2) есть ли рабочая сессия
        const me = await fetch('/api/me');
        if (me.ok) {
          const data = (await me.json()) as Auth;
          if (!cancelled) setState({ status: 'authed', auth: data });
          return;
        }

        // 3) нет — в ЛК магазина (но если был хендофф и всё равно нет сессии — отказ)
        if (t) {
          if (!cancelled) setState({ status: 'denied' });
        } else {
          window.location.href = SHOP_ACCOUNT_URL;
        }
      } catch {
        if (!cancelled) setState({ status: 'denied' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <Container
        sx={{
          py: 4,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Проверка доступа…
          </Typography>
        </Box>
      </Container>
    );
  }

  if (state.status === 'denied') {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Доступ запрещён
          </Typography>
          <Typography variant="body2">
            У вашей учётной записи нет прав для доступа к этой панели.
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <AuthContext.Provider value={state.auth}>{children}</AuthContext.Provider>
  );
}
