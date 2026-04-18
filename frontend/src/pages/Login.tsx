import React, { useState } from 'react';
import { Settings, RefreshCw, Eye, EyeOff } from 'lucide-react';

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
  const [showConfig, setShowConfig] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [configUrl, setConfigUrl] = useState(localStorage.getItem('backend_url') || '');

  const handleSaveConfig = () => {
    let url = configUrl.trim();
    
    // Check if user accidentally pasted the terminal command
    if (url.includes('ssh ') || url.includes('80:localhost')) {
      alert("⚠️ Error: Parece que pegaste el comando de la terminal.\n\nPor favor, pega el ENLACE (URL) que termina en .pinggy.link o .ngrok-free.app");
      return;
    }

    if (url && !url.startsWith('http')) {
      url = `https://${url}`;
    }

    localStorage.setItem('backend_url', url);
    setConfigUrl(url);
    setShowConfig(false);
    alert("Dirección del servidor actualizada con éxito.");
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-950 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-6666-maroon/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-6666-cream/5 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/2" />
      
      <div className="w-full max-w-md p-10 bg-clay/50 backdrop-blur-3xl border border-white/10 rounded-[60px] shadow-3xl relative z-10 text-center mx-4">
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 transition-all hover:rotate-90 z-20"
          title="Configuración de Red"
        >
          <Settings size={20} />
        </button>

        <div className="w-20 h-20 bg-6666-maroon rounded-[32px] rotate-12 flex items-center justify-center mx-auto mb-10 shadow-3xl shadow-6666-maroon/30 border border-white/10 overflow-hidden p-3">
          <img src="logo.png" alt="Master Sheep Logo" className="w-full h-full object-contain -rotate-12" />
        </div>
        
        <h2 translate="no" className="text-5xl font-black text-white font-display mb-12 tracking-tighter leading-none uppercase">
          Master<br />
          <span className="bg-gradient-to-r from-6666-cream to-6666-sand bg-clip-text text-transparent">Sheep</span>
        </h2>
        
        {showConfig ? (
          <div className="space-y-6 text-left animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="flex items-center gap-3 mb-2">
               <div className="w-2 h-2 rounded-full bg-antique-brass animate-pulse"></div>
               <h3 className="text-white font-black uppercase text-[10px] tracking-widest opacity-70">Configuración de Red</h3>
             </div>
             
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 ml-1">URL del Servidor (Pinggy/VPN)</label>
               <input 
                 type="text" 
                 placeholder="https://...pinggy.link" 
                 className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-medium placeholder:opacity-30" 
                 value={configUrl} 
                 onChange={e => setConfigUrl(e.target.value)} 
               />
             </div>
             
             <button 
               onClick={handleSaveConfig}
               className="w-full py-4 bg-antique-brass text-white rounded-2xl font-black text-sm hover:bg-white hover:text-black transition-all shadow-xl shadow-antique-brass/10"
             >
               GUARDAR Y VOLVER
             </button>
             
             <p className="text-[9px] text-slate-500 italic text-center px-4 leading-relaxed">
               Necesario solo para acceso remoto desde el celular.
             </p>
          </div>
        ) : (
          <div className="space-y-6 text-left animate-in fade-in duration-500">
             <input 
              type="email" 
              placeholder="Correo Corporativo" 
              className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
             <div className="relative">
               <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Contraseña" 
                className="w-full bg-slate-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold pr-14" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
                title={showPassword ? "Ocultar" : "Mostrar"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
             </div>
             <button 
              onClick={onLogin} 
              disabled={loading} 
              className="w-full py-5 bg-6666-maroon text-white rounded-[24px] font-black text-lg hover:bg-6666-sand hover:text-6666-maroon shadow-2xl shadow-6666-maroon/20 active:scale-95 transition-all"
            >
              {loading ? '...' : 'ENTRAR AL SISTEMA'}
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 transition-all font-black uppercase text-[10px]"
            >
              <RefreshCw size={14} />
              Limpiar Cache y Reiniciar
            </button>
          </div>
        )}
        
        <p className="mt-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-40">Acceso exclusivo - Master Sheep</p>
      </div>
    </div>
  );
};

export default Login;
