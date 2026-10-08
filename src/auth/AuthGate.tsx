// АДМИНКА: src/auth/AuthGate.tsx
// ЖЁСТКОЕ правило: в админку можно попасть ТОЛЬКО придя с пропуском (#t) из магазина.
// Нет пропуска в адресе -> немедленный редирект на хендофф магазина, без проверки куки.
// Магазin сам решит: залогинен -> вернёт с пропуском; нет -> отправит в ЛК.
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

const SHOP_HANDOFF_URL = 'https://cse-shop.ru/api/handoff';

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
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const t = hash.get('t');

      // Нет пропуска -> ВСЕГДА идём через магазин. Никакого входа по старой куке.
      if (!t) {
        window.location.href = SHOP_HANDOFF_URL;
        return;
      }

      try {
        // Пропуск есть -> стираем его из адреса и меняем на сессию.
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

        // Берём личность/роль из сессии (кука уже установлена ответом выше).
        const me = await fetch('/api/me');
        if (!me.ok) {
          if (!cancelled) setState({ status: 'denied' });
          return;
        }
        const data = (await me.json()) as Auth;
        if (!cancelled) setState({ status: 'authed', auth: data });
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
