import React, { useState } from 'react';
import { Plus, Warehouse, Trash2, Tag, X } from 'lucide-react';
import { main } from "../../wailsjs/go/models";
import { useStore } from '../context/useStore';
import { Card } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

interface CorralesProps {
  corrales: main.Corral[];
  animals: main.Animal[];
  theme: string;
  onAddCorral: () => void;
  onDeleteCorral: (id: string) => void;
  user: any;
  tipos: main.TipoCorral[];
  onAddTipo: (nombre: string) => void;
  onDeleteTipo: (id: string) => void;
}

const Corrales: React.FC<CorralesProps> = ({ corrales, animals, theme, onAddCorral, onDeleteCorral, user, tipos, onAddTipo, onDeleteTipo }) => {
  const isLoading = useStore().loading;
  const isDark = theme === 'dark';
  const puedeEditar = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const [nuevoTipo, setNuevoTipo] = useState('');
  // Cuántos corrales usan cada tipo: un tipo en uso no se puede quitar.
  const enUso = (nombre: string) => corrales.filter(c => (c.tipo || '').toLowerCase() === nombre.toLowerCase()).length;
  const agregarTipo = () => {
    const n = nuevoTipo.trim();
    if (!n) return;
    onAddTipo(n);
    setNuevoTipo('');
  };
  return (
    <div className="space-y-10 pt-10 animate-in slide-in-from-right-8 duration-700">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className={`text-3xl @2xl:text-5xl font-black font-display tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Gestión de Corrales
          </h2>
          <p className="text-emerald-500 font-bold uppercase tracking-widest text-xs mt-1.5 flex items-center gap-2">
            Infraestructura y Capacidad
          </p>
        </div>
        {puedeEditar && (
          <button 
            onClick={onAddCorral} 
            className={`bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase flex items-center gap-3 transition-all active:scale-95 shadow-lg ${theme === 'dark' ? 'shadow-emerald-950/80' : 'shadow-emerald-500/20'}`}
          >
            <Plus size={18} /> Nuevo Corral
          </button>
        )}
      </div>

      {/* Catálogo de tipos: la lista que ofrece el formulario de corral.
          Es por rancho; los Admin agregan o quitan tipos aquí mismo. */}
      <div className={`p-6 @2xl:p-8 rounded-[32px] border ${isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Tag size={16} className="text-emerald-500" />
          <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Tipos de corral</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tipos.map(t => {
            const usados = enUso(t.nombre);
            return (
              <span key={t.id} data-tipo={t.nombre} className={`inline-flex items-center gap-2 pl-4 pr-2 py-2 rounded-full text-xs font-bold border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                {t.nombre}
                {usados > 0 && <span className="text-[10px] font-black text-emerald-500">{usados}</span>}
                {puedeEditar && (
                  <button
                    type="button"
                    disabled={usados > 0}
                    title={usados > 0 ? `En uso por ${usados} corral(es); cámbialos de tipo antes de quitarlo` : `Quitar "${t.nombre}"`}
                    onClick={() => onDeleteTipo(t.id)}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </span>
            );
          })}
          {tipos.length === 0 && !isLoading && (
            <span className="text-xs text-slate-400 font-bold uppercase">Sin tipos todavía</span>
          )}
          {puedeEditar && (
            <form onSubmit={e => { e.preventDefault(); agregarTipo(); }} className="flex items-center gap-2 ml-auto">
              <input
                value={nuevoTipo}
                onChange={e => setNuevoTipo(e.target.value)}
                placeholder="Nuevo tipo (ej. Destete)"
                maxLength={40}
                aria-label="Nuevo tipo de corral"
                className={`px-4 py-2 rounded-full text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
              />
              <button type="submit" disabled={!nuevoTipo.trim()} className="px-4 py-2 rounded-full text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1">
                <Plus size={14} /> Agregar
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 @2xl:grid-cols-2 @3xl:grid-cols-3 gap-8">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="rounded-[40px] p-8">
              <Skeleton className="w-12 h-12 rounded-[20px] mb-6" />
              <Skeleton className="h-8 w-2/3 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-6" />
              <Skeleton className="h-2 w-full" />
            </Card>
          ))
        ) : corrales.length > 0 ? corrales.map((corral) => {
          const occupancy = (Array.isArray(animals) ? animals : []).filter(a => a.corral_id === corral.nombre || a.corral_id === corral.id).length;
          const percentage = (occupancy / (corral.capacidad || 1)) * 100;
          return (
            <div key={corral.id} className={`p-8 rounded-[40px] border transition-all hover:scale-[1.02] shadow-xl ${theme === 'dark' ? 'bg-slate-900/80 border-slate-700/50 backdrop-blur-md' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between mb-6">
                <div className={`p-4 rounded-[20px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Warehouse size={24} className="text-emerald-500" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if(confirm(`¿Estás seguro de eliminar el corral ${corral.nombre}? Los animales asignados quedarán sin corral.`)) {
                        onDeleteCorral(corral.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black h-fit ${percentage > 90 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <h4 className={`text-3xl font-black font-display tracking-tight mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{corral.nombre}</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">{corral.tipo ? `${corral.tipo} · ` : ''}Capacidad: {corral.capacidad} Animales</p>
              <div className={`h-2 w-full rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className={`h-full ${percentage > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center opacity-30">
            <Warehouse size={64} className="mx-auto mb-4" />
            <p className="font-black uppercase text-xs">Sin corrales</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Corrales;
