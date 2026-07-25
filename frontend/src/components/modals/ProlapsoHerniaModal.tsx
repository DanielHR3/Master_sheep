import React from 'react';
import Modal from '../shared/Modal';

interface ProlapsoHerniaModalProps {
  show: boolean;
  onClose: () => void;
  selectedAnimal: any;
  form: any;
  setForm: (form: any) => void;
  onRegister: () => void;
}

const ProlapsoHerniaModal: React.FC<ProlapsoHerniaModalProps> = ({ 
  show, 
  onClose, 
  selectedAnimal, 
  form, 
  setForm, 
  onRegister 
}) => {
  return (
    <Modal show={show} onClose={onClose} title={`Registro Prolapso/Hernia - ${selectedAnimal?.arete}`}>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500">Tipo de Incidencia</label>
          <select 
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500" 
            value={form.diagnostico || ''} 
            onChange={e => setForm({...form, diagnostico: e.target.value})}
          >
            <option value="">Seleccionar...</option>
            <option value="Prolapso">Prolapso</option>
            <option value="Hernia">Hernia</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Médico / Técnico</label>
            <input 
              type="text" 
              placeholder="Nombre del MVZ"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.mvz || ''} 
              onChange={e => setForm({...form, mvz: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Fecha de Incidencia</label>
            <input 
              type="date" 
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
              value={form.fecha || ''} 
              onChange={e => setForm({...form, fecha: e.target.value})} 
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-500">Tratamiento o Corrección</label>
          <textarea 
            placeholder="Describa el tratamiento aplicado..."
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white h-24" 
            value={form.tratamiento || ''} 
            onChange={e => setForm({...form, tratamiento: e.target.value})} 
          />
        </div>
        <button 
          onClick={onRegister} 
          className="w-full py-4 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-600 transition-all uppercase tracking-widest text-xs"
        >
          Guardar Registro
        </button>
      </div>
    </Modal>
  );
};

export default ProlapsoHerniaModal;
