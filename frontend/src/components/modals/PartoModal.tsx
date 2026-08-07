import React from 'react';
import { X, Save, Baby, MessageSquare, Plus, Minus, HeartHandshake } from 'lucide-react';

interface PartoModalProps {
  show: boolean;
  onClose: () => void;
  form: any;
  setForm: (form: any) => void;
  onRegister: () => void;
  selectedAnimal?: any;
  animals?: any[];
}

const PartoModal: React.FC<PartoModalProps> = ({ 
  show, 
  onClose, 
  form, 
  setForm, 
  onRegister, 
  selectedAnimal,
  animals = []
}) => {
  if (!show) return null;

  const femaleAnimals = (Array.isArray(animals) ? animals : []).filter(a => a.sexo === 'Hembra');
  const mother = selectedAnimal || femaleAnimals.find(a => a.id === form.animal_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-[36px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 text-slate-900 dark:text-white">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 px-8 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/40">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
              <Baby size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">Registrar Parto</h2>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider mt-0.5">
                {mother ? `Madre: ${mother.arete} (${mother.raza || 'Borrega'})` : 'Selección de Madre'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 space-y-6">
          
          {/* Madre Selector if no mother was pre-selected */}
          {!selectedAnimal && (
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider ml-1 flex items-center gap-2">
                <HeartHandshake size={14} className="text-emerald-600 dark:text-emerald-400" /> Borrega Madre (Arete)
              </label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                value={form.animal_id || ''}
                onChange={e => setForm({ ...form, animal_id: e.target.value })}
              >
                <option value="">-- Seleccionar Borrega --</option>
                {femaleAnimals.map(a => (
                  <option key={a.id} value={a.id}>
                    Arete: {a.arete} ({a.raza || 'Sin Raza'}) - Corral: {a.corral_id || 'General'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cantidad de crías */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider ml-1 flex items-center gap-2">
              <Baby size={14} className="text-emerald-600 dark:text-emerald-400" /> Cantidad de Crías Nacidas
            </label>
            <div className="flex items-center justify-center gap-6 bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
              <button 
                type="button"
                onClick={() => setForm({ ...form, cantidad_crias: Math.max(1, (form.cantidad_crias || 1) - 1) })}
                className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Minus size={22} />
              </button>
              <span className="text-5xl font-black text-slate-900 dark:text-white font-display w-20 text-center">{form.cantidad_crias || 1}</span>
              <button 
                type="button"
                onClick={() => setForm({ ...form, cantidad_crias: (form.cantidad_crias || 1) + 1 })}
                className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus size={22} />
              </button>
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider ml-1 flex items-center gap-2">
              <MessageSquare size={14} className="text-emerald-600 dark:text-emerald-400" /> Observaciones o Estado
            </label>
            <textarea
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium min-h-[90px] resize-none"
              placeholder="Ej. Parto sin complicaciones, 2 corderos sanos..."
              value={form.observaciones || ''}
              onChange={e => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 px-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onRegister}
            className="flex-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all active:scale-95 cursor-pointer"
          >
            <Save size={18} /> Confirmar y Guardar Parto
          </button>
        </div>

      </div>
    </div>
  );
};

export default PartoModal;
