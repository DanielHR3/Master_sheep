import React from 'react';
import { 
  Sun, 
  Moon, 
  Lock, 
  Users, 
  ShieldCheck, 
  Shield 
} from 'lucide-react';

interface ProfileProps {
  user: any;
  theme: string;
  setTheme: (theme: string) => void;
  onSecurity: () => void;
  onStaff: () => void;
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
  isDemo, 
  setIsDemo, 
  toggleDemoMode 
}) => {
  return (
    <div className="space-y-10 pt-10 animate-in fade-in duration-700">
      <div className="p-10 bg-clay/30 border border-white/5 rounded-[50px] flex justify-between items-center">
        <div className="flex items-center gap-10">
          <div className="w-32 h-32 bg-saddle-tan rounded-[40px] flex items-center justify-center text-4xl text-white font-black font-display border-4 border-white/10 shadow-2xl">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-4xl text-white font-black font-display tracking-tight">{user?.name || 'Usuario'}</h3>
            <p className="text-antique-brass font-black uppercase text-xs tracking-widest mt-1">{user?.role || 'Personal'} • {user?.email}</p>
          </div>
        </div>
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
          className="px-8 py-4 bg-white/5 rounded-3xl text-white font-black flex items-center gap-4 hover:bg-white/10 transition-all"
        >
          {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />} <span>TEMA</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div onClick={onSecurity} className="p-8 bg-clay/20 border border-white/5 rounded-[40px] cursor-pointer hover:bg-white/5 transition-all group">
          <Lock size={24} className="text-rose-500 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="text-white font-black uppercase text-xs tracking-widest">Seguridad</h4>
          <p className="text-[8px] text-slate-500 mt-1 uppercase font-bold">Cambiar Contraseña</p>
        </div>
        {user?.role === 'Admin' && (
          <div onClick={onStaff} className="p-8 bg-clay/20 border border-white/5 rounded-[40px] cursor-pointer hover:bg-white/5 transition-all group">
            <Users size={24} className="text-antique-brass mb-4 group-hover:scale-110 transition-transform" />
            <h4 className="text-white font-black uppercase text-xs tracking-widest">Personal</h4>
            <p className="text-[8px] text-slate-500 mt-1 uppercase font-bold">Gestionar Equipo</p>
          </div>
        )}
      </div>

      {user?.role === 'Admin' && (
        <div className="mt-10 p-10 bg-clay/30 border border-white/5 rounded-[50px] flex justify-between items-center transition-all hover:bg-white/5">
          <div>
            <h4 className="text-2xl font-black text-white italic font-serif flex items-center gap-3"><ShieldCheck className="text-antique-brass" /> Modo Demo (Lectura)</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 max-w-md">Cuando está activo, el sistema bloquea todas las modificaciones en la base de datos. Ideal para pruebas y demostraciones.</p>
          </div>
          <button 
            onClick={async () => {
              const next = !isDemo;
              await toggleDemoMode(next);
              setIsDemo(next);
            }}
            className={`px-10 py-5 rounded-[24px] font-black text-xs uppercase transition-all flex items-center gap-4 ${isDemo ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : 'bg-slate-800 text-slate-400'}`}
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
