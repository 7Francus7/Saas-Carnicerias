import { create } from 'zustand';

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
  label: string;
  openedAt: string;
  closedAt: string;
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

interface ClientState {
  clients: ClientProfile[];
  selectedClientId: string | null;
  hydrate: (clients: ClientProfile[]) => void;
  setSelectedClient: (id: string | null) => void;
}

export const useClientStore = create<ClientState>()((set) => ({
  clients: [],
  selectedClientId: null,
  hydrate: (clients) => set({ clients }),
  setSelectedClient: (id) => set({ selectedClientId: id }),
}));
