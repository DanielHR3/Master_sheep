import React from 'react';
import { X, Save, Baby, Calendar, MessageSquare, Plus, Minus } from 'lucide-react';

interface PartoModalProps {
  show: boolean;
  onClose: () => void;
  form: any;
  setForm: (form: any) => void;
  onRegister: () => void;
  selectedAnimal: any;
}

const PartoModal: React.FC<PartoModalProps> = ({ show, onClose, form, setForm, onRegister, selectedAnimal }) => {
  if (!show || !selectedAnimal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-8 border-b border-white/5 bg-rose-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-500">
              <Baby size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic font-serif">Registrar Parto</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Madre: {selectedAnimal.arete}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
              <Baby size={12} /> Cantidad de Crías
            </label>
            <div className="flex items-center justify-center gap-8 bg-slate-950 p-6 rounded-3xl border border-white/5">
              <button 
                onClick={() => setForm({ ...form, cantidad_crias: Math.max(1, form.cantidad_crias - 1) })}
                className="p-4 bg-slate-900 border border-white/10 rounded-2xl text-white hover:bg-rose-500 transition-all shadow-lg"
              >
                <Minus size={24} />
              </button>
              <span className="text-6xl font-black text-white italic font-serif w-20 text-center">{form.cantidad_crias}</span>
              <button 
                onClick={() => setForm({ ...form, cantidad_crias: form.cantidad_crias + 1 })}
                className="p-4 bg-slate-900 border border-white/10 rounded-2xl text-white hover:bg-rose-500 transition-all shadow-lg"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
              <Calendar size={12} /> Fecha del Evento
            </label>
            <input
              type="date"
              className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-rose-500/50 transition-all font-bold"
              value={new Date().toISOString().split('T')[0]} // Fixed today, but could be dynamic
              readOnly
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
              <MessageSquare size={12} /> Observaciones
            </label>
            <textarea
              className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-rose-500/50 transition-all font-bold min-h-[100px] resize-none"
              placeholder="Ej. Parto normal, crías fuertes..."
              value={form.observaciones}
              onChange={e => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-slate-950/50 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onRegister}
            className="flex-3 px-12 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/20 flex items-center justify-center gap-3 hover:bg-rose-500 transition-all"
          >
            <Save size={18} /> Confirmar Parto
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartoModal;
