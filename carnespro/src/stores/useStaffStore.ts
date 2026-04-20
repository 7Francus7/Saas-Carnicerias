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

const INITIAL_STAFF: StaffProfile[] = [];

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
    { name: 'staff-storage-v2' }
  )
);
