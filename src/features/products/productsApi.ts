import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { supabase } from '../../lib/supabase'

export type Order = {
  id: number
  customer_name: string
  email: string
  created_at: string
  status: string
  total_price: number
}

export const ordersApi = createApi({
  reducerPath: 'ordersApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Order'],
  endpoints: (b) => ({
    getOrders: b.query<Order[], void>({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
        return error ? { error } : { data: data as Order[] }
      },
      providesTags: ['Order'],
    }),
  }),
})

export const { useGetOrdersQuery } = ordersApi
