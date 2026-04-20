import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Default cost ratios for seeded products
const DEFAULT_RATIOS: Record<string, number> = {
  v1: 0.58, v2: 0.62, v3: 0.55, v4: 0.60, v5: 0.64, v6: 0.61, v7: 0.57, v8: 0.52,
  p1: 0.65, p2: 0.68, p3: 0.66,
  c1: 0.63, c2: 0.66, c3: 0.67,
  e1: 0.70, e2: 0.72, e3: 0.69,
  l1: 0.58, l2: 0.60, l3: 0.62,
};

export function defaultCostForProduct(id: string, price: number): number {
  const ratio = DEFAULT_RATIOS[id] ?? 0.65;
  return Math.round(price * ratio);
}

interface CostosState {
  costs: Record<string, number>;
  setCost: (productId: string, cost: number) => void;
  deleteCost: (productId: string) => void;
}

export const useCostosStore = create<CostosState>()(
  persist(
    (set) => ({
      costs: {},
      setCost: (productId, cost) =>
        set((s) => ({ costs: { ...s.costs, [productId]: cost } })),
      deleteCost: (productId) =>
        set((s) => {
          const next = { ...s.costs };
          delete next[productId];
          return { costs: next };
        }),
    }),
    { name: 'carnespro-costos' }
  )
);
