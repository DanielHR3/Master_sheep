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
  return (
    <div className="p-6 bg-clay/30 border border-white/5 rounded-[40px] relative group hover:scale-[1.02] transition-all">
       <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onAddWeight} className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg transition-all" title="Registrar Peso">
            <ArrowRightLeft size={14} className="rotate-90" />
          </button>
          <button onClick={onViewWeights} className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-lg transition-all" title="Historial de Pesos">
            <TrendingUp size={14} />
          </button>
          <button onClick={onEdit} className="p-2 bg-white/10 hover:bg-antique-brass text-white rounded-lg transition-all">
            <Edit3 size={14} />
          </button>
          <button onClick={onDelete} className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all">
            <Trash2 size={14} />
          </button>
       </div>
       <div className="flex justify-between mb-4">
          <div className="p-3 bg-slate-950 rounded-2xl">
            <Activity size={20} className="text-antique-brass" />
          </div>
          <div className="text-right pr-12">
            <p className="text-[10px] text-slate-500 font-bold uppercase">{animal.raza}</p>
            <p className="text-white font-bold">{animal.sexo}</p>
          </div>
       </div>
       <h4 className="text-3xl font-black font-display text-white mb-4 tracking-tight">{animal.arete}</h4>
       <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-slate-950 rounded-xl text-center">
            <p className="text-[8px] text-slate-500 uppercase font-black">Estatus</p>
            <p className="text-[10px] text-emerald-400 font-bold truncate">{animal.estado_reproductivo}</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl text-center">
            <p className="text-[8px] text-slate-500 uppercase font-black">Corral</p>
            <p className="text-[10px] text-white font-bold">{animal.corral_id}</p>
          </div>
       </div>
       <div className="flex gap-2">
          <button onClick={onSelect} className="flex-1 bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-all flex justify-center" title="Confirmar Gestación">
            <Activity size={18} className="text-slate-400" />
          </button>
          <button onClick={onTreatment} className="flex-1 bg-rose-500/10 p-3 rounded-xl hover:bg-rose-500 transition-all flex justify-center" title="Tratamiento">
            <Syringe size={18} className="text-rose-500 group-hover:text-white" />
          </button>
          <button onClick={onViewHistory} className="flex-1 bg-blue-500/10 p-3 rounded-xl hover:bg-blue-500 transition-all flex justify-center" title="Ver Historial">
            <HistoryIcon size={18} className="text-blue-500 group-hover:text-white" />
          </button>
       </div>
    </div>
  );
};

export default AnimalCard;
