import React from 'react';
import { 
  Compass, 
  Users, 
  Warehouse, 
  ClipboardList, 
  Stethoscope, 
  FileSpreadsheet,
  ShieldCheck, 
  CircleUser, 
  LogOut 
} from 'lucide-react';
import SidebarItem from '../SidebarItem';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: string;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, theme, onLogout }) => {
  const isDark = theme === 'dark';
  return (
    <aside className={`fixed left-0 top-0 h-full w-80 z-40 hidden lg:block border-r transition-all ${
      isDark ? 'bg-slate-900/90 border-slate-800 backdrop-blur-3xl' : 'bg-white border-slate-200 shadow-lg'
    }`}>
      <div className="p-8">
        <div className="flex items-center gap-4 mb-12 group">
          <div className="w-14 h-14 bg-rose-900 rounded-[22px] rotate-12 flex items-center justify-center shadow-2xl shadow-rose-900/50 group-hover:rotate-0 transition-transform duration-500 border border-white/20 overflow-hidden p-2">
            <img src="/logo.png" alt="SheepMaster Logo" className="w-full h-full object-contain -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tighter font-display ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Sheep<br /><span className="text-cyan-500 dark:text-cyan-400">Master</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mt-1">RANCHO DON PABLITO</p>
          </div>
        </div>

        <nav className="space-y-3">
          <SidebarItem icon={<Compass size={22} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Users size={22} />} label="Inventario Hato" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <SidebarItem icon={<Warehouse size={22} />} label="Corrales" active={activeTab === 'corrales'} onClick={() => setActiveTab('corrales')} />
          <SidebarItem icon={<ClipboardList size={22} />} label="Reproducción" active={activeTab === 'breeding'} onClick={() => setActiveTab('breeding')} />
          <SidebarItem icon={<Stethoscope size={22} />} label="Control Clínico" active={activeTab === 'clinical'} onClick={() => setActiveTab('clinical')} />
          <SidebarItem icon={<FileSpreadsheet size={22} />} label="Reportes y Descargas" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <SidebarItem icon={<ShieldCheck size={22} />} label="Personal" active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} />
          
          <div className={`pt-6 mt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
             <SidebarItem icon={<CircleUser size={22} />} label="Mi Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
             <button 
               onClick={onLogout} 
               className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300 transition-all mt-4 group border border-transparent hover:border-rose-100 dark:hover:border-rose-800/40 cursor-pointer"
             >
               <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
               <span className="text-[11px] font-black uppercase tracking-widest">Cerrar Sesión</span>
             </button>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
