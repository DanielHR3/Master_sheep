import React from 'react';
import { X, Save, FlaskConical, Beaker, Package, Calendar, User, DollarSign, Activity } from 'lucide-react';

interface AddInsumoModalProps {
  show: boolean;
  onClose: () => void;
  form: any;
  setForm: (form: any) => void;
  onAdd: () => void;
}

const AddInsumoModal: React.FC<AddInsumoModalProps> = ({ show, onClose, form, setForm, onAdd }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-8 border-b border-white/5 bg-emerald-600/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl">
              <FlaskConical className="text-emerald-500" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic font-serif">Nuevo Insumo</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Medicamentos, Alimento y Materiales</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Beaker size={12} /> Nombre del Insumo
              </label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-slate-700"
                placeholder="Ej. Ivermectina 1%"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Activity size={12} /> Tipo de Insumo
              </label>
              <select
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="Medicamento">Medicamento</option>
                <option value="Alimento">Alimento / Suplemento</option>
                <option value="Material">Material de Trabajo</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div className="space-y-2 text-white">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Package size={12} /> Stock Actual
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold pr-16"
                  value={form.stock_actual}
                  onChange={e => setForm({ ...form, stock_actual: parseFloat(e.target.value) })}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-500">{form.unidad}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Activity size={12} /> Stock Mínimo (Alerta)
              </label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                value={form.stock_minimo}
                onChange={e => setForm({ ...form, stock_minimo: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Unidad de Medida</label>
              <select
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                value={form.unidad}
                onChange={e => setForm({ ...form, unidad: e.target.value })}
              >
                <option value="ml">Mililitros (ml)</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="unidades">Unidades</option>
                <option value="dosis">Dosis</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <DollarSign size={12} /> Costo Unitario
              </label>
              <input
                type="number"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                placeholder="0.00"
                value={form.costo_unitario}
                onChange={e => setForm({ ...form, costo_unitario: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Package size={12} /> Lote
              </label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-slate-700"
                placeholder="No. Lote"
                value={form.lote}
                onChange={e => setForm({ ...form, lote: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <Calendar size={12} /> Fecha de Vencimiento
              </label>
              <input
                type="date"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                value={form.fecha_vencimiento}
                onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
                <User size={12} /> Proveedor
              </label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:text-slate-700"
                placeholder="Nombre del proveedor o laboratorio"
                value={form.proveedor}
                onChange={e => setForm({ ...form, proveedor: e.target.value })}
              />
            </div>
            
            <div className="md:col-span-2 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-4">
               <div className="p-2 bg-emerald-500/20 rounded-lg"><Activity className="text-emerald-500" size={16} /></div>
               <div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase">Tiempo de Retiro</p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase mb-2">Días que deben pasar antes de consumo humano después de aplicar este insumo.</p>
                  <input
                    type="number"
                    className="w-24 bg-slate-950 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-bold"
                    value={form.dias_retiro}
                    onChange={e => setForm({ ...form, dias_retiro: parseInt(e.target.value) })}
                  />
                  <span className="ml-3 text-[10px] font-black text-slate-400">DÍAS</span>
               </div>
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
            onClick={onAdd}
            className="flex-3 px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all"
          >
            <Save size={18} /> Guardar Insumo
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddInsumoModal;
