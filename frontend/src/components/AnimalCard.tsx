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
  onViewWeights 
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`
      group relative overflow-hidden rounded-[32px] border transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl
      ${isDark 
        ? 'bg-clay/40 border-white/5 shadow-black/40 text-white' 
        : 'bg-white border-slate-200 shadow-slate-200/50 text-slate-900'}
    `}>
      {/* Decorative Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-6666-maroon opacity-80" />

      {/* Header Info */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border shadow-sm ${
            animal.destino === 'Pie de Cría' 
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
              : 'bg-6666-maroon/10 text-6666-maroon border-6666-maroon/20'
          }`}>
            {animal.destino}
          </div>
          
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
            <button onClick={onEdit} className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
              <Edit3 size={14} />
            </button>
            <button onClick={onDelete} className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white' : 'bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white'}`}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>IDENTIFICADOR</span>
            <h4 className="text-4xl font-black font-display tracking-tighter mt-1">{animal.arete}</h4>
          </div>
          <div className="text-right">
             <div className={`text-[10px] font-bold px-2 py-1 rounded-lg inline-block mb-1 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
               {animal.raza}
             </div>
             <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
               {animal.sexo} • <span className={isDark ? 'text-white' : 'text-6666-maroon'}>
                  {Math.floor((new Date().getTime() - new Date(animal.fecha_nacimiento).getTime()) / (1000 * 60 * 60 * 24 * 30.44))}
               </span> meses
             </p>
          </div>
        </div>
      </div>

      {/* Separator / Vital Stats */}
      <div className={`mx-6 py-4 border-y flex divide-x ${isDark ? 'border-white/5 divide-white/5' : 'border-slate-100 divide-slate-100'}`}>
        <div className="flex-1 px-2 text-center">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">LINAGE</p>
            <p className="text-[10px] font-bold truncate">
              {animal.padre_id || '--'} x {animal.madre_id || '--'}
            </p>
        </div>
        <div className="flex-1 px-2 text-center">
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">CORRAL</p>
            <p className="text-[10px] font-bold">{animal.corral_id || 'SIN ASIGNAR'}</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 pt-4 flex gap-3">
        <button 
          onClick={onAddWeight}
          className={`group/btn flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border ${
            isDark 
              ? 'bg-clay/50 border-white/5 hover:bg-antique-brass/20 hover:border-antique-brass/40' 
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
          }`}
        >
          <TrendingUp size={18} className={isDark ? 'text-antique-brass' : 'text-slate-600'} />
          <span className="text-[8px] font-black uppercase text-slate-500">Peso</span>
        </button>

        <button 
          onClick={onTreatment}
          className={`group/btn flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border ${
            isDark 
              ? 'bg-clay/50 border-white/5 hover:bg-rose-500/20 hover:border-rose-500/40' 
              : 'bg-slate-50 border-slate-200 hover:bg-rose-50 hover:border-rose-200'
          }`}
        >
          <Syringe size={18} className="text-rose-500" />
          <span className="text-[8px] font-black uppercase text-slate-500">Clínico</span>
        </button>

        <button 
          onClick={onViewHistory}
          className={`group/btn flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border ${
            isDark 
              ? 'bg-clay/50 border-white/5 hover:bg-blue-500/20 hover:border-blue-500/40' 
              : 'bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-200'
          }`}
        >
          <HistoryIcon size={18} className="text-blue-500" />
          <span className="text-[8px] font-black uppercase text-slate-500">Kardex</span>
        </button>
      </div>
    </div>
  );
};

export default AnimalCard;
