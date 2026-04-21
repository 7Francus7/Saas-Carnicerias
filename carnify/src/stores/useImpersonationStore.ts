import { create } from "zustand";
import type { SectionKey } from "@/lib/sections";

interface ImpersonationStore {
  viewingAs: { name: string; sections: SectionKey[] } | null;
  startViewAs: (name: string, sections: SectionKey[]) => void;
  stopViewAs: () => void;
}

export const useImpersonationStore = create<ImpersonationStore>((set) => ({
  viewingAs: null,
  startViewAs: (name, sections) => set({ viewingAs: { name, sections } }),
  stopViewAs: () => set({ viewingAs: null }),
}));
