import React from 'react';
import { Stethoscope, Syringe } from 'lucide-react';

interface ClinicalProps {
  animals: any[];
  insumos: any[];
  onTreatment: (animal: any) => void;
  theme: string;
}

const Clinical: React.FC<ClinicalProps> = ({ animals, insumos, onTreatment, theme }) => {
  return (
    <div className="max-w-7xl mx-auto pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
       <div className="flex justify-between items-center mb-8">
           <div>
             <h2 className={`text-5xl font-black font-display tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Stethoscope className="text-rose-500 inline-block mr-2" size={40} /> Salud Animal
             </h2>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
                Seleccione un animal para aplicar medicamentos o tratamientos
             </p>
           </div>
       </div>

       {(!animals || animals.length === 0) ? (
         <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[40px]">
            <Syringe size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-xl font-bold dark:text-white text-slate-800 mb-2">No hay animales registrados</h3>
            <p className="text-slate-500">Registre un animal en el inventario para poder aplicar tratamientos.</p>
         </div>
       ) : (
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(animals || []).map((a: any) => (
               <div 
                 key={a.id} 
                 onClick={() => onTreatment(a)}
                 className={`border rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group ${
                   theme === 'dark' ? 'bg-slate-900/80 border-slate-700/50 backdrop-blur-md' : 'bg-white border-slate-200'
                 }`}
               >
                   <div className="flex justify-between items-start mb-4">
                       <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                         theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-100 text-slate-900 border-slate-200'
                       }`}>
                         {a.arete}
                       </span>
                       <div className="bg-rose-500/10 p-2 rounded-full text-rose-500 group-hover:scale-110 transition-transform">
                          <Syringe size={18} />
                       </div>
                   </div>
                   <h3 className="text-xl font-bold dark:text-white text-slate-800 mb-1">{a.nombre || a.raza}</h3>
                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{a.sexo}</p>
                   
                   <div className="space-y-2">
                     <button onClick={(e) => { e.stopPropagation(); onTreatment(a); }} className={`w-full py-3 font-black rounded-2xl border transition-colors ${
                       theme === 'dark' ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-500' : 'bg-slate-50 border-slate-200 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-400'
                     }`}>
                         Aplicar Tratamiento
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); onTreatment({ ...a, isProlapso: true }); }} className={`w-full py-2 font-bold text-xs rounded-xl border transition-colors ${
                       theme === 'dark' ? 'bg-rose-950/20 text-rose-400 border-rose-900/30 hover:bg-rose-600 hover:text-white hover:border-rose-500' : 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white hover:border-rose-400'
                     }`}>
                         Registrar Prolapso / Hernia
                     </button>
                   </div>
               </div>
            ))}
         </div>
       )}
    </div>
  );
};

export default Clinical;
