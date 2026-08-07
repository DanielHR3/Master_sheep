import React from 'react';
import { Plus, Warehouse, Trash2 } from 'lucide-react';
import { main } from "../../wailsjs/go/models";

interface CorralesProps {
  corrales: main.Corral[];
  animals: main.Animal[];
  theme: string;
  onAddCorral: () => void;
  onDeleteCorral: (id: string) => void;
  user: any;
}

const Corrales: React.FC<CorralesProps> = ({ corrales, animals, theme, onAddCorral, onDeleteCorral, user }) => {
  return (
    <div className="space-y-10 pt-10 animate-in slide-in-from-right-8 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-5xl font-black font-display tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Gestión de Corrales
          </h2>
          <p className="text-emerald-500 font-bold uppercase tracking-widest text-xs mt-1.5 flex items-center gap-2">
            Infraestructura y Capacidad
          </p>
        </div>
        {user?.role === 'Admin' && (
          <button 
            onClick={onAddCorral} 
            className={`bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase flex items-center gap-3 transition-all active:scale-95 shadow-lg ${theme === 'dark' ? 'shadow-emerald-950/80' : 'shadow-emerald-500/20'}`}
          >
            <Plus size={18} /> Nuevo Corral
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {corrales.length > 0 ? corrales.map((corral) => {
          const occupancy = (Array.isArray(animals) ? animals : []).filter(a => a.corral_id === corral.nombre || a.corral_id === corral.id).length;
          const percentage = (occupancy / (corral.capacidad || 1)) * 100;
          return (
            <div key={corral.id} className={`p-8 rounded-[40px] border transition-all hover:scale-[1.02] shadow-xl ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700/50 backdrop-blur-md' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between mb-6">
                <div className={`p-4 rounded-[20px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Warehouse size={24} className="text-emerald-500" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if(confirm(`¿Estás seguro de eliminar el corral ${corral.nombre}? Los animales asignados quedarán sin corral.`)) {
                        onDeleteCorral(corral.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black h-fit ${percentage > 90 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <h4 className={`text-3xl font-black font-display tracking-tight mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{corral.nombre}</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Capacidad: {corral.capacidad} Animales</p>
              <div className={`h-2 w-full rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className={`h-full ${percentage > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center opacity-30">
            <Warehouse size={64} className="mx-auto mb-4" />
            <p className="font-black uppercase text-xs">Sin corrales</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Corrales;
