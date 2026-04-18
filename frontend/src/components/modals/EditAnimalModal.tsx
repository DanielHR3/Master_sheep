import React from 'react';
import { X, Save, Edit3, Tag, Map, Calendar, Scale, Users, Target, Activity } from 'lucide-react';
import { main } from "../../../wailsjs/go/models";

interface EditAnimalModalProps {
  show: boolean;
  onClose: () => void;
  form: main.Animal | null;
  setForm: (form: main.Animal | null) => void;
  onUpdate: () => void;
  corrales: main.Corral[];
}

const EditAnimalModal: React.FC<EditAnimalModalProps> = ({ show, onClose, form, setForm, onUpdate, corrales }) => {
  if (!show || !form) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-8 border-b border-white/5 bg-antique-brass/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-antique-brass/20 rounded-2xl text-antique-brass">
              <Edit3 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic font-serif">Editar Animal</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Actualizar información del ejemplar: {form.arete}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Tag size={12} /> Numero de Arete
              </label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-antique-brass/50 transition-all font-bold"
                value={form.arete}
                onChange={e => setForm({ ...form, arete: e.target.value } as main.Animal)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Target size={12} /> Raza
              </label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-antique-brass/50 transition-all font-bold"
                value={form.raza}
                onChange={e => setForm({ ...form, raza: e.target.value } as main.Animal)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Users size={12} /> Sexo
              </label>
              <select
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-antique-brass/50 transition-all font-bold"
                value={form.sexo}
                onChange={e => setForm({ ...form, sexo: e.target.value } as main.Animal)}
              >
                <option value="Hembra">Hembra</option>
                <option value="Macho">Macho</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Map size={12} /> Corral Asignado
              </label>
              <select
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-antique-brass/50 transition-all font-bold"
                value={form.corral_id}
                onChange={e => setForm({ ...form, corral_id: e.target.value } as main.Animal)}
              >
                <option value="">Seleccione un corral</option>
                {corrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Calendar size={12} /> Fecha de Nacimiento
              </label>
              <input
                type="date"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-antique-brass/50 transition-all font-bold"
                value={form.fecha_nacimiento}
                onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value } as main.Animal)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Scale size={12} /> Peso al Nacer (kg)
              </label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-antique-brass/50 transition-all font-bold"
                value={form.peso_nacer}
                onChange={e => setForm({ ...form, peso_nacer: parseFloat(e.target.value) } as main.Animal)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Estatus</label>
              <select
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-antique-brass/50 transition-all font-bold"
                value={form.estatus}
                onChange={e => setForm({ ...form, estatus: e.target.value } as main.Animal)}
              >
                <option value="Activo">Activo</option>
                <option value="Vendido">Vendido</option>
                <option value="Baja">Baja / Muerto</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Activity size={12} /> Estado Reproductivo
              </label>
              <select
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-antique-brass/50 transition-all font-bold"
                value={form.estado_reproductivo}
                onChange={e => setForm({ ...form, estado_reproductivo: e.target.value } as main.Animal)}
              >
                <option value="Crecimiento">Crecimiento</option>
                <option value="Vacia">Vacía</option>
                <option value="Gestante">Gestante</option>
                <option value="Lactando">Lactando</option>
                <option value="Semental">Semental</option>
              </select>
            </div>
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
            onClick={onUpdate}
            className="flex-3 px-12 py-4 bg-antique-brass text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-antique-brass/20 flex items-center justify-center gap-3 hover:bg-opacity-90 transition-all font-serif italic"
          >
            <Save size={18} /> Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAnimalModal;
