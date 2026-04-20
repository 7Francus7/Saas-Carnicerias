import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PaymentSplit {
  method: string;
  amount: number;
}

export interface CajaVenta {
  id: string;
  timestamp: string;
  total: number;
  method: string;        // primary method or 'mixed'
  itemCount: number;
  splits?: PaymentSplit[]; // present when multiple methods used
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
  // Arqueo results — filled on close
  realAmounts?: Record<string, number>;  // employee's counted/verified amount per method
  tericoByMethod?: Record<string, number>; // system expected per method
  diffByMethod?: Record<string, number>;  // real - teorico per method
  diffAmount?: number;                    // total diff (sum, fiado excluded)
}

interface CajaStore {
  currentSession: CajaSession | null;
  history: CajaSession[];
  openCaja: (startingCash: number) => void;
  closeCaja: (realAmounts: Record<string, number>) => void;
  recordSale: (total: number, splits: PaymentSplit[], itemCount?: number, clientId?: string, clientName?: string) => void;
  addTransaction: (type: 'in' | 'out', amount: number, reason: string) => void;
}

const VERIFIABLE_METHODS = ['cash', 'transfer', 'card', 'link'] as const;

export const useCajaStore = create<CajaStore>()(
  persist(
    (set, get) => ({
      currentSession: null,
      history: [],

      openCaja: (startingCash) => {
        set({
          currentSession: {
            id: `session-${Date.now()}`,
            openedAt: new Date().toISOString(),
            startingCash,
            ventas: [],
            transactions: [],
          },
        });
      },

      closeCaja: (realAmounts) => {
        const { currentSession, history } = get();
        if (!currentSession) return;

        const byMethod = (m: string) =>
          currentSession.ventas.reduce((acc, v) => {
            if (v.splits) {
              const split = v.splits.find((s) => s.method === m);
              return acc + (split ? split.amount : 0);
            }
            return acc + (v.method === m ? v.total : 0);
          }, 0);

        const totalIn  = currentSession.transactions.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0);
        const totalOut = currentSession.transactions.filter((t) => t.type === 'out').reduce((s, t) => s + t.amount, 0);

        const tericoByMethod: Record<string, number> = {
          cash:     currentSession.startingCash + byMethod('cash') + totalIn - totalOut,
          transfer: byMethod('transfer'),
          card:     byMethod('card'),
          link:     byMethod('link'),
        };

        const diffByMethod: Record<string, number> = {};
        let totalDiff = 0;
        VERIFIABLE_METHODS.forEach((key) => {
          if (realAmounts[key] !== undefined) {
            const d = realAmounts[key] - tericoByMethod[key];
            diffByMethod[key] = d;
            totalDiff += d;
          }
        });

        const closed: CajaSession = {
          ...currentSession,
          closedAt: new Date().toISOString(),
          realAmounts,
          tericoByMethod,
          diffByMethod,
          diffAmount: totalDiff,
        };

        set({ currentSession: null, history: [closed, ...history].slice(0, 50) });
      },

      recordSale: (total, splits, itemCount = 1, clientId, clientName) => {
        const { currentSession } = get();
        if (!currentSession) return;
        const primaryMethod = splits.length === 1 ? splits[0].method : 'mixed';
        set({
          currentSession: {
            ...currentSession,
            ventas: [
              {
                id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                timestamp: new Date().toISOString(),
                total,
                method: primaryMethod,
                itemCount,
                splits: splits.length > 1 ? splits : undefined,
                clientId,
                clientName,
              },
              ...currentSession.ventas,
            ],
          },
        });
      },

      addTransaction: (type, amount, reason) => {
        const { currentSession } = get();
        if (!currentSession) return;
        set({
          currentSession: {
            ...currentSession,
            transactions: [
              {
                id: `tx-${Date.now()}`,
                type,
                amount,
                reason,
                timestamp: new Date().toISOString(),
              },
              ...currentSession.transactions,
            ],
          },
        });
      },
    }),
    { name: 'carnespro-caja' }
  )
);
