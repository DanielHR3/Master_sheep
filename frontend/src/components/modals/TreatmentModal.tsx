import React from 'react';
import Modal from '../shared/Modal';

interface TreatmentModalProps {
  show: boolean;
  onClose: () => void;
  selectedAnimal: any;
  form: any;
  setForm: (form: any) => void;
  onRegister: () => void;
  insumos: any[];
}

const TreatmentModal: React.FC<TreatmentModalProps> = ({ 
  show, 
  onClose, 
  selectedAnimal, 
  form, 
  setForm, 
  onRegister, 
  insumos 
}) => {
  return (
    <Modal show={show} onClose={onClose} title={`Nuevo Tratamiento - ${selectedAnimal?.arete}`}>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500">Insumo / Medicamento</label>
          <select 
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
            value={form.insumo_id} 
            onChange={e => setForm({...form, insumo_id: e.target.value})}
          >
            <option value="">Seleccionar...</option>
            {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.stock_actual} en stock)</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Dosis</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.dosis} 
              onChange={e => setForm({...form, dosis: parseFloat(e.target.value)})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Días de Duración</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.duracion} 
              onChange={e => setForm({...form, duracion: parseInt(e.target.value)})} 
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500">Observaciones</label>
          <textarea 
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white h-24" 
            value={form.observaciones} 
            onChange={e => setForm({...form, observaciones: e.target.value})} 
          />
        </div>
        <button 
          onClick={onRegister} 
          className="w-full py-4 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-600 transition-all"
        >
          REGISTRAR EN BITÁCORA
        </button>
      </div>
    </Modal>
  );
};

export default TreatmentModal;
