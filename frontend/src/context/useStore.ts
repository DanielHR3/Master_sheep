import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { main } from "../../wailsjs/go/models";
import { DON_PABLITO_ENABLED } from '../lib/ranchos';

interface AppState {
  // UI State
  activeTab: string;
  subTab: 'animals' | 'supplies';
  theme: 'light' | 'dark';
  loading: boolean;
  isLoggedIn: boolean;
  isDemo: boolean;
  notification: { message: string, type: 'success' | 'error' | 'info' } | null;
  selectedRanchOverride: string | null;
  
  // Data State
  stats: any;
  animals: main.Animal[];
  referencias: main.Animal[];
  semaforo: main.SemaforoAnimal[];
  corrales: main.Corral[];
  insumos: main.Insumo[];
  tareas: any[];
  users: main.User[];
  currentUser: main.User | null;
  historialClinico: any[];

  // Actions
  setActiveTab: (tab: string) => void;
  setSubTab: (subTab: 'animals' | 'supplies') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLoading: (loading: boolean) => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setIsDemo: (isDemo: boolean) => void;
  setNotification: (notification: { message: string, type: 'success' | 'error' | 'info' } | null) => void;
  setSelectedRanchOverride: (ranch: string | null) => void;
  setStats: (stats: any) => void;
  setAnimals: (animals: main.Animal[]) => void;
  setReferencias: (referencias: main.Animal[]) => void;
  setSemaforo: (semaforo: main.SemaforoAnimal[]) => void;
  setCorrales: (corrales: main.Corral[]) => void;
  setInsumos: (insumos: main.Insumo[]) => void;
  setTareas: (tareas: any[]) => void;
  setUsers: (users: main.User[]) => void;
  setCurrentUser: (user: main.User | null) => void;
  setHistorialClinico: (history: any[]) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: 'dashboard',
      subTab: 'animals',
      theme: 'light',
      loading: false,
      isLoggedIn: false,
      isDemo: false,
      notification: null,
      selectedRanchOverride: null,
      
      stats: { total_cabezas: 0, fertilidad: 0, corrales: [] },
      animals: [],
      referencias: [],
      semaforo: [],
      corrales: [],
      insumos: [],
      tareas: [],
      users: [],
      currentUser: null,
      historialClinico: [],

      setActiveTab: (activeTab) => set({ activeTab }),
      setSubTab: (subTab) => set({ subTab }),
      setTheme: (theme) => set({ theme }),
      setLoading: (loading) => set({ loading }),
      setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
      setIsDemo: (isDemo) => set({ isDemo }),
      setNotification: (notification) => set({ notification }),
      setSelectedRanchOverride: (selectedRanchOverride) => set({ selectedRanchOverride }),
      setStats: (stats) => set({ stats }),
      setAnimals: (animals) => set({ animals }),
      setReferencias: (referencias) => set({ referencias }),
      setSemaforo: (semaforo) => set({ semaforo }),
      setCorrales: (corrales) => set({ corrales }),
      setInsumos: (insumos) => set({ insumos }),
      setTareas: (tareas) => set({ tareas }),
      setUsers: (users) => set({ users }),
      setCurrentUser: (currentUser) => set({ currentUser }),
      setHistorialClinico: (historialClinico) => set({ historialClinico }),
    }),
    {
      name: 'sheepmaster-storage',
      partialize: (state) => ({ 
        isLoggedIn: state.isLoggedIn, 
        currentUser: state.currentUser, 
        theme: state.theme,
        activeTab: state.activeTab,
        selectedRanchOverride: state.selectedRanchOverride
      }),
      // Un rancho apagado no debe quedarse pegado en localStorage: quien lo
      // tuviera seleccionado volvería a la vista global sin poder cambiarlo,
      // porque su botón ya no está en el selector.
      onRehydrateStorage: () => (state) => {
        if (state && !DON_PABLITO_ENABLED && state.selectedRanchOverride === 'PABLITO') {
          state.selectedRanchOverride = null;
        }
      },
    }
  )
);
