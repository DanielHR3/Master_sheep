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
  LogOut,
  ChevronLeft,
  Menu
} from 'lucide-react';
import SidebarItem from '../SidebarItem';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: string;
  onLogout: () => void;
  user: any;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, theme, onLogout, user, isCollapsed, toggleCollapse }) => {
  const isDark = theme === 'dark';
  const rawRancho = (user?.rancho_id || user?.name || '').toUpperCase();
  const isBugambilias = rawRancho.includes('BUGAMBILIAS') || (user?.email?.toLowerCase() || '').includes('bugambilias');
  const isDonPablito = rawRancho.includes('PABLITO') || (user?.email?.toLowerCase() || '').includes('pablito');
  
  const logoSrc = isBugambilias ? '/logo_bugambilias.jpg' : isDonPablito ? '/logodonpablito.jpg' : '/logo.png';
  const ranchoName = user?.rancho_id ? user.rancho_id.toUpperCase() : 'SHEEP MASTER';

  return (
    <aside className={`fixed left-0 top-0 h-full z-40 hidden md:block border-r transition-all duration-500 ease-in-out ${
      isCollapsed ? 'w-24' : 'w-80'
    } ${
      isDark ? 'bg-slate-900/90 border-slate-800 backdrop-blur-3xl' : 'bg-white border-slate-200 shadow-lg'
    }`}>
      <div className={`p-8 ${isCollapsed ? 'px-4' : ''}`}>
        <div className={`flex items-center mb-12 group relative ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
          <div className={`bg-rose-900 rounded-[22px] rotate-12 flex items-center justify-center shadow-2xl shadow-rose-900/50 group-hover:rotate-0 transition-all duration-500 border border-white/20 overflow-hidden p-2 ${isCollapsed ? 'w-10 h-10' : 'w-14 h-14'}`}>
            <img src={logoSrc} alt="Logo" className="w-full h-full object-contain -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
          </div>
          {!isCollapsed && (
            <div className="whitespace-nowrap overflow-hidden transition-all duration-300">
              <h1 className={`text-2xl font-black tracking-tighter font-display ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Sheep<br /><span className="text-cyan-500 dark:text-cyan-400">Master</span>
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mt-1">{ranchoName}</p>
            </div>
          )}
          <button 
            onClick={toggleCollapse}
            className={`absolute ${isCollapsed ? '-right-8 top-2 bg-rose-600' : '-right-10 top-4 bg-slate-800'} text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-all z-50`}
          >
            {isCollapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="space-y-3">
          <SidebarItem icon={<Compass size={22} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isCollapsed={isCollapsed} />
          <SidebarItem icon={<Users size={22} />} label="Inventario Hato" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} isCollapsed={isCollapsed} />
          <SidebarItem icon={<Warehouse size={22} />} label="Corrales" active={activeTab === 'corrales'} onClick={() => setActiveTab('corrales')} isCollapsed={isCollapsed} />
          <SidebarItem icon={<ClipboardList size={22} />} label="Reproducción" active={activeTab === 'breeding'} onClick={() => setActiveTab('breeding')} isCollapsed={isCollapsed} />
          <SidebarItem icon={<Stethoscope size={22} />} label="Control Clínico" active={activeTab === 'clinical'} onClick={() => setActiveTab('clinical')} isCollapsed={isCollapsed} />
          {user?.role === 'Admin' && (
            <>
              <SidebarItem icon={<FileSpreadsheet size={22} />} label="Reportes y Descargas" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} isCollapsed={isCollapsed} />
              <SidebarItem icon={<ShieldCheck size={22} />} label="Personal" active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} isCollapsed={isCollapsed} />
            </>
          )}
          
          <div className={`pt-6 mt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
             <SidebarItem icon={<CircleUser size={22} />} label="Mi Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} isCollapsed={isCollapsed} />
             <button 
               onClick={onLogout} 
               title={isCollapsed ? "Cerrar Sesión" : ""}
               className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-6'} py-4 rounded-2xl text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300 transition-all mt-4 group border border-transparent hover:border-rose-100 dark:hover:border-rose-800/40 cursor-pointer`}
             >
               <LogOut size={22} className={`${!isCollapsed && 'group-hover:-translate-x-1'} transition-transform`} />
               {!isCollapsed && <span className="text-[11px] font-black uppercase tracking-widest truncate">Cerrar Sesión</span>}
             </button>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
