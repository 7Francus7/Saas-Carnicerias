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

const INITIAL_CLIENTS: ClientProfile[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    dni: '20-12345678-9',
    phone: '11-4567-8901',
    address: 'Av. Corrientes 1234, CABA',
    email: 'jperez@gmail.com',
    notes: 'Prefiere cortes magros. Paga siempre en efectivo.',
    creditLimit: 50000,
    balance: 18750,
    status: 'active',
    lastActivity: '2026-04-16T12:00:00',
    createdAt: '2025-01-15T10:00:00',
    movements: [
      { id: 'm1', date: '2026-04-16T12:00:00', type: 'sale', amount: 18750, balanceAfter: 18750, description: 'Venta ticket #V-0064', ticketId: 'V-0064' },
      { id: 'm2', date: '2026-04-10T09:30:00', type: 'payment', amount: 10000, balanceAfter: 0, description: 'Pago en efectivo', paymentMethod: 'cash' },
      { id: 'm3', date: '2026-04-10T09:15:00', type: 'sale', amount: 10000, balanceAfter: 10000, description: 'Venta ticket #V-0042', ticketId: 'V-0042' },
    ],
    periods: [
      {
        id: 'period-march',
        label: 'Marzo 2026',
        openedAt: '2026-03-20T11:00:00',
        closedAt: '2026-03-28T14:00:00',
        closedReason: 'settled',
        movements: [
          { id: 'm4', date: '2026-03-28T14:00:00', type: 'payment', amount: 15000, balanceAfter: 0, description: 'Pago parcial', paymentMethod: 'transfer' },
          { id: 'm5', date: '2026-03-20T11:00:00', type: 'sale', amount: 15000, balanceAfter: 15000, description: 'Venta ticket #V-0031', ticketId: 'V-0031' },
        ],
        totalSales: 15000,
        totalPaid: 15000,
        finalBalance: 0,
      }
    ],
  },
  {
    id: '2',
    name: 'María García',
    dni: '27-98765432-1',
    phone: '11-5555-4444',
    address: 'Uriburu 456, CABA',
    email: '',
    notes: 'Clienta regular de los sábados.',
    creditLimit: 30000,
    balance: 34200,
    status: 'overdue',
    lastActivity: '2026-04-15T18:00:00',
    createdAt: '2025-03-01T10:00:00',
    movements: [
      { id: 'm6', date: '2026-04-15T18:00:00', type: 'sale', amount: 34200, balanceAfter: 34200, description: 'Venta ticket #V-0062', ticketId: 'V-0062' },
      { id: 'm7', date: '2026-03-10T10:00:00', type: 'payment', amount: 20000, balanceAfter: 0, description: 'Pago cuota', paymentMethod: 'cash' },
      { id: 'm8', date: '2026-03-05T09:00:00', type: 'sale', amount: 20000, balanceAfter: 20000, description: 'Venta ticket #V-0018', ticketId: 'V-0018' },
    ],
    periods: [],
  },
  {
    id: '3',
    name: 'Carlos López',
    dni: '20-22333444-5',
    phone: '11-3333-2222',
    address: 'Scalabrini Ortiz 789, CABA',
    email: 'clopez@outlook.com',
    notes: '',
    creditLimit: 100000,
    balance: 5500,
    status: 'active',
    lastActivity: '2026-04-16T15:30:00',
    createdAt: '2024-11-10T10:00:00',
    movements: [
      { id: 'm9', date: '2026-04-16T15:30:00', type: 'sale', amount: 5500, balanceAfter: 5500, description: 'Venta ticket #V-0068', ticketId: 'V-0068' },
      { id: 'm10', date: '2026-04-05T12:00:00', type: 'payment', amount: 12000, balanceAfter: 0, description: 'Pago total', paymentMethod: 'transfer' },
      { id: 'm11', date: '2026-03-30T16:00:00', type: 'sale', amount: 12000, balanceAfter: 12000, description: 'Venta ticket #V-0055', ticketId: 'V-0055' },
    ],
    periods: [],
  },
  {
    id: '4',
    name: 'Ana Rodríguez',
    dni: '27-55667788-3',
    phone: '11-7890-1234',
    address: 'Palermo 321, CABA',
    email: 'ana.rodriguez@gmail.com',
    notes: 'Paga siempre al día. Buena clienta.',
    creditLimit: 20000,
    balance: 0,
    status: 'active',
    lastActivity: '2026-04-14T16:00:00',
    createdAt: '2025-06-20T10:00:00',
    movements: [],
    periods: [
      {
        id: 'period-april-ana',
        label: 'Abril 2026',
        openedAt: '2026-04-01T10:00:00',
        closedAt: '2026-04-14T16:00:00',
        closedReason: 'settled',
        movements: [
          { id: 'm12', date: '2026-04-14T16:00:00', type: 'payment', amount: 15200, balanceAfter: 0, description: 'Pago total', paymentMethod: 'transfer' },
          { id: 'm13', date: '2026-04-01T10:00:00', type: 'sale', amount: 15200, balanceAfter: 15200, description: 'Venta ticket #V-0051', ticketId: 'V-0051' },
        ],
        totalSales: 15200,
        totalPaid: 15200,
        finalBalance: 0,
      }
    ],
  },
];

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
      name: 'carnespro-clients',
      partialize: (state) => ({ clients: state.clients })
    }
  )
);
