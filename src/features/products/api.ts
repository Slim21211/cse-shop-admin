import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '../../lib/supabase';

export type Product = {
  id: number;
  name: string;
  size: string | null;
  price: number;
  old_price?: number | null; // НОВОЕ
  description?: string | null; // НОВОЕ
  remains: number;
  image_url?: string | null;
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
};

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Product', 'Order'],
  endpoints: (b) => ({
    // 🎯 Мерч
    getMerchProducts: b.query<Product[], void>({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_gift', false);

        return error ? { error } : { data: data as Product[] };
      },
      providesTags: ['Product'],
    }),

    // обновление количества товаров
    updateProductRemains: b.mutation<void, Partial<Product> & { id: number }>({
      queryFn: async ({ id, ...rest }) => {
        const { error } = await supabase
          .from('products')
          .update(rest)
          .eq('id', id);
        return error ? { error } : { data: undefined };
      },
      invalidatesTags: ['Product'],
    }),

    // 🎁 Подарки
    getGiftProducts: b.query<Product[], void>({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_gift', true);

        return error ? { error } : { data: data as Product[] };
      },
      providesTags: ['Product'],
    }),

    // 🆕 Добавление (is_gift нужно передавать!)
    addProduct: b.mutation<void, Omit<Product, 'id'>>({
      queryFn: async (prod) => {
        const { error } = await supabase.from('products').insert([prod]);
        return error ? { error } : { data: undefined };
      },
      invalidatesTags: ['Product'],
    }),

    deleteProduct: b.mutation<void, number>({
      queryFn: async (id) => {
        const { error } = await supabase.from('products').delete().eq('id', id);
        return error ? { error } : { data: undefined };
      },
      invalidatesTags: ['Product'],
    }),

    // 📦 Заказы
    getOrders: b.query<Order[], void>({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        return error ? { error } : { data: data as Order[] };
      },
      providesTags: ['Order'],
    }),
  }),
});

export const {
  useGetMerchProductsQuery,
  useGetGiftProductsQuery,
  useAddProductMutation,
  useDeleteProductMutation,
  useGetOrdersQuery,
  useUpdateProductRemainsMutation,
} = productsApi;
