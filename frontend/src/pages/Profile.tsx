import React from 'react';
import { 
  Sun, 
  Moon, 
  Lock, 
  Users, 
  ShieldCheck, 
  Shield,
  Warehouse,
  FileSpreadsheet,
  LogOut
} from 'lucide-react';

interface ProfileProps {
  user: any;
  theme: string;
  setTheme: (theme: string) => void;
  onSecurity: () => void;
  onStaff: () => void;
  onReports: () => void;
  onCorrales: () => void;
  isDemo: boolean;
  setIsDemo: (isDemo: boolean) => void;
  toggleDemoMode: (next: boolean) => Promise<void>;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ 
  user, 
  theme, 
  setTheme, 
  onSecurity, 
  onStaff, 
  onReports,
  onCorrales,
  isDemo, 
  setIsDemo, 
  toggleDemoMode,
  onLogout
}) => {
  const isDark = theme === 'dark';

  const rawRancho = (user?.rancho_id || user?.name || '').toUpperCase();
  const isBugambilias = rawRancho.includes('BUGAMBILIAS') || (user?.email?.toLowerCase() || '').includes('bugambilias');
  const isDonPablito = rawRancho.includes('PABLITO') || (user?.email?.toLowerCase() || '').includes('pablito') || rawRancho.includes('25CF359E-E5A7-4403-A1F1-3A4375F21EF3');
  
  const ranchoName = isBugambilias ? 'RANCHO LAS BUGAMBILIAS' : isDonPablito ? 'RANCHO DON PABLITO' : 'SHEEPMASTER AGROTECH';

  return (
    <div className="space-y-6 md:space-y-10 pt-4 md:pt-10 animate-in fade-in duration-700">
      
      {/* Tarjeta de Perfil de Usuario con Cover Photo */}
      <div className="relative rounded-[40px] shadow-2xl border border-emerald-500/20 overflow-hidden group">
        <div className="absolute inset-0 bg-slate-900">
          <img 
            src="/agrotech_banner.jpg" 
            alt="Agrotech Cover" 
            className="w-full h-full object-cover object-center opacity-40 group-hover:opacity-50 transition-all duration-1000"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-slate-900 via-slate-900/60 to-transparent' : 'from-emerald-950 via-emerald-900/80 to-transparent'}`}></div>
        </div>

        {/* Contenido Perfil */}
        <div className="relative pt-24 pb-12 px-6 flex flex-col items-center text-center">
           {/* Avatar flotante */}
           <div className={`w-32 h-32 md:w-40 md:h-40 rounded-[40px] flex items-center justify-center text-5xl md:text-6xl font-black font-display border-4 shadow-2xl mb-6 relative z-10 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-white text-emerald-700'}`}>
              {user?.name?.charAt(0) || 'U'}
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-10 h-10 rounded-full border-4 border-white dark:border-slate-800" title="Activo"></div>
           </div>

           <h3 className="text-4xl md:text-5xl font-black font-display tracking-tight text-white mb-2">
              {user?.name || 'Usuario'}
           </h3>
           <p className="text-emerald-300 font-bold uppercase tracking-widest text-xs md:text-sm mb-2">
              {user?.role || 'Personal'} • {user?.email}
           </p>
           <p className="text-white/70 font-medium uppercase tracking-widest text-[10px] md:text-xs bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
              Asignado a: <strong className="text-white ml-1">{ranchoName}</strong>
           </p>

           {/* Botones de acción (Tema y Salir) */}
           <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full justify-center max-w-sm sm:max-w-md">
             <button 
               onClick={() => setTheme(isDark ? 'light' : 'dark')} 
               className="flex-1 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 text-xs bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10 shadow-xl"
             >
               {isDark ? <Sun size={18} /> : <Moon size={18} />} CAMBIAR TEMA
             </button>
             <button 
               onClick={onLogout} 
               className="flex-1 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 text-xs bg-rose-600 text-white hover:bg-rose-500 shadow-xl shadow-rose-900/40"
             >
               <LogOut size={18} /> CERRAR SESIÓN
             </button>
           </div>
        </div>
      </div>

      {/* Grid de Atajos de Navegación */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        
        {/* Atajo de Seguridad */}
        <div 
          onClick={onSecurity} 
          className={`p-5 md:p-8 border rounded-[24px] md:rounded-[30px] cursor-pointer transition-all group hover:scale-[1.02] flex flex-col items-center md:items-start text-center md:text-left ${
            isDark ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm'
          }`}
        >
          <Lock size={22} className="text-rose-500 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className={`font-black uppercase text-[10px] md:text-xs tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Seguridad
          </h4>
          <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 uppercase font-bold">
            Contraseña
          </p>
        </div>

        {/* Atajo de Corrales */}
        <div 
          onClick={onCorrales} 
          className={`p-5 md:p-8 border rounded-[24px] md:rounded-[30px] cursor-pointer transition-all group hover:scale-[1.02] flex flex-col items-center md:items-start text-center md:text-left ${
            isDark ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm'
          }`}
        >
          <Warehouse size={22} className="text-cyan-500 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className={`font-black uppercase text-[10px] md:text-xs tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Corrales
          </h4>
          <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 uppercase font-bold">
            Administrar
          </p>
        </div>

        {/* Atajo de Reportes (Solo Admin) */}
        {user?.role === 'Admin' && (
          <div 
            onClick={onReports} 
            className={`p-5 md:p-8 border rounded-[24px] md:rounded-[30px] cursor-pointer transition-all group hover:scale-[1.02] flex flex-col items-center md:items-start text-center md:text-left ${
              isDark ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm'
            }`}
          >
            <FileSpreadsheet size={22} className="text-emerald-500 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className={`font-black uppercase text-[10px] md:text-xs tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Reportes
            </h4>
            <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 uppercase font-bold">
              Descargas
            </p>
          </div>
        )}

        {/* Atajo de Personal (Solo Admin) */}
        {user?.role === 'Admin' && (
          <div 
            onClick={onStaff} 
            className={`p-5 md:p-8 border rounded-[24px] md:rounded-[30px] cursor-pointer transition-all group hover:scale-[1.02] flex flex-col items-center md:items-start text-center md:text-left ${
              isDark ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm'
            }`}
          >
            <Users size={22} className="text-antique-brass mb-3 group-hover:scale-110 transition-transform" />
            <h4 className={`font-black uppercase text-[10px] md:text-xs tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Personal
            </h4>
            <p className="text-[9px] md:text-[10px] text-slate-400 mt-1 uppercase font-bold">
              Gestionar
            </p>
          </div>
        )}
      </div>

      {/* Panel de Modo Demo (Solo Admin) */}
      {user?.role === 'Admin' && (
        <div className={`mt-6 md:mt-10 p-6 md:p-10 border rounded-[24px] md:rounded-[40px] flex flex-col lg:flex-row justify-between items-center gap-6 md:gap-8 transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-md'
        }`}>
          <div className="text-center lg:text-left">
            <h4 className={`text-xl md:text-2xl font-black italic font-serif flex items-center justify-center lg:justify-start gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <ShieldCheck className="text-antique-brass" /> Modo Demo (Lectura)
            </h4>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-md">
              Cuando está activo, el sistema bloquea todas las modificaciones en la base de datos.
            </p>
          </div>
          <button 
            onClick={async () => {
              const next = !isDemo;
              await toggleDemoMode(next);
              setIsDemo(next);
            }}
            className={`w-full lg:w-auto px-6 py-4 md:px-10 md:py-5 rounded-2xl md:rounded-[24px] font-black text-xs uppercase transition-all flex items-center justify-center gap-4 active:scale-95 cursor-pointer ${
              isDemo 
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' 
                : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-650 hover:bg-slate-300')
            }`}
          >
            {isDemo ? <Lock size={18} /> : <Shield size={18} />}
            {isDemo ? 'DESACTIVAR MODO DEMO' : 'ACTIVAR MODO DEMO'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
