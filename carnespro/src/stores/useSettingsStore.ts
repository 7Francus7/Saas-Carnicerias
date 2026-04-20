import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BusinessSettings {
  nombre: string;
  iniciales: string;
  direccion: string;
  telefono: string;
  cuit: string;
  email: string;
}

export interface PosSettings {
  defaultPaymentMethod: 'cash' | 'transfer' | 'card' | 'link' | 'fiado';
  stockAlertThreshold: number;
  requireConfirmOnCheckout: boolean;
}

interface SettingsState {
  business: BusinessSettings;
  pos: PosSettings;
  updateBusiness: (data: Partial<BusinessSettings>) => void;
  updatePos: (data: Partial<PosSettings>) => void;
}

export const DEFAULT_BUSINESS: BusinessSettings = {
  nombre: 'Carnicería Pro',
  iniciales: 'CP',
  direccion: '',
  telefono: '',
  cuit: '',
  email: '',
};

export const DEFAULT_POS: PosSettings = {
  defaultPaymentMethod: 'cash',
  stockAlertThreshold: 10,
  requireConfirmOnCheckout: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      business: DEFAULT_BUSINESS,
      pos: DEFAULT_POS,
      updateBusiness: (data) =>
        set((s) => ({ business: { ...s.business, ...data } })),
      updatePos: (data) =>
        set((s) => ({ pos: { ...s.pos, ...data } })),
    }),
    { name: 'carnify-settings' }
  )
);
