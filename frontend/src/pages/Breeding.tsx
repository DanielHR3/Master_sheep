import React from 'react';
import { ClipboardList, Bell } from 'lucide-react';
import NextBirth from '../components/NextBirth';

interface BreedingProps {
  animals: any[];
  form: any;
  setForm: (form: any) => void;
  onRegister: () => void;
  theme: string;
  onRegisterParto: () => void;
}

const Breeding: React.FC<BreedingProps> = ({ 
  animals, 
  form, 
  setForm, 
  onRegister, 
  theme, 
  onRegisterParto 
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-10 animate-in slide-in-from-right-8 duration-700">
      <div className="lg:col-span-2 p-10 bg-clay/30 border border-white/5 rounded-[50px] shadow-2xl">
        <h3 className="text-3xl font-black italic font-serif text-white mb-10 flex items-center gap-4">
          <ClipboardList className="text-antique-brass" size={32} /> Gestión de Ciclos
        </h3>
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-8">
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 px-1">Seleccionar Borrega</label>
               <select 
                 className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold" 
                 value={form.animal_id} 
                 onChange={e => setForm({...form, animal_id: e.target.value})}
               >
                 <option value="">Seleccione...</option>
                 {animals.filter((a: any) => a.sexo === 'Hembra').map((a: any) => (
                   <option key={a.id} value={a.id}>{a.arete} ({a.raza})</option>
                 ))}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 px-1">Técnica</label>
               <select 
                 className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold" 
                 value={form.tipo} 
                 onChange={e => setForm({...form, tipo: e.target.value})}
               >
                 <option value="Monta Natural">Monta Natural</option>
                 <option value="Inseminación Artificial">I.A (Inseminación)</option>
               </select>
             </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onRegister} 
              className="flex-1 py-6 bg-saddle-tan text-white font-black rounded-[30px] text-xl shadow-2xl shadow-saddle-tan/40 transform active:scale-95 transition-all"
            >
              REGISTRAR EVENTO
            </button>
            <button 
              onClick={() => onRegisterParto()} 
              className="px-10 py-6 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-black rounded-[30px] text-xl transform active:scale-95 transition-all hover:bg-emerald-600 hover:text-white"
            >
              REGISTRAR PARTO
            </button>
          </div>
        </div>
      </div>
      <div className="p-8 bg-gradient-to-br from-clay/40 to-slate-950 border border-white/5 rounded-[40px]">
         <h4 className="text-xs font-black text-antique-brass flex items-center gap-2 mb-6 uppercase italic font-serif">
           <Bell size={18} /> Próximos Partos
         </h4>
         <div className="space-y-4">
            <NextBirth id="BOR-0422" date="Hoy" progress={145} />
            <NextBirth id="BOR-0881" date="12 Abr" progress={132} />
         </div>
      </div>
    </div>
  );
};

export default Breeding;
