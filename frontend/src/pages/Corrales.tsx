import React from 'react';
import { Plus, Warehouse } from 'lucide-react';
import { main } from "../../wailsjs/go/models";

interface CorralesProps {
  corrales: main.Corral[];
  animals: main.Animal[];
  theme: string;
  onAddCorral: () => void;
}

const Corrales: React.FC<CorralesProps> = ({ corrales, animals, theme, onAddCorral }) => {
  return (
    <div className="space-y-10 pt-10 animate-in slide-in-from-right-8 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-4xl font-black font-display tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Gestión de Corrales
          </h2>
          <p className="text-antique-brass font-black uppercase tracking-widest text-[10px] mt-1">
            Infraestructura y Capacidad
          </p>
        </div>
        <button 
          onClick={onAddCorral} 
          className="bg-6666-maroon hover:bg-6666-sand hover:text-6666-maroon text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase shadow-lg shadow-6666-maroon/20 flex items-center gap-3 transition-all active:scale-95"
        >
          <Plus size={18} /> Nuevo Corral
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {corrales.length > 0 ? corrales.map((corral) => {
          const occupancy = animals.filter(a => a.corral_id === corral.nombre || a.corral_id === corral.id).length;
          const percentage = (occupancy / (corral.capacidad || 1)) * 100;
          return (
            <div key={corral.id} className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/30 border-white/5' : 'bg-white border-6666-cream/20'}`}>
              <div className="flex justify-between mb-6">
                <div className="p-4 bg-slate-950 rounded-[20px]">
                  <Warehouse size={24} className="text-6666-cream" />
                </div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black h-fit ${percentage > 90 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {percentage.toFixed(0)}%
                </span>
              </div>
              <h4 className="text-3xl font-black font-display tracking-tight text-white mb-2">{corral.nombre}</h4>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Capacidad: {corral.capacidad} Animales</p>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-6666-maroon" style={{ width: `${Math.min(percentage, 100)}%` }} />
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
