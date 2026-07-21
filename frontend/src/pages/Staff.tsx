import React from 'react';
import { UserPlus, CircleUser, Trash2 } from 'lucide-react';

interface StaffProps {
  users: any[];
  form: any;
  setForm: (form: any) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  theme: string;
}

const Staff: React.FC<StaffProps> = ({ 
  users, 
  form, 
  setForm, 
  onAdd, 
  onDelete, 
  theme 
}) => {
  const isDark = theme === 'dark';
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
             }`}>Alta de Personal</h4>
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
                <input 
                  type="password" 
                  placeholder="Contraseña Temporal" 
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold text-sm ${
                    isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`} 
                  value={form.password} 
                  onChange={e => setForm({...form, password: e.target.value})} 
                />
                <button 
                  onClick={onAdd} 
                  className={`w-full py-4 bg-antique-brass text-white font-black rounded-xl hover:bg-saddle-tan transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-lg ${
                    isDark ? 'shadow-cyan-950/40' : 'shadow-cyan-500/20'
                  }`}
                >
                  <UserPlus size={18} /> REGISTRAR
                </button>
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
                   <button 
                     onClick={() => onDelete(u.id)} 
                     className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl lg:opacity-0 lg:group-hover:opacity-100 transition-all cursor-pointer"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

export default Staff;
