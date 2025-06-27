import { configureStore } from '@reduxjs/toolkit'
import { productsApi } from '../features/products/api.ts'

export const store = configureStore({
  reducer: { [productsApi.reducerPath]: productsApi.reducer },
  middleware: (gm) => gm().concat(productsApi.middleware),
})
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
