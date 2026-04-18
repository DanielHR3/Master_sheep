import React from 'react';
import { X, ClipboardList, Calendar, Pill, User, MessageCircle, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ClinicalHistoryModalProps {
  show: boolean;
  onClose: () => void;
  selectedAnimal: any;
  history: any[];
}

const ClinicalHistoryModal: React.FC<ClinicalHistoryModalProps> = ({ show, onClose, selectedAnimal, history }) => {
  if (!show || !selectedAnimal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-8 border-b border-white/5 bg-antique-brass/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-antique-brass/20 rounded-2xl text-antique-brass">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic font-serif">Historial Clínico</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">EXPEDIENTE: {selectedAnimal.arete}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-950/20">
          {history.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
               <div className="p-6 bg-slate-900 rounded-full border border-white/5"><ClipboardList size={48} /></div>
               <p className="text-sm font-black uppercase tracking-widest">Sin antecedentes clínicos registrados</p>
            </div>
          ) : (
            <div className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
              {history.map((h, i) => (
                <div key={i} className="relative pl-12 group">
                  <div className={`absolute left-0 top-1 w-10 h-10 rounded-xl border-4 border-slate-900 flex items-center justify-center z-10 transition-all ${h.en_retiro ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-400'}`}>
                    {h.en_retiro ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                  
                  <div className="p-6 bg-slate-900/50 border border-white/5 rounded-3xl hover:border-antique-brass/20 transition-all">
                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-2xl font-black text-white font-serif italic">{h.insumo}</p>
                          <span className="px-2 py-0.5 bg-antique-brass/10 text-antique-brass text-[8px] font-black rounded uppercase">{h.dosis} {h.unidad}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {h.fecha}</span>
                          <span className="flex items-center gap-1"><User size={12} /> {h.tecnico || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {h.en_retiro && (
                        <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                          <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Periodo de Retiro Activo</p>
                          <p className="text-[10px] text-amber-200 font-bold flex items-center gap-1">
                            <Clock size={10} /> Hasta: {h.fecha_fin_retiro}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {h.observaciones && (
                      <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex gap-3 italic">
                        <MessageCircle size={14} className="text-slate-600 mt-1 shrink-0" />
                        <p className="text-xs text-slate-400 leading-relaxed font-bold">"{h.observaciones}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-white/5 bg-slate-950/50">
          <button
            onClick={onClose}
            className="w-full px-8 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
          >
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClinicalHistoryModal;
