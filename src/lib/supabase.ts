import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Публичный publishable-ключ (он и так виден в браузере) — нужен только для загрузки
// картинок по подписанной ссылке. Берётся из env, чтобы при смене ключа не править код.
// Клиент создаётся при первом обращении: без env падает только загрузка, а не вся админка.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      'Не заданы VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY'
    );
  client = createClient(url, key);
  return client;
}
