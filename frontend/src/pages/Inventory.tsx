import React from 'react';
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
  onImportExcel 
}) => {
  return (
    <div className="space-y-10 pt-10 animate-in slide-in-from-right-8 duration-700">
      <div className="flex justify-between items-center">
        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5">
           <button onClick={() => setSubTab('animals')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${subTab === 'animals' ? 'bg-saddle-tan text-white' : 'text-slate-500'}`}>Animales</button>
           <button onClick={() => setSubTab('supplies')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${subTab === 'supplies' ? 'bg-saddle-tan text-white' : 'text-slate-500'}`}>Insumos</button>
        </div>
        <div className="flex gap-4">
           {subTab === 'animals' && (
             <>
               <button onClick={onImportExcel} className="bg-emerald-600/10 border border-emerald-500/30 text-emerald-500 px-6 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all">
                 <FileSpreadsheet size={18} /> Carga Masiva (Excel)
               </button>
               <button onClick={onAddAnimal} className="bg-saddle-tan text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-saddle-tan/20 flex items-center gap-2">
                 <PlusCircle size={18} /> Alta de Animal
               </button>
             </>
           )}
           {subTab === 'supplies' && (
             <button onClick={onAddInsumo} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-500/20 flex items-center gap-2">
               <PlusCircle size={18} /> Agregar Stock
             </button>
           )}
        </div>
      </div>

      {subTab === 'animals' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {animals.map((a: main.Animal) => (
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
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {insumos.map((i: main.Insumo) => {
            const expiryDate = i.fecha_vencimiento ? new Date(i.fecha_vencimiento) : null;
            const isExpiringSoon = expiryDate && expiryDate.getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000 && expiryDate.getTime() > new Date().getTime();
            const isExpired = expiryDate && expiryDate.getTime() < new Date().getTime();
            
            return (
              <div key={i.id} className="p-8 bg-clay/30 border border-white/5 rounded-[40px] relative overflow-hidden group hover:border-antique-brass/30 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-slate-950 rounded-2xl"><FlaskConical size={24} className="text-antique-brass" /></div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${i.stock_actual < i.stock_minimo ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'bg-emerald-500/20 text-emerald-500'}`}>STOCK: {i.stock_actual} {i.unidad}</span>
                    {isExpired && <span className="px-2 py-1 bg-rose-600 text-white text-[8px] font-black rounded uppercase">VENCIDO</span>}
                    {isExpiringSoon && !isExpired && <span className="px-2 py-1 bg-amber-500 text-black text-[8px] font-black rounded uppercase">PRÓX. VENCIMIENTO</span>}
                  </div>
                </div>
                <h4 className="text-2xl font-black text-white italic font-serif mb-1">{i.nombre}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{i.tipo} • Lote: <span className="text-antique-brass">{i.lote || 'N/A'}</span></p>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-2 bg-slate-950/50 rounded-xl border border-white/5">
                    <p className="text-[8px] text-slate-500 uppercase font-black">Vencimiento</p>
                    <p className="text-[10px] text-white font-bold">{i.fecha_vencimiento || 'No registrada'}</p>
                  </div>
                  <div className="p-2 bg-slate-950/50 rounded-xl border border-white/5">
                    <p className="text-[8px] text-slate-500 uppercase font-black">Proveedor</p>
                    <p className="text-[10px] text-white font-bold truncate">{i.proveedor || 'N/A'}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-black text-slate-400">
                  <span>RETIRO: {i.dias_retiro} DÍAS</span>
                  <span className="text-white">${i.costo_unitario} /u</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Inventory;
