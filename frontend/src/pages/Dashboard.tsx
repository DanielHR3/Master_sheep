import React from 'react';
import { useStore } from '../context/useStore';
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
  user?: any;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, tareas, theme, onGlobalAdd, onCompleteTask, onSync, user }) => {
  const isDark = theme === 'dark';
  const store = useStore();
  const isLoading = store.loading;
  
  const rawRancho = (store.selectedRanchOverride || user?.rancho_id || user?.name || '').toUpperCase();
  const isBugambilias = rawRancho.includes('BUGAMBILIAS') || (store.selectedRanchOverride ? false : (user?.email?.toLowerCase() || '').includes('bugambilias'));
  const isDonPablito = rawRancho.includes('PABLITO') || (user?.email?.toLowerCase() || '').includes('pablito') || rawRancho.includes('25CF359E-E5A7-4403-A1F1-3A4375F21EF3');
  
  const ranchoName = isBugambilias ? 'RANCHO LAS BUGAMBILIAS' : isDonPablito ? 'RANCHO DON PABLITO' : 'SHEEPMASTER AGROTECH';
  
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

  const colors = ['#10b981', '#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6'];

  return (
    <div className="space-y-8 pt-6 animate-in fade-in duration-500">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-5xl font-black font-display tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Resumen de Operación
          </h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} font-bold uppercase tracking-widest text-xs mt-1.5 flex items-center gap-2`}>
            <Calendar size={14} className="text-emerald-500" /> {ranchoName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onSync && (
            <button 
              onClick={onSync} 
              className={`bg-teal-650 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-lg flex items-center gap-2.5 active:scale-95 cursor-pointer ${
                isDark ? 'shadow-teal-950/80' : 'shadow-teal-500/20'
              }`}
              title="Sincronizar Datos Cloud"
            >
              <Cloud size={18} /> SYNC CLOUD
            </button>
          )}
          <button 
            onClick={onGlobalAdd} 
            className={`bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-lg flex items-center gap-2.5 active:scale-95 cursor-pointer ${
              isDark ? 'shadow-emerald-950/80' : 'shadow-emerald-500/20'
            }`}
          >
            <PlusCircle size={18} /> ALTA ANIMAL
          </button>
        </div>
      </div>

      {/* Agrotech Welcome Banner */}
      <div className="relative overflow-hidden rounded-[40px] shadow-2xl border border-emerald-500/20 group">
        <div className="absolute inset-0 bg-slate-900">
          <img 
            src="/agrotech_banner.jpg" 
            alt="Agrotech Services" 
            className="w-full h-full object-cover object-center opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-1000"
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${isDark ? 'from-slate-950 via-slate-900/90 to-transparent' : 'from-emerald-950 via-emerald-900/80 to-transparent'}`}></div>
        </div>
        
        <div className="relative p-8 md:p-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-4 backdrop-blur-md shadow-lg">
            <Zap size={12} /> SISTEMA AGROTECH V3.0
          </div>
          <h2 className="text-4xl md:text-5xl font-black font-display tracking-tight text-white mb-4 leading-tight">
            Bienvenido a <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              {ranchoName}
            </span>
          </h2>
          <p className="text-slate-300 font-semibold mb-8 max-w-lg leading-relaxed text-sm">
            Nuestros servicios de inteligencia artificial y ciencia de datos están optimizando la gestión de tu hato en tiempo real. Monitoreo de genética, nutrición y salud impulsado por tecnología de punta.
          </p>
          <div className="flex gap-4">
            <button onClick={onGlobalAdd} className="bg-white text-emerald-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-emerald-50 transition-all shadow-xl active:scale-95 flex items-center gap-2 cursor-pointer">
              <PlusCircle size={16} /> Alta Animal
            </button>
            <button className="bg-emerald-600/30 text-white border border-emerald-500/50 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-emerald-600/50 transition-all backdrop-blur-sm active:scale-95 flex items-center gap-2 cursor-pointer">
               Explorar Reportes
            </button>
          </div>
        </div>
      </div>

      {/* KPIs SUPERIORES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className={`p-4 rounded-3xl border animate-pulse ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
              <div className={`w-10 h-10 rounded-xl mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
              <div className={`w-16 h-3 rounded mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
              <div className={`w-12 h-6 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            </div>
          ))
        ) : (
            [
              { label: 'Total Hato', value: stats?.total_cabezas || 0, icon: Users, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
              ...(isBugambilias ? [] : [{ label: 'En Engorda', value: stats?.en_engorda || 0, icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }]),
              { label: 'Pie de Cría', value: stats?.pie_de_cria || 0, icon: Award, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Bajas', value: stats?.bajas || 0, icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
              { label: '% Gestación', value: `${(stats?.porcentaje_gestacion || 0).toFixed(1)}%`, icon: Award, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
              { label: '% Parición', value: `${(stats?.porcentaje_paricion || 0).toFixed(1)}%`, icon: Award, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            ].map((kpi, idx) => (
            <div key={idx} className={`p-4 rounded-3xl border transition-all hover:scale-[1.01] ${isDark ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-md text-slate-900'}`}>
              <div className={`p-2.5 rounded-xl w-fit mb-2 border ${kpi.bg}`}>
                <kpi.icon size={18} className={kpi.color} />
              </div>
              <p className={`font-black uppercase text-[10px] tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{kpi.label}</p>
              <h3 className={`text-2xl font-black tracking-tight mt-1 font-display ${isDark ? 'text-white' : 'text-slate-900'}`}>{kpi.value || 0}</h3>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SEMÁFORO DE VENTAS (Oculto en Bugambilias porque es pie de cría) */}
        {!isBugambilias && (
          <div className={`lg:col-span-2 p-8 rounded-[40px] border ${isDark ? 'bg-slate-900/90 border-slate-800 shadow-xl text-white' : 'bg-white border-slate-200 shadow-md text-slate-900'}`}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className={`text-2xl font-black font-display tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Zap size={22} className="text-amber-500 dark:text-amber-400" /> Alertas de Venta (Engorda)
              </h3>
              <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sugerencia basada en Peso y Edad (4 meses / 42kg)</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`p-5 rounded-[28px] border animate-pulse ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                  <div className={`h-4 w-1/2 rounded mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <div className={`h-3 w-1/3 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                </div>
              ))
            ) : (stats?.alertas_venta || []).length > 0 ? (
              (stats?.alertas_venta || []).map((a: any, i: number) => (
                <div key={i} className={`p-5 rounded-[28px] border flex items-center justify-between transition-all ${
                  a.color === 'rojo' 
                    ? (isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200/80') :
                  a.color === 'amarillo' 
                    ? (isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200/80') :
                  (isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200/80')
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full animate-pulse ${
                      a.color === 'rojo' ? 'bg-rose-500' :
                      a.color === 'amarillo' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`} />
                    <div>
                      <p className={`text-base font-black tracking-tight uppercase ${isDark ? 'text-white' : 'text-slate-800'}`}>Arete: {a.arete}</p>
                      <p className={`text-xs font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{a.meses} meses • {(a.peso || 0).toFixed(1)} KG</p>
                    </div>
                  </div>
                  <div className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                     a.color === 'rojo' ? 'bg-rose-600 text-white' :
                     a.color === 'amarillo' ? 'bg-amber-600 text-white' :
                     'bg-emerald-600 text-white'
                  }`}>
                    {a.color === 'rojo' ? 'Venta' : a.color === 'amarillo' ? 'Listo' : 'En engorda'}
                  </div>
                </div>
              ))
            ) : (
              <div className={`md:col-span-2 py-16 text-center border-2 border-dashed rounded-[32px] ${
                isDark ? 'border-slate-800' : 'border-slate-200 bg-slate-50/55'
              }`}>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-wider italic">No hay animales próximos a venta</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* AGENDA Y TAREAS */}
        <div className={`${isBugambilias ? 'lg:col-span-3' : ''} p-8 rounded-[40px] border flex flex-col ${isDark ? 'bg-slate-900/90 border-slate-800 shadow-xl text-white' : 'bg-white border-slate-200 shadow-md text-slate-900'}`}>
          <div className="flex items-center gap-3 mb-6">
             <Bell size={22} className="text-emerald-500 dark:text-emerald-400" />
             <h3 className={`text-2xl font-black font-display tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Agenda Sanitaria</h3>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`p-4 rounded-2xl border animate-pulse ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                  <div className={`h-4 w-3/4 rounded mb-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                </div>
              ))
            ) : (Array.isArray(tareas) ? tareas : []).filter((t: any) => t.estatus === 'Pendiente').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <CheckCircle2 size={44} className="text-emerald-500/40 mb-3" />
                <p className="text-xs text-slate-400 uppercase font-black tracking-wider">Todas las tareas al día</p>
              </div>
            ) : (
              (Array.isArray(tareas) ? tareas : []).filter((t: any) => t.estatus === 'Pendiente').map((t: any) => {
                const isReminder = t.titulo?.startsWith('REMINDER');
                return (
                  <div key={t.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    isReminder 
                      ? (isDark ? 'bg-rose-955/40 bg-rose-950/60 border-rose-800/60' : 'bg-rose-50 border-rose-200 text-rose-900') 
                      : (isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200 text-slate-800')
                  }`}>
                    <div className="flex items-center gap-3 truncate">
                      {isReminder ? <Syringe size={18} className="text-rose-555 text-rose-455 text-rose-500 dark:text-rose-400 shrink-0" /> : <ClipboardList size={18} className="text-emerald-500 dark:text-emerald-400 shrink-0" />}
                      <div className="truncate">
                        <p className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{t.titulo}</p>
                        <p className={`text-[10px] mt-0.5 uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Prioridad: {t.prioridad}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onCompleteTask(t.id)} 
                      className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all cursor-pointer shrink-0"
                      title="Marcar como Completada"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS Y GRÁFICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
        <div className={`p-8 rounded-[40px] border ${isDark ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-md'}`}>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Syringe size={16} className="text-rose-500 dark:text-rose-400" /> Incidencia de Enfermedades por Temporada
            </h4>
            <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                        <XAxis dataKey="season" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                        <Tooltip 
                          contentStyle={{
                            borderRadius: '16px', 
                            border: 'none', 
                            backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                            color: isDark ? '#ffffff' : '#0f172a', 
                            fontSize: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                          }} 
                        />
                        <Legend iconType="circle" />
                        {diseaseNames.map((name, i) => (
                          <Bar key={name} dataKey={name} fill={colors[i % colors.length]} radius={[6, 6, 0, 0]} barSize={18} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className={`p-8 rounded-[40px] border ${isDark ? 'bg-slate-900/90 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-md'}`}>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <LayoutGrid size={16} className="text-emerald-500 dark:text-emerald-400" /> Ocupación de Corrales
            </h4>
            <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.corrales || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                        <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                        <Tooltip 
                          cursor={{fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}} 
                          contentStyle={{
                            borderRadius: '16px', 
                            border: 'none', 
                            backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                            color: isDark ? '#ffffff' : '#0f172a',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                          }} 
                        />
                        <Bar dataKey="cantidad" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={36} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
