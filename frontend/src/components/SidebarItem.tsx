import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group cursor-pointer ${
        active 
          ? 'bg-rose-800 text-white shadow-xl shadow-rose-900/40 translate-x-1 font-extrabold border border-rose-600/30' 
          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
      }`}
    >
      <div className={`${active ? 'scale-110 text-cyan-300' : 'group-hover:scale-110 text-slate-400 group-hover:text-cyan-400'} transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      {active && <ChevronRight size={16} className="ml-auto text-cyan-300" />}
    </button>
  );
};

export default SidebarItem;
