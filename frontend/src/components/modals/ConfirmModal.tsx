import React from 'react';
import { X, CheckCircle2, FlaskConical, AlertCircle, Save } from 'lucide-react';

interface ConfirmModalProps {
  show: boolean;
  onClose: () => void;
  selectedAnimal: any;
  onConfirm: (result: string) => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ show, onClose, selectedAnimal, onConfirm }) => {
  if (!show || !selectedAnimal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-8 border-b border-white/5 bg-amber-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
              <FlaskConical size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic font-serif">Confirmar Ultrasonido</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Animal: {selectedAnimal.arete}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 space-y-6">
          <p className="text-center text-slate-400 font-bold text-sm">Seleccione el resultado del diagnóstico de gestación para este animal:</p>
          
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => onConfirm('Positivo')}
              className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-500 flex items-center justify-between group hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5"
            >
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-white/20 transition-colors"><CheckCircle2 size={24} /></div>
                 <div className="text-left">
                    <p className="text-xl font-black italic font-serif">Gestante</p>
                    <p className="text-[10px] uppercase font-bold opacity-70">Confirmado Positivo</p>
                 </div>
              </div>
            </button>

            <button
              onClick={() => onConfirm('Negativo')}
              className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-500 flex items-center justify-between group hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5"
            >
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-rose-500/10 rounded-xl group-hover:bg-white/20 transition-colors"><AlertCircle size={24} /></div>
                 <div className="text-left">
                    <p className="text-xl font-black italic font-serif">Vacía</p>
                    <p className="text-[10px] uppercase font-bold opacity-70">Confirmado Negativo</p>
                 </div>
              </div>
            </button>
          </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-slate-950/50">
          <button
            onClick={onClose}
            className="w-full px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
