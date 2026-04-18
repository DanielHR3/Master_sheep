import React from 'react';
import Modal from '../shared/Modal';

interface AddAnimalModalProps {
  show: boolean;
  onClose: () => void;
  form: any;
  setForm: (form: any) => void;
  onAdd: () => void;
  corrales: any[];
}

const AddAnimalModal: React.FC<AddAnimalModalProps> = ({ show, onClose, form, setForm, onAdd, corrales }) => {
  return (
    <Modal show={show} onClose={onClose} title="Agregar Nuevo Animal">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Número de Arete</label>
            <input 
              type="text" 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.arete} 
              onChange={e => setForm({...form, arete: e.target.value})} 
              placeholder="SM-001" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Raza</label>
            <input 
              type="text" 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.raza} 
              onChange={e => setForm({...form, raza: e.target.value})} 
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Sexo</label>
            <select 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.sexo} 
              onChange={e => setForm({...form, sexo: e.target.value})}
            >
              <option value="Hembra">Hembra</option>
              <option value="Macho">Macho</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Corral</label>
            <select 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.corral} 
              onChange={e => setForm({...form, corral: e.target.value})}
            >
              <option value="">Sin asignar</option>
              {corrales.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Fecha Nacimiento</label>
            <input 
              type="date" 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.fecha_nacimiento} 
              onChange={e => setForm({...form, fecha_nacimiento: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Peso al Nacer (kg)</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.peso} 
              onChange={e => setForm({...form, peso: e.target.value})} 
            />
          </div>
        </div>
        <button 
          onClick={onAdd} 
          className="w-full py-4 bg-saddle-tan text-white font-black rounded-xl hover:bg-antique-brass transition-all"
        >
          GUARDAR ANIMAL
        </button>
      </div>
    </Modal>
  );
};

export default AddAnimalModal;
