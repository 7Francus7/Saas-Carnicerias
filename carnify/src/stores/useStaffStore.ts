import { create } from 'zustand';

export interface StaffProfile {
  id: string;
  name: string;
  dni: string;
  phone: string;
  role: 'carnicero' | 'cajero' | 'ayudante' | 'encargado' | 'limpieza';
  address: string;
  email: string;
  notes: string;
  salary: number;
  schedule: string;
  status: 'active' | 'inactive' | 'vacations' | 'suspended';
  hireDate: string;
  lastActivity: string;
  createdAt: string;
}

export interface StaffFormData {
  name: string;
  dni: string;
  phone: string;
  role: StaffProfile['role'];
  address: string;
  email: string;
  notes: string;
  salary: number;
  schedule: string;
  status: StaffProfile['status'];
}

export const ROLE_LABELS: Record<StaffProfile['role'], string> = {
  carnicero: 'Carnicero',
  cajero: 'Cajero',
  ayudante: 'Ayudante',
  encargado: 'Encargado',
  limpieza: 'Limpieza',
};

export const STATUS_LABELS: Record<StaffProfile['status'], string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  vacations: 'Vacaciones',
  suspended: 'Suspendido',
};

interface StaffState {
  staff: StaffProfile[];
  selectedStaffId: string | null;
  hydrate: (staff: StaffProfile[]) => void;
  setSelectedStaff: (id: string | null) => void;
}

export const useStaffStore = create<StaffState>()((set) => ({
  staff: [],
  selectedStaffId: null,
  hydrate: (staff) => set({ staff }),
  setSelectedStaff: (id) => set({ selectedStaffId: id }),
}));
