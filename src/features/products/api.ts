import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import { supabase } from '../../lib/supabase'

export type Product = {
  id: number
  name: string
  size: string
  price: number
  remains: number
  image_url?: string
}

export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Product'],
  endpoints: (b) => ({
    getProducts: b.query<Product[], void>({
      queryFn: async () => {
        const { data, error } = await supabase.from('products').select('*')
        return error ? { error } : { data: data as Product[] }
      },
      providesTags: ['Product'],
    }),
    addProduct: b.mutation<void, Omit<Product, 'id'>>({
      queryFn: async (prod) => {
        const { error } = await supabase.from('products').insert([prod])
        return error ? { error } : { data: undefined }
      },
      invalidatesTags: ['Product'],
    }),
    deleteProduct: b.mutation<void, number>({
      queryFn: async (id) => {
        const { error } = await supabase.from('products').delete().eq('id', id)
        return error ? { error } : { data: undefined }
      },
      invalidatesTags: ['Product'],
    }),
  }),
})

export const {
  useGetProductsQuery,
  useAddProductMutation,
  useDeleteProductMutation,
} = productsApi
