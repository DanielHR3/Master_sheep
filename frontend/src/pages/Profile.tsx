import React from 'react';
import { 
  Sun, 
  Moon, 
  Lock, 
  Users, 
  ShieldCheck, 
  Shield,
  Warehouse,
  FileSpreadsheet
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
  toggleDemoMode 
}) => {
  const isDark = theme === 'dark';
  return (
    <div className="space-y-6 md:space-y-10 pt-4 md:pt-10 animate-in fade-in duration-700">
      
      {/* Tarjeta de Perfil de Usuario */}
      <div className={`p-6 md:p-10 border rounded-[24px] md:rounded-[40px] flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-md'
      }`}>
        <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 md:gap-10 w-full sm:w-auto">
          <div className="w-20 h-20 md:w-32 md:h-32 bg-saddle-tan rounded-[20px] md:rounded-[30px] flex items-center justify-center text-2xl md:text-4xl text-white font-black font-display border-4 border-white/10 shadow-2xl shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className={`text-2xl md:text-4xl font-black font-display tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {user?.name || 'Usuario'}
            </h3>
            <p className="text-antique-brass font-black uppercase text-[10px] md:text-xs tracking-widest mt-1">
              {user?.role || 'Personal'} • {user?.email}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setTheme(isDark ? 'light' : 'dark')} 
          className={`w-full md:w-auto px-6 py-3.5 md:px-8 md:py-4 rounded-2xl md:rounded-3xl font-black flex items-center justify-center gap-4 transition-all active:scale-95 cursor-pointer text-xs md:text-sm ${
            isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />} <span>TEMA</span>
        </button>
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

        {/* Atajo de Reportes */}
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
