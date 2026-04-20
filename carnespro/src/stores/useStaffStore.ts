import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const ROLE_LABELS: Record<StaffProfile['role'], string> = {
  carnicero: 'Carnicero',
  cajero: 'Cajero',
  ayudante: 'Ayudante',
  encargado: 'Encargado',
  limpieza: 'Limpieza',
};

const STATUS_LABELS: Record<StaffProfile['status'], string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  vacations: 'Vacaciones',
  suspended: 'Suspendido',
};

interface StaffState {
  staff: StaffProfile[];
  selectedStaffId: string | null;
  setSelectedStaff: (id: string | null) => void;
  addStaff: (data: StaffFormData) => void;
  updateStaff: (id: string, data: Partial<StaffFormData>) => void;
  deleteStaff: (id: string) => void;
}

const INITIAL_STAFF: StaffProfile[] = [
  {
    id: '1',
    name: 'Carlos Martínez',
    dni: '28-34567891-2',
    phone: '11-4567-8901',
    role: 'encargado',
    address: 'Av. San Juan 2345, CABA',
    email: 'cmartinez@carnespro.com',
    notes: 'Responsable del sector de desposte',
    salary: 850000,
    schedule: 'Lun-Sáb 07:00-15:00',
    status: 'active',
    hireDate: '2022-03-15',
    lastActivity: '2026-04-16T18:00:00Z',
    createdAt: '2022-03-15T00:00:00Z',
  },
  {
    id: '2',
    name: 'María López',
    dni: '27-12345678-9',
    phone: '11-4567-8902',
    role: 'cajero',
    address: 'Calle Florida 123, Vicente López',
    email: 'mlopez@carnespro.com',
    notes: 'Responsable de caja y atención al público',
    salary: 680000,
    schedule: 'Lun-Sáb 08:00-16:00',
    status: 'active',
    hireDate: '2023-06-01',
    lastActivity: '2026-04-16T19:30:00Z',
    createdAt: '2023-06-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Pedro Gómez',
    dni: '20-98765432-1',
    phone: '11-4567-8903',
    role: 'carnicero',
    address: 'Av. Rivadavia 5678, CABA',
    email: 'pgomez@carnespro.com',
    notes: 'Especialista en cortes de vacuno',
    salary: 750000,
    schedule: 'Lun-Sáb 06:00-14:00',
    status: 'active',
    hireDate: '2021-01-10',
    lastActivity: '2026-04-16T14:30:00Z',
    createdAt: '2021-01-10T00:00:00Z',
  },
];

export { ROLE_LABELS, STATUS_LABELS };

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      staff: INITIAL_STAFF,
      selectedStaffId: null,
      setSelectedStaff: (id) => set({ selectedStaffId: id }),
      addStaff: (data) => {
        const newStaff: StaffProfile = {
          ...data,
          id: `staff-${Date.now()}`,
          hireDate: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ staff: [...s.staff, newStaff] }));
      },
      updateStaff: (id, data) => {
        set((s) => ({
          staff: s.staff.map((p) =>
            p.id === id ? { ...p, ...data, lastActivity: new Date().toISOString() } : p
          ),
        }));
      },
      deleteStaff: (id) => {
        set((s) => ({
          staff: s.staff.filter((p) => p.id !== id),
          selectedStaffId: s.selectedStaffId === id ? null : s.selectedStaffId,
        }));
      },
    }),
    { name: 'staff-storage' }
  )
);
