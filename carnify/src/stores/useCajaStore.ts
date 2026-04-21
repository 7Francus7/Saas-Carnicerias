import { create } from 'zustand';

export interface PaymentSplit {
  method: string;
  amount: number;
}

export interface CajaVenta {
  id: string;
  timestamp: string;
  total: number;
  method: string;
  itemCount: number;
  splits?: PaymentSplit[];
  clientId?: string;
  clientName?: string;
}

export interface CashTransaction {
  id: string;
  type: 'in' | 'out';
  amount: number;
  reason: string;
  timestamp: string;
}

export interface CajaSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  startingCash: number;
  ventas: CajaVenta[];
  transactions: CashTransaction[];
  realAmounts?: Record<string, number>;
  tericoByMethod?: Record<string, number>;
  diffByMethod?: Record<string, number>;
  diffAmount?: number;
}

interface CajaStore {
  currentSession: CajaSession | null;
  history: CajaSession[];
  hydrate: (session: CajaSession | null, history: CajaSession[]) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapDbSessionToStore(s: any): CajaSession {
  return {
    id: s.id,
    openedAt: new Date(s.openedAt).toISOString(),
    closedAt: s.closedAt ? new Date(s.closedAt).toISOString() : undefined,
    startingCash: s.startingCash,
    ventas: (s.sales ?? []).map((v: any) => ({
      id: v.id,
      timestamp: new Date(v.timestamp).toISOString(),
      total: v.total,
      method: v.method,
      itemCount: v.itemCount,
      splits: v.splits && v.splits.length > 1
        ? v.splits.map((sp: any) => ({ method: sp.method, amount: sp.amount }))
        : undefined,
      clientId: v.clientId ?? undefined,
      clientName: v.clientName ?? undefined,
    })),
    transactions: (s.transactions ?? []).map((t: any) => ({
      id: t.id,
      type: t.type as 'in' | 'out',
      amount: t.amount,
      reason: t.reason,
      timestamp: new Date(t.timestamp).toISOString(),
    })),
    realAmounts: s.realAmounts as Record<string, number> | undefined,
    tericoByMethod: s.tericoByMethod as Record<string, number> | undefined,
    diffByMethod: s.diffByMethod as Record<string, number> | undefined,
    diffAmount: s.diffAmount ?? undefined,
  };
}

export const useCajaStore = create<CajaStore>()((set) => ({
  currentSession: null,
  history: [],
  hydrate: (session, history) => set({ currentSession: session, history }),
}));
