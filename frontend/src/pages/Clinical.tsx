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
             <h2 className="text-4xl font-black italic font-serif flex items-center gap-4 dark:text-white text-slate-800">
                <Stethoscope className="text-antique-brass" size={40} /> Salud Animal
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
                 className="bg-white dark:bg-clay/30 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group"
               >
                   <div className="flex justify-between items-start mb-4">
                       <span className="bg-slate-100 dark:bg-black/30 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-200 dark:border-white/10">
                         {a.arete}
                       </span>
                       <div className="bg-antique-brass/10 p-2 rounded-full text-antique-brass group-hover:scale-110 transition-transform">
                          <Syringe size={18} />
                       </div>
                   </div>
                   <h3 className="text-xl font-bold dark:text-white text-slate-800 mb-1">{a.nombre || a.raza}</h3>
                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{a.sexo}</p>
                   
                   <button className="w-full py-3 bg-slate-50 dark:bg-black/20 font-bold text-antique-brass rounded-2xl border border-slate-100 dark:border-white/5 group-hover:bg-antique-brass group-hover:text-white transition-colors">
                       Aplicar Tratamiento
                   </button>
               </div>
            ))}
         </div>
       )}
    </div>
  );
};

export default Clinical;
