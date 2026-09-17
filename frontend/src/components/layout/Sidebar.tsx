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
  Menu,
  MapPin
} from 'lucide-react';
import SidebarItem from '../SidebarItem';
import { Segmented, SegmentedItem } from '../ui/segmented';
import { DON_PABLITO_ENABLED, esPieDeCria } from '../../lib/ranchos';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: string;
  onLogout: () => void;
  user: any;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  selectedRanchOverride?: string | null;
  setSelectedRanchOverride?: (ranch: string | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, theme, onLogout, user, isCollapsed, toggleCollapse, selectedRanchOverride, setSelectedRanchOverride }) => {
  const isDark = theme === 'dark';
  const rawRancho = (selectedRanchOverride || user?.rancho_id || user?.name || '').toUpperCase();
  const isBugambilias = esPieDeCria(user, selectedRanchOverride);
  const isDonPablito = DON_PABLITO_ENABLED && (rawRancho.includes('PABLITO') || (selectedRanchOverride ? false : (user?.email?.toLowerCase() || '').includes('pablito')) || rawRancho.includes('25CF359E-E5A7-4403-A1F1-3A4375F21EF3'));
  
  const logoSrc = isBugambilias ? '/logo_bugambilias.png' : isDonPablito ? '/logo_donpablito.png' : '/logo.png';
  // Cada escudo va sobre su propio fondo: Bugambilias es cromado sobre oscuro, los demás sobre blanco.
  const logoBg = isBugambilias ? 'bg-[#1f2124]' : 'bg-white';
  const ranchoName = isBugambilias ? 'LAS BUGAMBILIAS' : isDonPablito ? 'DON PABLITO' : 'AGROTECH';

  return (
    <aside className={`fixed left-0 top-0 h-full z-40 hidden md:block border-r transition-all duration-500 ease-in-out ${
      isCollapsed ? 'w-24' : 'w-80'
    } ${
      isDark ? 'bg-slate-900/90 border-slate-800 backdrop-blur-3xl' : 'bg-white border-slate-200 shadow-lg'
    }`}>
      <div className={`p-8 ${isCollapsed ? 'px-4' : ''}`}>
        <div className={`flex items-center mb-12 group relative ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
          <div className={`${logoBg} rounded-full flex items-center justify-center shadow-lg ring-2 ${isDark ? 'ring-slate-700 shadow-black/40' : 'ring-slate-200 shadow-slate-300/60'} overflow-hidden p-1.5 transition-transform duration-500 group-hover:scale-105 ${isCollapsed ? 'w-11 h-11' : 'w-16 h-16'}`}>
            <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
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
          {/* Pie de cría no trabaja con corrales: el módulo no se ofrece. El dato
              sigue existiendo; solo no hay puerta hacia él. */}
          {!isBugambilias && (
            <SidebarItem icon={<Warehouse size={22} />} label="Corrales" active={activeTab === 'corrales'} onClick={() => setActiveTab('corrales')} isCollapsed={isCollapsed} />
          )}
          <SidebarItem icon={<ClipboardList size={22} />} label="Reproducción" active={activeTab === 'breeding'} onClick={() => setActiveTab('breeding')} isCollapsed={isCollapsed} />
          <SidebarItem icon={<Stethoscope size={22} />} label="Control Clínico" active={activeTab === 'clinical'} onClick={() => setActiveTab('clinical')} isCollapsed={isCollapsed} />
          {user?.role === 'Admin' && (
            <>
              <SidebarItem icon={<FileSpreadsheet size={22} />} label="Reportes y Descargas" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} isCollapsed={isCollapsed} />
              <SidebarItem icon={<ShieldCheck size={22} />} label="Personal" active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} isCollapsed={isCollapsed} />
            </>
          )}
          {/* Solo el SuperAdmin cambia de rancho. Un Admin pertenece a un rancho
              y no tiene por qué ver los nombres de los demás clientes. */}
          {user?.role === 'SuperAdmin' && !isCollapsed && (
            <div className="pt-4 mt-2 px-2">
              <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2">
                <MapPin size={12} className="text-emerald-500" />
                Cambiar Rancho
              </label>
              <Segmented
                className={`w-full grid gap-0.5 p-0.5 ${DON_PABLITO_ENABLED ? 'grid-cols-3' : 'grid-cols-2'}`}
                value={selectedRanchOverride || ''}
                onValueChange={(val: string) => setSelectedRanchOverride?.(val === '' ? null : val)}
              >
                <SegmentedItem value="" className="truncate px-1.5 py-1.5 text-[10px]" title="Vista Global / Default">Global</SegmentedItem>
                <SegmentedItem value="BUGAMBILIAS" className="truncate px-1.5 py-1.5 text-[10px]" title="Las Bugambilias (Pie de Cría)">Bugamb.</SegmentedItem>
                {DON_PABLITO_ENABLED && (
                  <SegmentedItem value="PABLITO" className="truncate px-1.5 py-1.5 text-[10px]" title="Don Pablito (Engorda)">Pablito</SegmentedItem>
                )}
              </Segmented>
            </div>
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
