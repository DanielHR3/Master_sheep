import React, { useState } from 'react';
import { 
  PlusCircle, 
  FileSpreadsheet, 
  FlaskConical 
} from 'lucide-react';
import { main } from "../../wailsjs/go/models";
import AnimalCard from "../components/AnimalCard";

interface InventoryProps {
  animals: main.Animal[];
  insumos: main.Insumo[];
  theme: string;
  subTab: 'animals' | 'supplies';
  setSubTab: (tab: 'animals' | 'supplies') => void;
  onAddAnimal: () => void;
  onAddInsumo: () => void;
  onConfirmUltrasound: (animal: main.Animal) => void;
  onTreatment: (animal: any) => void;
  onViewHistory: (animal: any) => void;
  onEditAnimal: (animal: main.Animal) => void;
  onDeleteAnimal: (id: string) => void;
  onAddWeight: (animal: main.Animal) => void;
  onViewWeights: (animal: main.Animal) => void;
  onImportExcel: () => void;
  user: any;
}

const Inventory: React.FC<InventoryProps> = ({ 
  animals, 
  insumos, 
  theme, 
  subTab, 
  setSubTab, 
  onAddAnimal, 
  onAddInsumo, 
  onConfirmUltrasound, 
  onTreatment, 
  onViewHistory, 
  onEditAnimal, 
  onDeleteAnimal, 
  onAddWeight, 
  onViewWeights, 
  onImportExcel,
  user
}) => {
  const [filterDestino, setFilterDestino] = useState<'all' | 'Engorda' | 'Pie de Cría'>('all');
  const isDark = theme === 'dark';

  return (
    <div className="space-y-8 pt-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-wrap gap-4">
          <div className={`flex p-1.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
             <button 
               onClick={() => setSubTab('animals')} 
               className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                 subTab === 'animals' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
               }`}
             >
               Animales
             </button>
             <button 
               onClick={() => setSubTab('supplies')} 
               className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                 subTab === 'supplies' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
               }`}
             >
               Insumos / Medicina
             </button>
          </div>

          {subTab === 'animals' && (
            <div className={`flex p-1.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
               <button onClick={() => setFilterDestino('all')} className={`px-4 py-3 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer ${filterDestino === 'all' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900') : 'text-slate-400 hover:text-white'}`}>Todos</button>
               <button onClick={() => setFilterDestino('Engorda')} className={`px-4 py-3 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer ${filterDestino === 'Engorda' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900') : 'text-slate-400 hover:text-white'}`}>Engorda</button>
               <button onClick={() => setFilterDestino('Pie de Cría')} className={`px-4 py-3 rounded-xl text-xs font-extrabold uppercase transition-all cursor-pointer ${filterDestino === 'Pie de Cría' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-900') : 'text-slate-400 hover:text-white'}`}>Pie de Cría</button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
           {subTab === 'animals' && (
             <>
               <button 
                 onClick={onImportExcel} 
                 className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer ${
                   isDark 
                     ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-emerald-600 hover:text-white' 
                     : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                 }`}
               >
                 <FileSpreadsheet size={18} /> Carga Masiva (Excel)
               </button>
               <button 
                 onClick={onAddAnimal} 
                 className="bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
               >
                 <PlusCircle size={18} /> Alta Animal
               </button>
             </>
           )}
           {subTab === 'supplies' && user?.role === 'Admin' && (
             <button 
               onClick={onAddInsumo} 
               className="bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
             >
               <PlusCircle size={18} /> Agregar Stock Insumo
             </button>
           )}
        </div>
      </div>

      {subTab === 'animals' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {animals.filter(a => filterDestino === 'all' || a.destino === filterDestino).map((a: main.Animal) => (
            <AnimalCard 
              key={a.id} 
              animal={a} 
              theme={theme} 
              onSelect={() => onConfirmUltrasound(a)} 
              onTreatment={() => onTreatment(a)} 
              onViewHistory={() => onViewHistory(a)} 
              onEdit={() => onEditAnimal(a)} 
              onDelete={() => onDeleteAnimal(a.id)} 
              onAddWeight={() => onAddWeight(a)} 
              onViewWeights={() => onViewWeights(a)} 
              isAdmin={user?.role === 'Admin'}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {insumos.map((i: main.Insumo) => (
            <div key={i.id} className={`p-6 rounded-[32px] border transition-all ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                  <FlaskConical size={22} />
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  i.stock_actual <= i.stock_minimo ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {i.tipo}
                </span>
              </div>
              <h4 className="text-xl font-black font-display tracking-tight">{i.nombre}</h4>
              <p className="text-xs text-slate-400 font-bold mt-1">Lote: {i.lote || 'N/A'}</p>
              
              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Stock Actual</p>
                  <p className="text-2xl font-black text-emerald-400 font-display mt-0.5">{i.stock_actual} {i.unidad}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mínimo</p>
                  <p className="text-sm font-bold text-slate-300 mt-1">{i.stock_minimo} {i.unidad}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Inventory;
