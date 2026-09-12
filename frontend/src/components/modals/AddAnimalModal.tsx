import React from 'react';
import Modal from '../shared/Modal';
import { main } from "../../../wailsjs/go/models";
import ImageUpload from '../ImageUpload';
import CertificateFields from './CertificateFields';
import { useStore } from '../../context/useStore';
import { Slider } from '../ui/slider';

interface AddAnimalModalProps {
  show: boolean;
  onClose: () => void;
  form: any;
  setForm: (form: any) => void;
  onAdd: () => void;
  corrales: any[];
  user?: any;
}

const AddAnimalModal: React.FC<AddAnimalModalProps> = ({ show, onClose, form, setForm, onAdd, corrales, user }) => {
  const store = useStore();
  const rawRancho = (store.selectedRanchOverride || user?.rancho_id || user?.name || '').toUpperCase();
  const isPieDeCria = rawRancho.includes('BUGAMBILIAS') || (store.selectedRanchOverride ? false : (user?.email?.toLowerCase() || '').includes('bugambilias'));

  return (
    <Modal show={show} onClose={onClose} title="Agregar Nuevo Animal">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {isPieDeCria && (
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Especie</label>
              <select 
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                value={(form as any).especie || 'Ovino'} 
                onChange={e => setForm({...form, especie: e.target.value})}
              >
                <option value="Ovino">Borrego (Ovino)</option>
                <option value="Bovino">Vaca (Bovino)</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="text-[10px] font-black uppercase text-slate-500 flex items-center justify-between">
              <span>Peso al Nacer (kg)</span>
              <span className="text-cyan-400 font-bold normal-case text-xs">{(form.peso_nacer || 0).toFixed(1)} kg</span>
            </label>
            <Slider
              min={0}
              max={8}
              step={0.1}
              value={[form.peso_nacer || 0]}
              onValueChange={([val]) => setForm({...form, peso_nacer: val})}
            />
          </div>
        </div>

        {/* Sección Genética (Solo Yellowstone / Pie de Cría) */}
        {isPieDeCria && (
          <div className="p-4 border border-rose-900/50 bg-rose-950/20 rounded-2xl space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-rose-400">Datos Genéticos y de Concepción</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Tipo de Parto</label>
                <select 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
                  value={form.tipo_parto || ''} 
                  onChange={e => setForm({...form, tipo_parto: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Sencillo">Sencillo</option>
                  <option value="Doble">Doble</option>
                  <option value="Triple">Triple</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Método de Concepción</label>
                <select 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
                  value={form.metodo_concepcion || ''} 
                  onChange={e => setForm({...form, metodo_concepcion: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Monta Natural">Monta Natural</option>
                  <option value="Inseminación Artificial">Inseminación Artificial</option>
                  <option value="Transferencia de Embriones">Transferencia de Embriones</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Tipo de Nacimiento</label>
                <select 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
                  value={form.tipo_nacimiento || ''} 
                  onChange={e => setForm({...form, tipo_nacimiento: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Natural">Parto natural</option>
                  <option value="Inducido">Parto inducido</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Fecha de Destete</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
                  value={form.fecha_destete || ''} 
                  onChange={e => setForm({...form, fecha_destete: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center justify-between">
                  <span>Peso 150 días (kg)</span>
                  <span className="text-cyan-400 font-bold normal-case text-xs">{(form.peso_150_dias || 0).toFixed(1)} kg</span>
                </label>
                <Slider
                  min={0}
                  max={60}
                  step={0.5}
                  value={[form.peso_150_dias || 0]}
                  onValueChange={([val]) => setForm({...form, peso_150_dias: val})}
                />
              </div>
            </div>

            <CertificateFields values={form} onChange={(k, v) => setForm({ ...form, [k]: v })} />

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Foto del Animal</label>
              <ImageUpload 
                value={form.foto || ''} 
                onChange={(val) => setForm({...form, foto: val})} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Arete Padre</label>
                <input 
                  type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
                  value={form.padre_id || ''} onChange={e => setForm({...form, padre_id: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Arete Madre</label>
                <input 
                  type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
                  value={form.madre_id || ''} onChange={e => setForm({...form, madre_id: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Abuelo Paterno</label>
                <input 
                  type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs" 
                  value={form.abuelo_paterno_id || ''} onChange={e => setForm({...form, abuelo_paterno_id: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Abuela Paterna</label>
                <input 
                  type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs" 
                  value={form.abuela_paterna_id || ''} onChange={e => setForm({...form, abuela_paterna_id: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Abuelo Materno</label>
                <input 
                  type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs" 
                  value={form.abuelo_materno_id || ''} onChange={e => setForm({...form, abuelo_materno_id: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Abuela Materna</label>
                <input 
                  type="text" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs" 
                  value={form.abuela_materna_id || ''} onChange={e => setForm({...form, abuela_materna_id: e.target.value})} 
                />
              </div>
            </div>
          </div>
        )}
        <button 
          onClick={onAdd} 
          className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-500 transition-all uppercase tracking-widest shadow-lg shadow-emerald-500/20"
        >
          Guardar Animal
        </button>
      </div>
    </Modal>
  );
};

export default AddAnimalModal;
