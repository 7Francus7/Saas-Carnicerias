import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POS_PRODUCTS } from '@/lib/constants';

export interface Product {
  id: string;
  plu: string;
  name: string;
  category: string;
  emoji: string;
  price: number;
  unit: string;
}

interface ProductsState {
  products: Product[];
  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => void;
}

export const useProductsStore = create<ProductsState>()(
  persist(
    (set) => ({
      products: POS_PRODUCTS as Product[],
      addProduct: (p) =>
        set((s) => ({
          products: [...s.products, { ...p, id: `p_${Date.now()}` }],
        })),
      updateProduct: (id, updates) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deleteProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
    }),
    { name: 'carnespro-products' }
  )
);
