import React from 'react';
import Modal from '../shared/Modal';

interface AddCorralModalProps {
  show: boolean;
  onClose: () => void;
  form: any;
  setForm: (form: any) => void;
  onAdd: () => void;
}

const AddCorralModal: React.FC<AddCorralModalProps> = ({ show, onClose, form, setForm, onAdd }) => {
  return (
    <Modal show={show} onClose={onClose} title="Nuevo Registro de Corral">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500">Nombre del Corral</label>
          <input 
            type="text" 
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
            value={form.nombre} 
            onChange={e => setForm({...form, nombre: e.target.value})} 
            placeholder="Ej. Corral de Engorda 1" 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Tipo / Propósito</label>
            <select 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.tipo} 
              onChange={e => setForm({...form, tipo: e.target.value})}
            >
              <option value="General">General</option>
              <option value="Maternidad">Maternidad</option>
              <option value="Engorda">Engorda</option>
              <option value="Cuarentena">Cuarentena</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Capacidad (Animales)</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.capacidad} 
              onChange={e => setForm({...form, capacidad: parseInt(e.target.value)})} 
            />
          </div>
        </div>
        <button 
          onClick={onAdd} 
          className="w-full py-4 bg-antique-brass text-white font-black rounded-xl hover:bg-saddle-tan transition-all"
        >
          CREAR CORRAL
        </button>
      </div>
    </Modal>
  );
};

export default AddCorralModal;
