import { create } from 'zustand';
import { main } from "../../wailsjs/go/models";

interface AppState {
  // UI State
  activeTab: string;
  subTab: 'animals' | 'supplies';
  theme: 'light' | 'dark';
  loading: boolean;
  isLoggedIn: boolean;
  isDemo: boolean;
  
  // Data State
  stats: any;
  animals: main.Animal[];
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
  setStats: (stats: any) => void;
  setAnimals: (animals: main.Animal[]) => void;
  setCorrales: (corrales: main.Corral[]) => void;
  setInsumos: (insumos: main.Insumo[]) => void;
  setTareas: (tareas: any[]) => void;
  setUsers: (users: main.User[]) => void;
  setCurrentUser: (user: main.User | null) => void;
  setHistorialClinico: (history: any[]) => void;
}

export const useStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  subTab: 'animals',
  theme: 'dark',
  loading: false,
  isLoggedIn: false,
  isDemo: false,
  
  stats: { total_cabezas: 0, fertilidad: 0, corrales: [] },
  animals: [],
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
  setStats: (stats) => set({ stats }),
  setAnimals: (animals) => set({ animals }),
  setCorrales: (corrales) => set({ corrales }),
  setInsumos: (insumos) => set({ insumos }),
  setTareas: (tareas) => set({ tareas }),
  setUsers: (users) => set({ users }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setHistorialClinico: (historialClinico) => set({ historialClinico }),
}));
