import React from 'react';
import Modal from '../shared/Modal';
import { Network } from 'lucide-react';
import { main } from "../../../wailsjs/go/models";

interface GenealogyModalProps {
  show: boolean;
  onClose: () => void;
  animal: main.Animal | null;
  animals: main.Animal[];
  theme: string;
}

const Node = ({ title, value, foto, isDark }: { title: string, value: string | undefined, foto?: string, isDark: boolean }) => (
  <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center shadow-lg transition-all hover:scale-105 ${
    isDark 
      ? 'bg-slate-800 border-slate-700 text-slate-200 shadow-black/50' 
      : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
  }`}>
    {foto ? (
      <img src={foto} alt={title} className="w-10 h-10 object-cover rounded-full mb-2 shadow-md border-2 border-slate-500/30" />
    ) : (
      <div className={`w-10 h-10 rounded-full mb-2 flex items-center justify-center border-2 border-slate-500/30 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
        <Network size={16} className="text-slate-400" />
      </div>
    )}
    <span className={`text-[9px] font-black uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</span>
    <span className="font-bold text-sm">{value || 'Desconocido'}</span>
  </div>
);

const Line = ({ className, isDark }: { className: string, isDark: boolean }) => (
  <div className={`absolute ${className} ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
);

const GenealogyModal: React.FC<GenealogyModalProps> = ({ show, onClose, animal, animals, theme }) => {
  if (!animal) return null;
  const isDark = theme === 'dark';

  return (
    <Modal show={show} onClose={onClose} title={`Genética: ${animal.arete}`}>
      <div className="p-6 overflow-x-auto">
        <div className="min-w-[600px] relative py-8 flex flex-col items-center gap-12">
          
          {/* Abuelos */}
          <div className="flex w-full justify-between px-12 relative z-10">
            <div className="flex gap-4">
              <Node title="Abuelo Pat." value={animal.abuelo_paterno_id} isDark={isDark} />
              <Node title="Abuela Pat." value={animal.abuela_paterna_id} isDark={isDark} />
            </div>
            <div className="flex gap-4">
              <Node title="Abuelo Mat." value={animal.abuelo_materno_id} isDark={isDark} />
              <Node title="Abuela Mat." value={animal.abuela_materna_id} isDark={isDark} />
            </div>
          </div>

          {/* Padres */}
          <div className="flex w-full justify-around relative z-10 px-24">
            <Node title="Padre" value={animal.padre_id} foto={animals.find(a => a.arete === animal.padre_id || a.id === animal.padre_id)?.foto || ''} isDark={isDark} />
            <Node title="Madre" value={animal.madre_id} foto={animals.find(a => a.arete === animal.madre_id || a.id === animal.madre_id)?.foto || ''} isDark={isDark} />
          </div>

          {/* Animal */}
          <div className="relative z-10">
            <div className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center shadow-xl transform scale-110 ${
              isDark 
                ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-100 shadow-cyan-900/50' 
                : 'bg-cyan-50 border-cyan-400 text-cyan-900 shadow-cyan-200/50'
            }`}>
              {animal.foto ? (
                <img src={animal.foto} alt="Sujeto" className="w-16 h-16 object-cover rounded-full mb-2 shadow-md border-2 border-cyan-400" />
              ) : (
                <Network size={20} className="mb-2 text-cyan-500" />
              )}
              <span className={`text-[10px] font-black uppercase tracking-wider mb-1 opacity-70`}>Sujeto</span>
              <span className="font-black text-lg">{animal.arete}</span>
              <span className="text-xs font-bold mt-1 opacity-80">{animal.raza}</span>
            </div>
          </div>

          {/* SVG Lines Connector */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" style={{ minHeight: '400px' }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDark ? '#334155' : '#cbd5e1'} />
                <stop offset="100%" stopColor={isDark ? '#06b6d4' : '#06b6d4'} />
              </linearGradient>
            </defs>
            {/* Abuelos Paternos a Padre */}
            <path d="M 180 80 L 180 120 L 250 120 L 250 160" fill="transparent" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2" />
            <path d="M 320 80 L 320 120 L 250 120" fill="transparent" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2" />
            
            {/* Abuelos Maternos a Madre */}
            <path d="M 520 80 L 520 120 L 450 120 L 450 160" fill="transparent" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2" />
            <path d="M 380 80 L 380 120 L 450 120" fill="transparent" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2" />

            {/* Padres a Animal (with gradient) */}
            <path d="M 250 240 L 250 280 L 350 280 L 350 320" fill="transparent" stroke="url(#lineGrad)" strokeWidth="3" />
            <path d="M 450 240 L 450 280 L 350 280" fill="transparent" stroke="url(#lineGrad)" strokeWidth="3" />
          </svg>

        </div>
      </div>
    </Modal>
  );
};

export default GenealogyModal;
