import React, { useState } from 'react';
import { UserPlus, CircleUser, Trash2, Eye, EyeOff, Edit3 } from 'lucide-react';

interface StaffProps {
  users: any[];
  form: any;
  setForm: (form: any) => void;
  onAdd: () => void;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  theme: string;
}

const Staff: React.FC<StaffProps> = ({ 
  users, 
  form, 
  setForm, 
  onAdd, 
  onUpdate,
  onDelete, 
  theme 
}) => {
  const isDark = theme === 'dark';
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="space-y-10 pt-10 animate-in slide-in-from-right-8 duration-700">
       <div className="flex justify-between items-center">
          <div>
            <h2 className={`text-4xl font-black font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>Equipo de Trabajo</h2>
            <p className="text-[10px] text-antique-brass uppercase font-black tracking-widest mt-1">Control de Accesos y Roles</p>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className={`lg:col-span-1 p-8 border rounded-[40px] ${
            isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-md'
          }`}>
             <h4 className={`text-xl font-black font-display mb-8 border-b pb-4 tracking-tight ${
               isDark ? 'text-white border-white/5' : 'text-slate-800 border-slate-100'
             }`}>{form.id ? 'Editar Personal' : 'Alta de Personal'}</h4>
             <div className="space-y-6">
                <input 
                  type="text" 
                  placeholder="Nombre Completo" 
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold text-sm ${
                    isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`} 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                />
                <input 
                  type="email" 
                  placeholder="Correo corporativo" 
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold text-sm ${
                    isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`} 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                />
                 {!form.id && (
                   <div className="relative">
                     <input 
                       type={showPassword ? "text" : "password"} 
                       placeholder="Contraseña Temporal" 
                       className={`w-full border rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold text-sm ${
                         isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                       }`} 
                       value={form.password} 
                       onChange={e => setForm({...form, password: e.target.value})} 
                     />
                     <button
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors"
                       style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                     >
                       {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                     </button>
                   </div>
                 )}
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Rol / Acceso</label>
                   <select
                     className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold text-sm ${
                       isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                     }`}
                     value={form.role || 'Trabajador'}
                     onChange={e => setForm({...form, role: e.target.value})}
                   >
                     <option value="Trabajador">Trabajador (Solo Lectura/Escritura Hato)</option>
                     <option value="Admin">Administrador (Acceso Total)</option>
                   </select>
                 </div>
                 <div className="flex gap-3">
                   {form.id && (
                     <button 
                       onClick={() => setForm({ id: '', name: '', email: '', password: '', role: 'Trabajador' })} 
                       className="flex-1 py-4 bg-slate-700 text-white font-black rounded-xl hover:bg-slate-600 transition-all active:scale-95 cursor-pointer uppercase text-xs"
                     >
                       Cancelar
                     </button>
                   )}
                   <button 
                     onClick={form.id ? onUpdate : onAdd} 
                     className={`py-4 bg-antique-brass text-white font-black rounded-xl hover:bg-saddle-tan transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-lg uppercase text-xs ${
                       form.id ? 'flex-1' : 'w-full'
                     } ${
                       isDark ? 'shadow-cyan-950/40' : 'shadow-cyan-500/20'
                     }`}
                   >
                     {form.id ? 'Guardar' : 'Registrar'}
                   </button>
                 </div>
             </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
             {users.map((u: any) => (
                <div key={u.id} className={`p-6 border rounded-3xl flex justify-between items-center group transition-all ${
                  isDark ? 'bg-slate-900/90 border-slate-800 text-white hover:bg-slate-800/50' : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50'
                }`}>
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <CircleUser size={24} />
                      </div>
                      <div>
                         <p className={`font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{u.name}</p>
                         <p className="text-[10px] text-slate-400 uppercase font-black">{u.role} • {u.email}</p>
                      </div>
                   </div>
                    <div className="flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                       <button 
                         onClick={() => {
                           setForm({ id: u.id, name: u.name, email: u.email, password: '', role: u.role });
                         }} 
                         className="p-3 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-600 hover:text-white rounded-xl transition-all cursor-pointer"
                       >
                         <Edit3 size={16} />
                       </button>
                       <button 
                         onClick={() => onDelete(u.id)} 
                         className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all cursor-pointer"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

export default Staff;
