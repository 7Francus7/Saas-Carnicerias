import { create } from 'zustand';

export interface StockMovement {
  id: string;
  date: string;
  type: 'entry' | 'exit' | 'adjustment';
  productName: string;
  quantity: number;
  unit: string;
  supplier?: string;
  note?: string;
}

export interface StockState {
  movements: StockMovement[];
  addMovement: (movement: StockMovement) => void;
}

export const useStockStore = create<StockState>((set) => ({
  movements: [],
  addMovement: (movement) => set((state) => ({ 
    movements: [movement, ...state.movements] 
  })),
}));
