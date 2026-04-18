import React from 'react';
import { Stethoscope, Syringe, PlusCircle } from 'lucide-react';

interface ClinicalProps {
  animals: any[];
  form: any;
  setForm: (form: any) => void;
  onRegister: () => void;
  theme: string;
}

const Clinical: React.FC<ClinicalProps> = ({ 
  animals, 
  form, 
  setForm, 
  onRegister, 
  theme 
}) => {
  return (
    <div className="max-w-4xl mx-auto pt-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="p-10 bg-clay/30 border border-white/5 rounded-[50px] shadow-2xl backdrop-blur-xl">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h3 className="text-4xl font-black italic font-serif text-white mb-2 flex items-center gap-4">
              <Stethoscope className="text-antique-brass" size={40} /> Salud Animal
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Registro de Tratamientos y Medicina Preventiva
            </p>
          </div>
          <div className="bg-saddle-tan/10 p-5 rounded-3xl border border-saddle-tan/20">
             <Syringe size={32} className="text-saddle-tan" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-3">
             <label className="text-[11px] font-black uppercase text-slate-400 px-1">Animal / Grupo</label>
             <select 
               className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-5 text-white font-bold focus:ring-2 focus:ring-antique-brass outline-none transition-all" 
               value={form.animal_id} 
               onChange={e => setForm({...form, animal_id: e.target.value})}
             >
               <option value="">Seleccionar Animal...</option>
               {animals.map((a: any) => (
                 <option key={a.id} value={a.id}>{a.arete} ({a.nombre || a.raza})</option>
               ))}
             </select>
          </div>
          <div className="space-y-3">
             <label className="text-[11px] font-black uppercase text-slate-400 px-1">Concepto Médico</label>
             <select 
               className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-5 text-white font-bold" 
               value={form.diagnostico} 
               onChange={e => setForm({...form, diagnostico: e.target.value})}
             >
               <option value="Desparasitación">Desparasitación</option>
               <option value="Vacunación">Vacunación</option>
               <option value="Tratamiento Antibiótico">Tratamiento Antibiótico</option>
               <option value="Suplementación Vitamínica">Suplementación Vitamínica</option>
               <option value="Herida/Lesión">Herida / Lesión</option>
             </select>
          </div>
          <div className="md:col-span-2 space-y-3">
             <label className="text-[11px] font-black uppercase text-slate-400 px-1">Medicamento y Dosis</label>
             <input 
               type="text" 
               className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-5 text-white font-bold" 
               placeholder="ej. Ivermectina 1% - 1ml sucutáneo" 
               value={form.tratamiento} 
               onChange={e => setForm({...form, tratamiento: e.target.value})}
             />
          </div>
        </div>

        <button 
          onClick={onRegister} 
          className="w-full py-6 bg-antique-brass text-white font-black rounded-[30px] text-xl shadow-2xl shadow-antique-brass/30 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <PlusCircle size={24} /> GUARDAR EN EXPEDIENTE
        </button>
      </div>
    </div>
  );
};

export default Clinical;
