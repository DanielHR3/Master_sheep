import React, { useState } from 'react';
import { X, Lock, ShieldCheck, Key, Save, Eye, EyeOff } from 'lucide-react';

interface ChangePasswordModalProps {
  show: boolean;
  onClose: () => void;
  form: any;
  setForm: (form: any) => void;
  onUpdate: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ show, onClose, form, setForm, onUpdate }) => {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-8 border-b border-white/5 bg-slate-100/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl text-white">
              <Lock size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic font-serif">Seguridad</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cambiar Contraseña</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
              <Key size={12} /> Contraseña Actual
            </label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-4 pr-12 py-4 text-white focus:outline-none focus:border-white/20 transition-all font-bold"
                placeholder="••••••••"
                value={form.old}
                onChange={e => setForm({ ...form, old: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
              <Key size={12} /> Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-4 pr-12 py-4 text-white focus:outline-none focus:border-white/20 transition-all font-bold"
                placeholder="••••••••"
                value={form.new}
                onChange={e => setForm({ ...form, new: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2">
              <ShieldCheck size={12} /> Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-4 pr-12 py-4 text-white focus:outline-none focus:border-white/20 transition-all font-bold"
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-white/5 bg-slate-950/50 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white/5 transition-all"
          >
            Cerrar
          </button>
          <button
            onClick={onUpdate}
            className="flex-2 px-10 py-4 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-white/5 flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
          >
            <Save size={18} /> Actualizar Contraseña
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
