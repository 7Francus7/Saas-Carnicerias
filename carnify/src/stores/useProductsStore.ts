import { create } from 'zustand';

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
  setProducts: (products: Product[]) => void;
  addProduct: (p: Product) => void;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  products: [],
  setProducts: (products) => set({ products }),
  addProduct: (p) => set((s) => ({ products: [...s.products, p] })),
  updateProduct: (id, updates) =>
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  deleteProduct: (id) =>
    set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
}));
