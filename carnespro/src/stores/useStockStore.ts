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
  movements: [
    { id: '1', date: '2024-04-16T10:30:00', type: 'entry', productName: 'Vacío', quantity: 120, unit: 'kg', supplier: 'Frigorífico Martínez', note: 'Ingreso semanal' },
    { id: '2', date: '2024-04-16T11:15:00', type: 'exit', productName: 'Pollo entero', quantity: 5, unit: 'un', note: 'Venta ticket #V-0064' },
  ],
  addMovement: (movement) => set((state) => ({ 
    movements: [movement, ...state.movements] 
  })),
}));
