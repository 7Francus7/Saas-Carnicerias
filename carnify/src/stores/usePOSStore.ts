import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number; // For weighted items, this is kg
  unit: string;
  emoji: string;
}

export interface POSState {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      cart: [],
      total: 0,
      addToCart: (item) => {
        const cart = get().cart;
        const existing = cart.find((i) => i.id === item.id);
        let newCart;
        if (existing) {
          newCart = cart.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
          );
        } else {
          newCart = [...cart, item];
        }
        set({ cart: newCart, total: calculateTotal(newCart) });
      },
      removeFromCart: (id) => {
        const newCart = get().cart.filter((i) => i.id !== id);
        set({ cart: newCart, total: calculateTotal(newCart) });
      },
      updateQuantity: (id, quantity) => {
        const newCart = get().cart.map((i) =>
          i.id === id ? { ...i, quantity } : i
        );
        set({ cart: newCart, total: calculateTotal(newCart) });
      },
      clearCart: () => set({ cart: [], total: 0 }),
    }),
    {
      name: 'carnify-cart',
    }
  )
);

function calculateTotal(cart: CartItem[]) {
  return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
}
