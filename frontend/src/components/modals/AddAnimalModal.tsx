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
  const isPieDeCria = true;

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

        {true && (
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
              value={form.peso_nacer || ''} 
              onChange={e => setForm({...form, peso_nacer: parseFloat(e.target.value) || 0})} 
            />
          </div>
        </div>

        {/* Sección Genética (Solo Yellowstone / Pie de Cría) */}
        {isPieDeCria && (
          <div className="p-4 border border-rose-900/50 bg-rose-950/20 rounded-2xl space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-rose-400">Datos Genéticos y de Concepción</h4>
            
            <div className="grid grid-cols-2 gap-4">
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
                  <option value="Inducción">Inducción (Hormonal)</option>
                  <option value="Transferencia de Embriones">Transferencia de Embriones</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <label className="text-[10px] font-black uppercase text-slate-500">Peso 150 días (kg)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
                  value={form.peso_150_dias || ''} 
                  onChange={e => setForm({...form, peso_150_dias: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Foto (URL o Nombre de archivo)</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white" 
                placeholder="https://... o foto.jpg"
                value={form.foto || ''} 
                onChange={e => setForm({...form, foto: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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
          className="w-full py-4 bg-saddle-tan text-white font-black rounded-xl hover:bg-antique-brass transition-all"
        >
          GUARDAR ANIMAL
        </button>
      </div>
    </Modal>
  );
};

export default AddAnimalModal;
