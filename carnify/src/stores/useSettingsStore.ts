import { create } from 'zustand';

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
  hydrate: (business: BusinessSettings, pos: PosSettings) => void;
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

export const useSettingsStore = create<SettingsState>()((set) => ({
  business: DEFAULT_BUSINESS,
  pos: DEFAULT_POS,
  hydrate: (business, pos) => set({ business, pos }),
  updateBusiness: (data) =>
    set((s) => ({ business: { ...s.business, ...data } })),
  updatePos: (data) =>
    set((s) => ({ pos: { ...s.pos, ...data } })),
}));
