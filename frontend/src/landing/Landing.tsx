import React from 'react';

interface LandingProps {
  onLoginClick: () => void;
}

// Versión mínima (Tarea 5); la página completa llega en la Tarea 8.
const Landing: React.FC<LandingProps> = ({ onLoginClick }) => (
  <div className="min-h-screen bg-slate-950 text-white font-sans">
    <header className="flex items-center justify-between px-6 py-4">
      <span className="font-display font-black text-xl">SheepMaster</span>
      <button onClick={onLoginClick} className="text-sm font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 cursor-pointer">
        Iniciar sesión
      </button>
    </header>
    <main className="px-6 py-24 text-center">
      <h1 className="font-display text-4xl font-black">Registra en el corral sin señal.</h1>
    </main>
  </div>
);

export default Landing;
