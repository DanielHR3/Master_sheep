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
    <div className="space-y-10 pt-10 animate-in fade-in duration-700">
      <div className={`p-10 border rounded-[50px] flex justify-between items-center transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-md'
      }`}>
        <div className="flex items-center gap-10">
          <div className="w-32 h-32 bg-saddle-tan rounded-[40px] flex items-center justify-center text-4xl text-white font-black font-display border-4 border-white/10 shadow-2xl">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className={`text-4xl font-black font-display tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.name || 'Usuario'}</h3>
            <p className="text-antique-brass font-black uppercase text-xs tracking-widest mt-1">{user?.role || 'Personal'} • {user?.email}</p>
          </div>
        </div>
        <button 
          onClick={() => setTheme(isDark ? 'light' : 'dark')} 
          className={`px-8 py-4 rounded-3xl font-black flex items-center gap-4 transition-all active:scale-95 cursor-pointer ${
            isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
        >
          {isDark ? <Sun size={24} /> : <Moon size={24} />} <span>TEMA</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div 
          onClick={onSecurity} 
          className={`p-8 border rounded-[40px] cursor-pointer transition-all group hover:scale-[1.02] ${
            isDark ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm'
          }`}
        >
          <Lock size={24} className="text-rose-500 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className={`font-black uppercase text-xs tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Seguridad</h4>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Cambiar Contraseña</p>
        </div>

        <div 
          onClick={onCorrales} 
          className={`p-8 border rounded-[40px] cursor-pointer transition-all group hover:scale-[1.02] ${
            isDark ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm'
          }`}
        >
          <Warehouse size={24} className="text-cyan-500 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className={`font-black uppercase text-xs tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Corrales</h4>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Gestionar Corrales</p>
        </div>

        <div 
          onClick={onReports} 
          className={`p-8 border rounded-[40px] cursor-pointer transition-all group hover:scale-[1.02] ${
            isDark ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm'
          }`}
        >
          <FileSpreadsheet size={24} className="text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className={`font-black uppercase text-xs tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Reportes</h4>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Descargas e Informes</p>
        </div>

        {user?.role === 'Admin' && (
          <div 
            onClick={onStaff} 
            className={`p-8 border rounded-[40px] cursor-pointer transition-all group hover:scale-[1.02] ${
              isDark ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm'
            }`}
          >
            <Users size={24} className="text-antique-brass mb-4 group-hover:scale-110 transition-transform" />
            <h4 className={`font-black uppercase text-xs tracking-widest ${isDark ? 'text-white' : 'text-slate-800'}`}>Personal</h4>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Gestionar Equipo</p>
          </div>
        )}
      </div>

      {user?.role === 'Admin' && (
        <div className={`mt-10 p-10 border rounded-[50px] flex justify-between items-center transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800 hover:bg-slate-800/80 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900 shadow-md'
        }`}>
          <div>
            <h4 className={`text-2xl font-black italic font-serif flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}><ShieldCheck className="text-antique-brass" /> Modo Demo (Lectura)</h4>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-md">Cuando está activo, el sistema bloquea todas las modificaciones en la base de datos. Ideal para pruebas y demostraciones.</p>
          </div>
          <button 
            onClick={async () => {
              const next = !isDemo;
              await toggleDemoMode(next);
              setIsDemo(next);
            }}
            className={`px-10 py-5 rounded-[24px] font-black text-xs uppercase transition-all flex items-center gap-4 active:scale-95 cursor-pointer ${
              isDemo 
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' 
                : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-350 hover:bg-slate-300')
            }`}
          >
            {isDemo ? <Lock size={20} /> : <Shield size={20} />}
            {isDemo ? 'DESACTIVAR MODO DEMO' : 'ACTIVAR MODO DEMO'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
