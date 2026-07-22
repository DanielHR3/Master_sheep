import React from 'react';
import { 
  Activity, 
  ArrowRightLeft, 
  TrendingUp, 
  Edit3, 
  Trash2, 
  Syringe, 
  History as HistoryIcon 
} from 'lucide-react';
import { main } from "../../wailsjs/go/models";

interface AnimalCardProps {
  animal: main.Animal;
  theme: string;
  onSelect: () => void;
  onTreatment: () => void;
  onViewHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddWeight: () => void;
  onViewWeights: () => void;
  isAdmin: boolean;
}

const AnimalCard: React.FC<AnimalCardProps> = ({ 
  animal, 
  theme, 
  onSelect, 
  onTreatment, 
  onViewHistory, 
  onEdit, 
  onDelete, 
  onAddWeight, 
  onViewWeights,
  isAdmin
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`
      group relative overflow-hidden rounded-[32px] border transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl
      ${isDark 
        ? 'bg-slate-900/90 border-slate-700/60 shadow-black/40 text-white' 
        : 'bg-white border-slate-200 shadow-slate-200/60 text-slate-900'}
    `}>
      {/* Decorative Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-700 opacity-90" />

      {/* Header Info */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${
            animal.destino === 'Pie de Cría' 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-extrabold' 
              : 'bg-rose-600/20 text-rose-300 border-rose-500/30 font-extrabold'
          }`}>
            {animal.destino}
          </div>
          
          <div className="flex gap-2">
            <button 
              title="Editar Animal" 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white' : 'bg-slate-100 hover:bg-cyan-600 text-slate-700 hover:text-white'}`}
            >
              <Edit3 size={16} />
            </button>
            {isAdmin && (
              <button 
                title="Eliminar Animal" 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-rose-950/60 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-800/40' : 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200'}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>IDENTIFICADOR</span>
            <h4 className="text-4xl font-black font-display tracking-tighter mt-1">{animal.arete}</h4>
          </div>
          <div className="text-right">
             <div className={`text-[10px] font-bold px-3 py-1 rounded-lg inline-block mb-1 border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'}`}>
               {animal.raza}
             </div>
             <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
               {animal.sexo} • <span className={isDark ? 'text-cyan-400 font-black' : 'text-rose-700 font-black'}>
                  {Math.floor((new Date().getTime() - new Date(animal.fecha_nacimiento).getTime()) / (1000 * 60 * 60 * 24 * 30.44))}
               </span> meses
             </p>
          </div>
        </div>
      </div>

      {/* Separator / Vital Stats */}
      <div className={`mx-6 py-4 border-y flex divide-x ${isDark ? 'border-slate-800 divide-slate-800' : 'border-slate-100 divide-slate-100'}`}>
        <div className="flex-1 px-2 text-center">
            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>LINAJE</p>
            <p className="text-[11px] font-bold truncate">
              {animal.padre_id || '--'} x {animal.madre_id || '--'}
            </p>
        </div>
        <div className="flex-1 px-2 text-center">
            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CORRAL</p>
            <p className="text-[11px] font-bold text-cyan-400">{animal.corral_id || 'SIN ASIGNAR'}</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 pt-4 flex gap-3">
        <button 
          onClick={onAddWeight}
          className={`group/btn flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border ${
            isDark 
              ? 'bg-slate-800/80 border-slate-700/60 hover:bg-cyan-600/30 hover:border-cyan-500 text-slate-200' 
              : 'bg-slate-50 border-slate-200 hover:bg-cyan-50 hover:border-cyan-300 text-slate-800'
          }`}
        >
          <TrendingUp size={18} className="text-cyan-400" />
          <span className="text-[9px] font-black uppercase">Peso</span>
        </button>

        <button 
          onClick={onTreatment}
          className={`group/btn flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border ${
            isDark 
              ? 'bg-slate-800/80 border-slate-700/60 hover:bg-rose-600/30 hover:border-rose-500 text-slate-200' 
              : 'bg-slate-50 border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-slate-800'
          }`}
        >
          <Syringe size={18} className="text-rose-400" />
          <span className="text-[9px] font-black uppercase">Clínico</span>
        </button>

        <button 
          onClick={onViewHistory}
          className={`group/btn flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border ${
            isDark 
              ? 'bg-slate-800/80 border-slate-700/60 hover:bg-blue-600/30 hover:border-blue-500 text-slate-200' 
              : 'bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-slate-800'
          }`}
        >
          <HistoryIcon size={18} className="text-blue-400" />
          <span className="text-[9px] font-black uppercase">Kardex</span>
        </button>
      </div>
    </div>
  );
};

export default AnimalCard;
