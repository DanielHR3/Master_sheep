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

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-950 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-6666-maroon/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-6666-cream/5 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/2" />
      
      <div className="w-full max-w-md p-10 bg-clay/50 backdrop-blur-3xl border border-white/10 rounded-[60px] shadow-3xl relative z-10 text-center mx-4">
        
        <div className="w-20 h-20 bg-6666-maroon rounded-[32px] rotate-12 flex items-center justify-center mx-auto mb-10 shadow-3xl shadow-6666-maroon/30 border border-white/10 overflow-hidden p-3 mt-4">
          <img src="logo.png" alt="SheepMaster Logo" className="w-full h-full object-contain -rotate-12" />
        </div>
        
        <h2 translate="no" className="text-5xl font-black text-white font-display mb-12 tracking-tighter leading-none uppercase">
          Sheep<br />
          <span className="bg-gradient-to-r from-6666-cream to-6666-sand bg-clip-text text-transparent">Master</span>
        </h2>
        
          <div className="space-y-6 text-left animate-in fade-in duration-500">
             <input 
              type="email" 
              placeholder="Correo Corporativo" 
              className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-6666-maroon/50" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
             <div className="relative group">
               <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Contraseña" 
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold pr-14 focus:outline-none focus:ring-2 focus:ring-6666-maroon/50" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
             </div>
             
             <div className="flex justify-end mt-2">
               <button 
                 onClick={handleForgotPassword}
                 className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors mb-2"
               >
                 ¿Olvidaste tu contraseña?
               </button>
             </div>

             <button 
              onClick={onLogin} 
              disabled={loading} 
              className="w-full py-5 bg-6666-maroon text-white rounded-[24px] font-black text-lg hover:bg-6666-sand hover:text-6666-maroon shadow-2xl shadow-6666-maroon/20 active:scale-95 transition-all mt-4"
            >
              {loading ? 'Cargando...' : 'ENTRAR AL SISTEMA'}
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 transition-all font-black uppercase text-[10px]"
            >
              <RefreshCw size={14} />
              Limpiar Caché y Reiniciar
            </button>
          </div>
        
        <p className="mt-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-40">Acceso exclusivo - Rancho Don Pablito</p>
      </div>
    </div>
  );
};

export default Login;
