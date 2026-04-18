import React from 'react';
import { 
  Users, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  Bell, 
  PlusCircle, 
  LayoutGrid,
  Syringe,
  ClipboardList,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardStats {
  total_cabezas: number;
  fertilidad: number;
  corrales: any[];
}

interface DashboardProps {
  stats: DashboardStats;
  tareas: any[];
  theme: string;
  onGlobalAdd: () => void;
  onCompleteTask: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, tareas, theme, onGlobalAdd, onCompleteTask }) => {
  return (
    <div className="space-y-10 pt-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-5xl font-black font-display tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Bienvenido a Master Sheep
          </h2>
          <p className="text-6666-cream font-black uppercase tracking-widest text-[10px] mt-1">
            Panel de Control de Engorda y Mejora Genética
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/30 border-white/5 shadow-2xl' : 'bg-white border-antique-brass/20'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-[24px] ${theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'}`}>
              <Users size={24} className="text-antique-brass" />
            </div>
          </div>
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Total Hato</p>
          <h2 className="text-6xl font-black tracking-tighter mt-2 font-display">{stats.total_cabezas || 0}</h2>
        </div>

        <div className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/30 border-white/5 shadow-2xl' : 'bg-white border-antique-brass/20'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-[24px] ${theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'}`}>
              <TrendingUp size={24} className="text-saddle-tan" />
            </div>
          </div>
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">En Engorda</p>
          <h2 className="text-6xl font-black tracking-tighter mt-2 font-display">{(stats as any).en_engorda || 0}</h2>
        </div>

        <div className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/30 border-white/5 shadow-2xl' : 'bg-white border-6666-cream/20'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-[24px] ${theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'}`}>
              <Award size={24} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Pie de Cría</p>
          <h2 className="text-6xl font-black tracking-tighter mt-2 font-display">{(stats as any).pie_de_cria || 0}</h2>
        </div>

        <div className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/30 border-white/5 shadow-2xl' : 'bg-white border-6666-cream/20'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-[24px] ${theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'}`}>
              <AlertTriangle size={24} className="text-rose-500" />
            </div>
          </div>
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Bajas</p>
          <h2 className="text-6xl font-black tracking-tighter mt-2 font-display">{(stats as any).bajas || 0}</h2>
        </div>

        <div className={`p-8 rounded-[40px] border transition-all ${theme === 'dark' ? 'bg-clay/50 border-white/10' : 'bg-stone-50 border-6666-cream/20'} md:col-span-1`}>
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-2">
                <Bell size={18} className="text-6666-maroon" />
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Agenda del Día</p>
             </div>
          </div>
          <div className="space-y-4 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
            {tareas.filter(t => t.estatus === 'Pendiente').length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">No hay tareas para hoy</p>
            ) : (
              tareas.filter(t => t.estatus === 'Pendiente').sort((a, b) => a.titulo.startsWith('REMINDER') ? -1 : 1).map(t => {
                const isReminder = t.titulo.startsWith('REMINDER');
                return (
                  <div key={t.id} className={`p-4 rounded-2xl border flex items-center justify-between group transition-all ${isReminder ? 'bg-rose-500/10 border-rose-500/20 shadow-lg shadow-rose-500/5' : 'bg-slate-950/50 border-white/5'}`}>
                    <div className="flex items-center gap-3 truncate">
                      {isReminder ? <Syringe size={16} className="text-rose-500 shrink-0" /> : <ClipboardList size={16} className="text-slate-500 shrink-0" />}
                      <div className="truncate">
                        <p className={`text-xs font-black truncate ${isReminder ? 'text-rose-100' : 'text-white'}`}>{t.titulo}</p>
                        <p className="text-[8px] text-slate-500 mt-0.5 uppercase font-bold">{t.prioridad} • {t.fecha_vencimiento ? new Date(t.fecha_vencimiento).toLocaleDateString() : 'Hoy'}</p>
                      </div>
                    </div>
                    <button onClick={() => onCompleteTask(t.id)} className={`p-2 rounded-xl transition-all ${isReminder ? 'bg-rose-500 text-white' : 'bg-6666-maroon/20 text-6666-maroon opacity-0 group-hover:opacity-100'}`}>
                      <CheckCircle2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button onClick={onGlobalAdd} className="p-8 rounded-[40px] bg-6666-maroon text-white font-black flex flex-col justify-between hover:bg-6666-sand hover:text-6666-maroon transition-all shadow-2xl shadow-6666-maroon/30">
          <div className="p-4 bg-white/10 rounded-[24px] w-fit mb-4"><PlusCircle size={28} /></div>
          <div className="text-left">
            <p className="text-white/60 font-black uppercase text-[10px] tracking-widest mb-1">Registro Rápido</p>
            <h3 className="text-2xl font-black uppercase leading-tight">ALTA ANIMAL</h3>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`p-8 rounded-[40px] border ${theme === 'dark' ? 'bg-clay/20 border-white/5' : 'bg-white border-6666-cream/10'}`} style={{ minHeight: '400px' }}>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-2"><LayoutGrid size={16} /> Distribución por Corral</h4>
            <div className="h-full w-full" style={{ minWidth: 0, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.corrales || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                        <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                        <Tooltip contentStyle={{borderRadius: '20px', border: 'none', backgroundColor: '#1c1917'}} />
                        <Bar dataKey="cantidad" fill="#8d6e63" radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
