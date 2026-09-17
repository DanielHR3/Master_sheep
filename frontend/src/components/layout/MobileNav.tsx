import React, { useState } from 'react';
import {
  Compass,
  Users,
  ClipboardList,
  Stethoscope,
  CircleUser,
  MoreHorizontal,
  Warehouse,
  FileSpreadsheet,
  ShieldCheck,
  MapPin,
  X,
} from 'lucide-react';
import MobileNavItem from '../MobileNavItem';
import { Segmented, SegmentedItem } from '../ui/segmented';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: string;
  user?: any;
  selectedRanchOverride?: string | null;
  setSelectedRanchOverride?: (ranch: string | null) => void;
}

// Pestañas que viven detrás de "Más": no caben cinco más en la barra sin
// apretarla, y antes solo se alcanzaban desde los atajos de Mi Perfil.
const EN_MAS = ['corrales', 'reports', 'staff', 'profile'];

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, theme, user, selectedRanchOverride, setSelectedRanchOverride }) => {
  const [abierto, setAbierto] = useState(false);
  const isDark = theme === 'dark';
  const esAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const irA = (tab: string) => { setActiveTab(tab); setAbierto(false); };

  const opcion = (tab: string, icono: React.ReactNode, etiqueta: string, detalle: string) => (
    <button
      key={tab}
      onClick={() => irA(tab)}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-colors ${
        activeTab === tab
          ? (isDark ? 'bg-emerald-600/20 text-emerald-300' : 'bg-emerald-50 text-emerald-800')
          : (isDark ? 'hover:bg-white/5 text-slate-100' : 'hover:bg-slate-50 text-slate-800')
      }`}
    >
      <span className={`p-2.5 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>{icono}</span>
      <span>
        <span className="block text-sm font-black uppercase tracking-wider">{etiqueta}</span>
        <span className="block text-xs text-slate-400 font-bold">{detalle}</span>
      </span>
    </button>
  );

  return (
    <>
      {abierto && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-label="Más opciones">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className={`absolute bottom-0 left-0 right-0 rounded-t-[32px] border-t p-5 pb-8 space-y-2 shadow-2xl animate-in slide-in-from-bottom duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Más opciones</span>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar" className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                <X size={18} />
              </button>
            </div>
            {opcion('corrales', <Warehouse size={20} className="text-emerald-500" />, 'Corrales', 'Infraestructura y capacidad')}
            {esAdmin && opcion('reports', <FileSpreadsheet size={20} className="text-cyan-500" />, 'Reportes y descargas', 'Excel y analítica')}
            {esAdmin && opcion('staff', <ShieldCheck size={20} className="text-amber-500" />, 'Personal', 'Accesos y roles')}
            {opcion('profile', <CircleUser size={20} className="text-slate-400" />, 'Mi perfil', 'Cuenta, tema y rancho')}
            {user?.role === 'SuperAdmin' && setSelectedRanchOverride && (
              <div className={`mt-3 pt-4 border-t px-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2">
                  <MapPin size={12} className="text-emerald-500" /> Cambiar rancho
                </label>
                <Segmented
                  className="w-full grid grid-cols-2 gap-0.5 p-0.5"
                  value={selectedRanchOverride || ''}
                  onValueChange={(val: string) => setSelectedRanchOverride(val === '' ? null : val)}
                >
                  <SegmentedItem value="" className="px-2 py-2 text-xs">Global</SegmentedItem>
                  <SegmentedItem value="BUGAMBILIAS" className="px-2 py-2 text-xs">Las Bugambilias</SegmentedItem>
                </Segmented>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 h-24 md:hidden z-50 border-t flex justify-around items-center px-6 transition-all ${
        isDark ? 'bg-slate-950/80 border-white/5 backdrop-blur-xl' : 'bg-white/80 border-antique-brass/10 backdrop-blur-xl'
      }`}>
        <MobileNavItem icon={<Compass size={24} />} active={activeTab === 'dashboard'} onClick={() => irA('dashboard')} />
        <MobileNavItem icon={<Users size={24} />} active={activeTab === 'inventory'} onClick={() => irA('inventory')} />
        <MobileNavItem icon={<ClipboardList size={24} />} active={activeTab === 'breeding'} onClick={() => irA('breeding')} />
        <MobileNavItem icon={<Stethoscope size={24} />} active={activeTab === 'clinical'} onClick={() => irA('clinical')} />
        <MobileNavItem icon={<MoreHorizontal size={24} />} active={abierto || EN_MAS.includes(activeTab)} onClick={() => setAbierto(v => !v)} />
      </div>
    </>
  );
};

export default MobileNav;
