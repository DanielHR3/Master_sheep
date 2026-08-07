import React, { useState } from 'react';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
  loading: boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
}

const Login: React.FC<LoginProps> = ({ 
  onLogin, 
  loading, 
  email, 
  setEmail, 
  password, 
  setPassword 
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleForgotPassword = () => {
    alert("Por favor contacte al administrador de SheepMaster para restablecer su contraseña.");
  };

  const isBugambilias = email.toLowerCase().includes('bugambilias');
  const logoSrc = isBugambilias ? 'logo_bugambilias.jpg' : 'logo.png';
  const ranchoName = isBugambilias ? 'Rancho Las Bugambilias' : 'Rancho Don Pablito';

  return (
  return (
    <div className="h-screen w-full flex items-center justify-center font-sans relative overflow-hidden">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 bg-slate-900">
        <img 
          src="/login_bg_sheep.jpg" 
          alt="Agrotech Farm" 
          className="w-full h-full object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-emerald-950/60 to-slate-900/80 backdrop-blur-[2px]"></div>
      </div>
      
      {/* Login Card */}
      <div className="w-full max-w-md p-10 bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-2xl shadow-emerald-950/50 relative z-10 text-center mx-4 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Logo and Branding */}
        <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-[28px] mb-8 mx-auto flex items-center justify-center border border-white/20 shadow-2xl p-3 transform -rotate-2 overflow-hidden hover:rotate-0 transition-transform">
          <img src={logoSrc} alt="Logo" className="w-full h-full object-contain drop-shadow-xl" />
        </div>
        
        <h2 translate="no" className="text-4xl font-black text-white font-display mb-10 tracking-tight leading-none uppercase">
          Sheep<br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Master</span>
        </h2>
        
        <div className="space-y-5 text-left">
           {/* Correo */}
           <div className="relative group">
             <input 
              type="email" 
              placeholder="Correo Corporativo" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white/10 transition-all shadow-inner" 
              value={email} 
              onChange={e => setEmail(e.target.value.replace(/\s/g, ''))} 
            />
           </div>

           {/* Contraseña */}
           <div className="relative group">
             <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Contraseña" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold placeholder:text-slate-400 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white/10 transition-all shadow-inner" 
              value={password} 
              onChange={e => setPassword(e.target.value.trim())} 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-emerald-400 transition-colors"
              title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
           </div>
           
           <div className="flex justify-end mt-1">
             <button 
               onClick={handleForgotPassword}
               className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors mb-2"
             >
               ¿Olvidaste tu contraseña?
             </button>
           </div>

          {/* Botón Principal */}
          <button 
            onClick={onLogin} 
            disabled={loading} 
            className="w-full h-[64px] bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-900/40 active:scale-95 transition-all mt-2 flex items-center justify-center border border-emerald-500/50"
          >
            {loading ? <RefreshCw className="animate-spin" /> : 'Entrar al Sistema'}
          </button>

          {/* Limpiar Cache */}
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl hover:bg-white/10 hover:text-white transition-all font-black uppercase text-[10px]"
          >
            <RefreshCw size={14} />
            Solucionar Problemas (Limpiar Caché)
          </button>
        </div>
        
        <div className="mt-10 pt-6 border-t border-white/10">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plataforma Agrotech</p>
           <p className="text-xs font-bold text-emerald-400 mt-1">{ranchoName}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
