import React from 'react';
import { 
  Compass, 
  Users, 
  Warehouse, 
  ClipboardList, 
  Stethoscope, 
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
  return (
    <aside className={`fixed left-0 top-0 h-full w-80 z-40 hidden lg:block border-r transition-all ${
      theme === 'dark' ? 'bg-clay/20 border-white/5 backdrop-blur-3xl' : 'bg-white border-6666-cream/10'
    }`}>
      <div className="p-10">
        <div className="flex items-center gap-4 mb-16 group">
          <div className="w-14 h-14 bg-6666-maroon rounded-[22px] rotate-12 flex items-center justify-center shadow-2xl shadow-6666-maroon/40 group-hover:rotate-0 transition-transform duration-500 border border-6666-cream/20 overflow-hidden p-2">
            <img src="/logo.png" alt="SheepMaster Logo" className="w-full h-full object-contain -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tighter font-display ${
              theme === 'dark' ? 'bg-gradient-to-br from-white to-6666-cream bg-clip-text text-transparent' : 'text-slate-900'
            }`}>
              Sheep<br /><span className="text-6666-cream">Master</span>
            </h1>
            <p className="text-[10px] font-black text-6666-cream uppercase tracking-widest leading-tight mt-1">RANCHO DON PABLITO</p>
          </div>
        </div>

        <nav className="space-y-3">
          <SidebarItem icon={<Compass size={22} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Users size={22} />} label="Inventario Hato" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <SidebarItem icon={<Warehouse size={22} />} label="Corrales" active={activeTab === 'corrales'} onClick={() => setActiveTab('corrales')} />
          <SidebarItem icon={<ClipboardList size={22} />} label="Reproducción" active={activeTab === 'breeding'} onClick={() => setActiveTab('breeding')} />
          <SidebarItem icon={<Stethoscope size={22} />} label="Control Clínico" active={activeTab === 'clinical'} onClick={() => setActiveTab('clinical')} />
          <SidebarItem icon={<ShieldCheck size={22} />} label="Personal" active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} />
          
          <div className="pt-8 mt-8 border-t border-white/5">
             <SidebarItem icon={<CircleUser size={22} />} label="Mi Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
             <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all mt-4 group">
               <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
               <span className="text-[10px] font-black uppercase tracking-widest">Cerrar Sesión</span>
             </button>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
