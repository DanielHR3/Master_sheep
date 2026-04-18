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
  return (
    <div className="space-y-10 pt-10 animate-in slide-in-from-right-8 duration-700">
       <div className="flex justify-between items-center">
          <div>
            <h2 className="text-4xl font-black font-display text-white">Equipo de Trabajo</h2>
            <p className="text-[10px] text-antique-brass uppercase font-black tracking-widest mt-1">Control de Accesos y Roles</p>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1 p-8 bg-clay/30 border border-white/5 rounded-[40px]">
             <h4 className="text-xl font-black font-display text-white mb-8 border-b border-white/5 pb-4 tracking-tight">Alta de Personal</h4>
             <div className="space-y-6">
                <input 
                  type="text" 
                  placeholder="Nombre Completo" 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                />
                <input 
                  type="email" 
                  placeholder="Correo corporativo" 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                />
                <input 
                  type="password" 
                  placeholder="Contraseña Temporal" 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white" 
                  value={form.password} 
                  onChange={e => setForm({...form, password: e.target.value})} 
                />
                <button 
                  onClick={onAdd} 
                  className="w-full py-4 bg-antique-brass text-white font-black rounded-xl hover:bg-saddle-tan transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} /> REGISTRAR
                </button>
             </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
             {users.map((u: any) => (
                <div key={u.id} className="p-6 bg-clay/20 border border-white/5 rounded-3xl flex justify-between items-center group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white">
                        <CircleUser size={24} />
                      </div>
                      <div>
                         <p className="text-white font-black">{u.name}</p>
                         <p className="text-[10px] text-slate-500 uppercase font-black">{u.role} • {u.email}</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => onDelete(u.id)} 
                     className="p-3 bg-rose-500/10 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
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
