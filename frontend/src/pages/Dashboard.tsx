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
  CheckCircle2,
  Calendar,
  Zap,
  Cloud
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface DashboardStats {
  total_cabezas: number;
  en_engorda: number;
  pie_de_cria: number;
  bajas: number;
  corrales: any[];
  alertas_venta: any[];
  enfermedades: Record<string, Record<string, number>>;
}

interface DashboardProps {
  stats: DashboardStats;
  tareas: any[];
  theme: string;
  onGlobalAdd: () => void;
  onCompleteTask: (id: string) => void;
  onSync?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, tareas, theme, onGlobalAdd, onCompleteTask, onSync }) => {
  
  // Transformar datos de enfermedades para Recharts
  const transformEnfermedades = () => {
    if (!stats || !stats.enfermedades) return [];
    return Object.entries(stats.enfermedades).map(([season, diseases]) => ({
      season,
      ...diseases
    }));
  };

  const chartData = transformEnfermedades();
  const diseaseNames = Array.from(new Set(
    Object.values(stats?.enfermedades || {}).flatMap(d => Object.keys(d || {}))
  ));

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

  return (
    <div className="space-y-10 pt-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-6xl font-black font-display tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Resumen de Operación
          </h2>
          <p className={`${theme === 'dark' ? 'text-6666-cream' : 'text-slate-500'} font-black uppercase tracking-[0.2em] text-[10px] mt-2 flex items-center gap-2`}>
            <Calendar size={12} className="text-6666-maroon" /> RANCHO DON PABLITO • VALLE DEL MEZQUITAL
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onSync && (
            <button 
              onClick={onSync} 
              className="bg-emerald-600 text-white px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3"
              title="Sincronizar con JARVIS Cloud"
            >
              <Cloud size={20} /> SYNC CLOUD
            </button>
          )}
          <button onClick={onGlobalAdd} className="bg-6666-maroon text-white px-8 py-3 rounded-full font-black uppercase text-xs tracking-widest hover:bg-6666-sand hover:text-6666-maroon transition-all shadow-xl shadow-6666-maroon/20 flex items-center gap-3">
            <PlusCircle size={20} /> ALTA ANIMAL
          </button>
        </div>
      </div>

      {/* KPIs SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Hato', value: stats?.total_cabezas || 0, icon: Users, color: 'text-antique-brass' },
          { label: 'En Engorda', value: stats?.en_engorda || 0, icon: TrendingUp, color: 'text-saddle-tan' },
          { label: 'Pie de Cría', value: stats?.pie_de_cria || 0, icon: Award, color: 'text-emerald-500' },
          { label: 'Bajas', value: stats?.bajas || 0, icon: AlertTriangle, color: 'text-rose-500' },
        ].map((kpi, idx) => (
          <div key={idx} className={`p-8 rounded-[48px] border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-clay/30 border-white/5 shadow-2xl' : 'bg-white border-stone-200'}`}>
            <div className={`p-4 rounded-3xl w-fit mb-4 ${theme === 'dark' ? 'bg-slate-950/50' : 'bg-stone-50'}`}>
              <kpi.icon size={24} className={kpi.color} />
            </div>
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">{kpi.label}</p>
            <h2 className="text-5xl font-black tracking-tighter mt-1 font-display">{kpi.value || 0}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SEMÁFORO DE VENTAS */}
        <div className={`lg:col-span-2 p-10 rounded-[48px] border ${theme === 'dark' ? 'bg-clay/40 border-white/5 shadow-2xl' : 'bg-white border-stone-200'}`}>
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black font-display tracking-tight flex items-center gap-3">
                <Zap size={24} className="text-6666-sand" /> Alertas de Venta (Engorda)
              </h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Sugerencia basada en Peso y Edad (4 meses / 42kg)</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {(stats?.alertas_venta || []).length > 0 ? (
              (stats?.alertas_venta || []).map((a: any, i: number) => (
                <div key={i} className={`p-6 rounded-[32px] border flex items-center justify-between group transition-all ${
                  a.color === 'rojo' ? 'bg-rose-500/10 border-rose-500/20 shadow-lg shadow-rose-500/5' :
                  a.color === 'amarillo' ? 'bg-amber-500/10 border-amber-500/20' :
                  'bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full animate-pulse ${
                      a.color === 'rojo' ? 'bg-rose-500' :
                      a.color === 'amarillo' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`} />
                    <div>
                      <p className="text-lg font-black tracking-tight uppercase">Arete: {a.arete}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{a.meses} meses • {(a.peso || 0).toFixed(1)} KG</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                     a.color === 'rojo' ? 'bg-rose-500 text-white' :
                     a.color === 'amarillo' ? 'bg-amber-500 text-white' :
                     'bg-emerald-500 text-white'
                  }`}>
                    {a.color === 'rojo' ? 'Venta' : a.color === 'amarillo' ? 'Listo' : 'En engorda'}
                  </div>
                </div>
              ))
            ) : (
              <div className="md:col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest italic">No hay animales próximos a venta</p>
              </div>
            )}
          </div>
        </div>

        {/* AGENDA Y TAREAS */}
        <div className={`p-10 rounded-[48px] border transition-all ${theme === 'dark' ? 'bg-clay/50 border-white/10' : 'bg-stone-50 border-stone-200'} h-full flex flex-col`}>
          <div className="flex items-center gap-3 mb-8">
             <Bell size={24} className="text-6666-maroon" />
             <h3 className="text-2xl font-black font-display tracking-tight">Agenda</h3>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {(tareas || []).filter((t: any) => t.estatus === 'Pendiente').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <CheckCircle2 size={40} className="text-slate-800 mb-4 opacity-20" />
                <p className="text-[10px] text-slate-500 italic uppercase font-black tracking-widest text-center">Todo al día</p>
              </div>
            ) : (
              (tareas || []).filter((t: any) => t.estatus === 'Pendiente').map((t: any) => {
                const isReminder = t.titulo?.startsWith('REMINDER');
                return (
                  <div key={t.id} className={`p-5 rounded-[28px] border flex items-center justify-between group transition-all ${isReminder ? 'bg-rose-600 border-rose-400 shadow-xl' : 'bg-slate-950/50 border-white/5'}`}>
                    <div className="flex items-center gap-4 truncate">
                      {isReminder ? <Syringe size={20} className="text-white shrink-0" /> : <ClipboardList size={20} className="text-slate-500 shrink-0" />}
                      <div className="truncate">
                        <p className={`text-sm font-black truncate ${isReminder ? 'text-white' : 'text-slate-100'}`}>{t.titulo}</p>
                        <p className={`text-[9px] mt-0.5 uppercase font-black tracking-widest ${isReminder ? 'text-rose-100' : 'text-slate-500'}`}>Precisión: {t.prioridad}</p>
                      </div>
                    </div>
                    <button onClick={() => onCompleteTask(t.id)} className={`p-3 rounded-2xl transition-all ${isReminder ? 'bg-white text-rose-600' : 'bg-6666-maroon/20 text-6666-maroon opacity-0 group-hover:opacity-100'}`}>
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS AVANZADAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        <div className={`p-10 rounded-[48px] border ${theme === 'dark' ? 'bg-clay/20 border-white/5 shadow-xl' : 'bg-white border-stone-200'}`}>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
              <Syringe size={16} className="text-rose-500" /> Incidencia de Enfermedades por Temporada
            </h4>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="season" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                        <Tooltip contentStyle={{borderRadius: '24px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '12px'}} />
                        <Legend iconType="circle" />
                        {diseaseNames.map((name, i) => (
                          <Bar key={name} dataKey={name} fill={colors[i % colors.length]} radius={[8, 8, 0, 0]} barSize={20} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className={`p-10 rounded-[48px] border ${theme === 'dark' ? 'bg-clay/20 border-white/5 shadow-xl' : 'bg-white border-stone-200'}`}>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
              <LayoutGrid size={16} className="text-6666-sand" /> Ocupación de Corrales Elevados
            </h4>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.corrales || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{borderRadius: '24px', border: 'none', backgroundColor: '#0f172a'}} />
                        <Bar dataKey="cantidad" fill="#8d6e63" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
