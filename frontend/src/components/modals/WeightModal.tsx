import React from 'react';
import Modal from '../shared/Modal';

interface WeightModalProps {
  show: boolean;
  onClose: () => void;
  selectedAnimal: any;
  form: any;
  setForm: (form: any) => void;
  onAdd: () => void;
}

const WeightModal: React.FC<WeightModalProps> = ({ 
  show, 
  onClose, 
  selectedAnimal, 
  form, 
  setForm, 
  onAdd 
}) => {
  return (
    <Modal show={show} onClose={onClose} title={`Registrar Peso - ${selectedAnimal?.arete}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Peso (kg)</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.peso} 
              onChange={e => setForm({...form, peso: parseFloat(e.target.value)})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Fecha</label>
            <input 
              type="date" 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.fecha} 
              onChange={e => setForm({...form, fecha: e.target.value})} 
            />
          </div>
        </div>
        <textarea 
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white h-24" 
          value={form.notas} 
          onChange={e => setForm({...form, notas: e.target.value})} 
          placeholder="Notas..." 
        />
        <button 
          onClick={onAdd} 
          className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl uppercase tracking-widest text-xs"
        >
          GUARDAR PESAJE
        </button>
      </div>
    </Modal>
  );
};

export default WeightModal;
