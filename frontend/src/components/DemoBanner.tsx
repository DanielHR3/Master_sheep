import React from 'react';
import { Lock } from 'lucide-react';

const DemoBanner: React.FC = () => {
  return (
    <div className="bg-rose-600 text-white py-2 px-6 flex items-center justify-center gap-4 animate-pulse">
      <Lock size={14} />
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">SISTEMA EN MODO LECTURA (DEMO) - NO SE PERMITEN MODIFICACIONES</span>
      <Lock size={14} />
    </div>
  );
};

export default DemoBanner;
