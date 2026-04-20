import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ClientMovement {
  id: string;
  date: string;
  type: 'sale' | 'payment';
  amount: number;
  balanceAfter: number;
  description: string;
  ticketId?: string;
  paymentMethod?: string;
}

export interface ClientPeriod {
  id: string;
  label: string;          // e.g. "Abril 2026"
  openedAt: string;       // ISO — date of oldest movement
  closedAt: string;       // ISO — when it was closed
  closedReason: 'settled' | 'month_end' | 'manual';
  movements: ClientMovement[];
  totalSales: number;
  totalPaid: number;
  finalBalance: number;
}

export interface ClientProfile {
  id: string;
  name: string;
  dni: string;
  phone: string;
  address: string;
  email: string;
  notes: string;
  creditLimit: number;
  balance: number;
  status: 'active' | 'overdue' | 'blocked';
  lastActivity: string;
  createdAt: string;
  movements: ClientMovement[];
  periods: ClientPeriod[];
}

export interface ClientFormData {
  name: string;
  dni: string;
  phone: string;
  address: string;
  email: string;
  notes: string;
  creditLimit: number;
  status: 'active' | 'overdue' | 'blocked';
}

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

function buildPeriodLabel(movements: ClientMovement[]): string {
  const oldest = movements[movements.length - 1];
  const d = new Date(oldest?.date ?? Date.now());
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function archivePeriod(
  movements: ClientMovement[],
  finalBalance: number,
  reason: ClientPeriod['closedReason']
): ClientPeriod {
  const now = new Date().toISOString();
  const oldest = movements[movements.length - 1];
  return {
    id: `period-${Date.now()}`,
    label: buildPeriodLabel(movements),
    openedAt: oldest?.date ?? now,
    closedAt: now,
    closedReason: reason,
    movements: [...movements],
    totalSales: movements.filter(m => m.type === 'sale').reduce((s, m) => s + m.amount, 0),
    totalPaid: movements.filter(m => m.type === 'payment').reduce((s, m) => s + m.amount, 0),
    finalBalance,
  };
}

interface ClientState {
  clients: ClientProfile[];
  selectedClientId: string | null;
  setSelectedClient: (id: string | null) => void;
  addClient: (data: ClientFormData) => void;
  updateClient: (id: string, data: Partial<ClientFormData>) => void;
  deleteClient: (id: string) => void;
  addPayment: (clientId: string, amount: number, note: string, method: string) => ClientMovement | null;
  addSaleToAccount: (clientId: string, amount: number, description: string) => void;
  closePeriod: (clientId: string, reason: ClientPeriod['closedReason']) => void;
}

const INITIAL_CLIENTS: ClientProfile[] = [];

export const useClientStore = create<ClientState>()(
  persist(
    (set) => ({
      clients: INITIAL_CLIENTS,
      selectedClientId: null,

      setSelectedClient: (id) => set({ selectedClientId: id }),

      addClient: (data) => set((state) => ({
        clients: [...state.clients, {
          id: `c-${Date.now()}`,
          name: data.name,
          dni: data.dni,
          phone: data.phone,
          address: data.address,
          email: data.email,
          notes: data.notes,
          creditLimit: data.creditLimit,
          balance: 0,
          status: 'active',
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          movements: [],
          periods: [],
        }]
      })),

      updateClient: (id, data) => set((state) => ({
        clients: state.clients.map(c => {
          if (c.id !== id) return c;
          const updated = { ...c, ...data };
          if (!data.status) {
            updated.status = updated.balance > updated.creditLimit ? 'overdue' : 'active';
          }
          return updated;
        })
      })),

      deleteClient: (id) => set((state) => ({
        clients: state.clients.filter(c => c.id !== id),
        selectedClientId: state.selectedClientId === id ? null : state.selectedClientId
      })),

      addPayment: (clientId, amount, note, method) => {
        let createdMovement: ClientMovement | null = null;
        set((state) => {
          const client = state.clients.find(c => c.id === clientId);
          if (!client) return state;
          const newBalance = client.balance - amount;
          createdMovement = {
            id: `pay-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'payment',
            amount,
            balanceAfter: newBalance,
            description: note || 'Pago a cuenta',
            paymentMethod: method
          };

          const updatedMovements: ClientMovement[] = [createdMovement!, ...client.movements];

          // Auto-archive period when balance is fully settled
          let finalMovements = updatedMovements;
          let newPeriods = client.periods ?? [];
          if (newBalance <= 0 && updatedMovements.length > 0) {
            const period = archivePeriod(updatedMovements, newBalance, 'settled');
            newPeriods = [period, ...newPeriods];
            finalMovements = [];
          }

          return {
            clients: state.clients.map(c => {
              if (c.id !== clientId) return c;
              return {
                ...c,
                balance: newBalance,
                status: newBalance > c.creditLimit ? 'overdue' : 'active',
                lastActivity: new Date().toISOString(),
                movements: finalMovements,
                periods: newPeriods,
              };
            })
          };
        });
        return createdMovement;
      },

      addSaleToAccount: (clientId, amount, description) => set((state) => ({
        clients: state.clients.map(c => {
          if (c.id !== clientId) return c;
          const newBalance = c.balance + amount;
          const newMovement: ClientMovement = {
            id: `sale-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'sale',
            amount,
            balanceAfter: newBalance,
            description
          };
          return {
            ...c,
            balance: newBalance,
            status: newBalance > c.creditLimit ? 'overdue' : 'active',
            lastActivity: new Date().toISOString(),
            movements: [newMovement, ...c.movements]
          };
        })
      })),

      closePeriod: (clientId, reason) => set((state) => ({
        clients: state.clients.map(c => {
          if (c.id !== clientId || c.movements.length === 0) return c;
          const period = archivePeriod(c.movements, c.balance, reason);
          return {
            ...c,
            periods: [period, ...(c.periods ?? [])],
            movements: [],
          };
        })
      })),
    }),
    {
      name: 'carnify-clients-v2',
      partialize: (state) => ({ clients: state.clients })
    }
  )
);
