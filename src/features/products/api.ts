import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '../../lib/supabase';
import plural from 'plural-ru';

// Экспортируем функцию для использования в компонентах
export const pluralizePoints = (count: number) =>
  plural(count, 'балл', 'балла', 'баллов');

export type Product = {
  id: number;
  name: string;
  size: string | null;
  price: number;
  old_price?: number | null;
  description?: string | null;
  remains: number;
  image_url?: string | null; // Для обратной совместимости
  image_urls?: string[] | null; // НОВОЕ: массив изображений
  is_gift: boolean;
};

export type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  product_id: number;
};

export type Order = {
  id: number;
  user_id: string;
  user_name: string;
  email: string;
  telegram_login?: string;
  items: OrderItem[];
  total_cost: number;
  created_at: string;
  cancelled_at?: string | null; // заказ отменён: баллы и товары возвращены
};

// Запрос к серверным функциям админки (api/*). В базу браузер больше не ходит:
// таблицы закрыты RLS, доступ — только через сервер с проверкой admin-session.
type ApiResult<T> =
  | { data: T }
  | { error: { status: number; data: { message: string } } };

async function apiRequest<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  const r = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const body = await r.json().catch(() => ({}));
  return r.ok
    ? { data: body as T }
    : {
        error: {
          status: r.status,
          data: { message: body.message || body.error || `HTTP ${r.status}` },
        },
      };
}

// Загрузка картинки товара: сервер выдаёт подписанную ссылку на конкретный путь в бакете
export async function uploadProductImage(file: File): Promise<string> {
  const signed = await apiRequest<{ path: string; token: string; publicUrl: string }>(
    '/api/products',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'upload-url', fileName: file.name }),
    }
  );
  if ('error' in signed) throw new Error(signed.error.data.message);

  const { error } = await supabase.storage
    .from('product-images')
    .uploadToSignedUrl(signed.data.path, signed.data.token, file);
  if (error) throw new Error(error.message);

  return signed.data.publicUrl;
}

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Product', 'Order'],
  endpoints: (b) => ({
    // 🎯 Мерч
    getMerchProducts: b.query<Product[], void>({
      queryFn: () => apiRequest<Product[]>('/api/products?is_gift=false'),
      providesTags: ['Product'],
    }),

    // обновление товара
    updateProductRemains: b.mutation<void, Partial<Product> & { id: number }>({
      queryFn: (product) =>
        apiRequest<void>('/api/products', {
          method: 'PATCH',
          body: JSON.stringify(product),
        }),
      invalidatesTags: ['Product'],
    }),

    // 🎁 Подарки
    getGiftProducts: b.query<Product[], void>({
      queryFn: () => apiRequest<Product[]>('/api/products?is_gift=true'),
      providesTags: ['Product'],
    }),

    // 🆕 Добавление (is_gift нужно передавать!)
    addProduct: b.mutation<void, Omit<Product, 'id'>>({
      queryFn: (prod) =>
        apiRequest<void>('/api/products', {
          method: 'POST',
          body: JSON.stringify(prod),
        }),
      invalidatesTags: ['Product'],
    }),

    deleteProduct: b.mutation<void, number>({
      queryFn: (id) =>
        apiRequest<void>('/api/products', {
          method: 'DELETE',
          body: JSON.stringify({ id }),
        }),
      invalidatesTags: ['Product'],
    }),

    // 📦 Заказы (вместе с отменёнными)
    getOrders: b.query<Order[], void>({
      queryFn: () => apiRequest<Order[]>('/api/orders'),
      providesTags: ['Order'],
    }),

    // ❌ Отмена заказа: удаление + возврат баллов (серверная функция, нужен service role и iSpring)
    cancelOrder: b.mutation<{ refunded: number; warning?: string }, number>({
      queryFn: async (orderId) => {
        const r = await fetch('/api/cancel-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const body = await r.json().catch(() => ({}));
        return r.ok
          ? // ok: false при 2xx — заказ отменён частично (остатки не обновились)
            { data: { refunded: body.refunded ?? 0, warning: body.ok === false ? body.error : undefined } }
          : { error: { status: r.status, message: body.error || `HTTP ${r.status}` } };
      },
      invalidatesTags: ['Order'],
    }),
  }),
});

export const {
  useGetMerchProductsQuery,
  useGetGiftProductsQuery,
  useAddProductMutation,
  useDeleteProductMutation,
  useGetOrdersQuery,
  useCancelOrderMutation,
  useUpdateProductRemainsMutation,
} = productsApi;
