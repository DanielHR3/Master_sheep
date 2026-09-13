import React from 'react';
import { main } from '../../wailsjs/go/models';

// Punto de color + frase de una línea. Es el mismo componente en la tarjeta
// del animal, el panel del dashboard y el aviso de venta/baja.
export const semaforoClasses = (color: string, isDark: boolean) => {
  switch (color) {
    case 'rojo':
      return { dot: 'bg-rose-500', box: isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800' };
    case 'amarillo':
      return { dot: 'bg-amber-500', box: isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-800' };
    case 'verde':
      return { dot: 'bg-emerald-500', box: isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-emerald-800' };
    default:
      return { dot: 'bg-slate-400', box: isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600' };
  }
};

interface Props {
  item?: main.SemaforoAnimal;
  isDark: boolean;
  compact?: boolean;   // tarjeta: solo el título
}

const SemaforoBadge: React.FC<Props> = ({ item, isDark, compact }) => {
  if (!item) return null;
  const c = semaforoClasses(item.color, isDark);
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl border px-3 py-2 ${c.box}`} title={item.detalle}>
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${c.dot} ${item.color === 'rojo' ? 'animate-pulse' : ''}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-black leading-tight truncate">{item.titulo}</p>
        {!compact && item.detalle && <p className="text-[10px] opacity-80 leading-snug mt-0.5">{item.detalle}</p>}
      </div>
    </div>
  );
};

export default SemaforoBadge;
