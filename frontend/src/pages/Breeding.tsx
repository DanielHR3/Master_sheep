import React from 'react';
import { ClipboardList, Bell, Baby, Heart } from 'lucide-react';
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
  const isDark = theme === 'dark';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 animate-in fade-in duration-500">
      {/* Main Reproduction Card */}
      <div className={`lg:col-span-2 p-8 md:p-10 border rounded-[40px] shadow-xl ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <h3 className={`text-3xl font-black font-display tracking-tight mb-8 flex items-center gap-3 ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          <Heart className="text-emerald-400" size={32} /> Gestión de Ciclos Reproductivos
        </h3>
        
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className={`text-xs font-black uppercase tracking-wider px-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                 Seleccionar Borrega Madre
               </label>
               <select 
                 className={`w-full border rounded-2xl px-5 py-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                   isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                 }`} 
                 value={form.animal_id} 
                 onChange={e => setForm({...form, animal_id: e.target.value})}
               >
                 <option value="">-- Seleccionar Borrega --</option>
                 {animals.filter((a: any) => a.sexo === 'Hembra').map((a: any) => (
                   <option key={a.id} value={a.id}>Arete: {a.arete} ({a.raza || 'Sin raza'})</option>
                 ))}
               </select>
             </div>

             <div className="space-y-2">
               <label className={`text-xs font-black uppercase tracking-wider px-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                 Técnica / Método
               </label>
               <select 
                 className={`w-full border rounded-2xl px-5 py-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                   isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                 }`} 
                 value={form.tipo} 
                 onChange={e => setForm({...form, tipo: e.target.value})}
               >
                 <option value="Monta Natural">Monta Natural</option>
                 <option value="Inseminación Artificial">I.A (Inseminación Artificial)</option>
                 <option value="Inducción">Inducción (Tratamiento Hormonal)</option>
                 <option value="Transferencia de Embriones">Transferencia de Embriones</option>
               </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className={`text-xs font-black uppercase tracking-wider px-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                 Fecha del Evento
               </label>
               <input 
                 type="date"
                 className={`w-full border rounded-2xl px-5 py-4 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                   isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                 }`} 
                 value={form.fecha_evento} 
                 onChange={e => {
                    const newDate = e.target.value;
                    let probableParto = '';
                    if (newDate) {
                        const d = new Date(newDate);
                        d.setDate(d.getDate() + 150); // Gestación 150 días
                        probableParto = d.toISOString().split('T')[0];
                    }
                    setForm({...form, fecha_evento: newDate, fecha_probable_parto: probableParto});
                 }}
               />
             </div>

             <div className="space-y-2">
               <label className={`text-xs font-black uppercase tracking-wider px-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                 Fecha Probable de Parto (+150 días)
               </label>
               <input 
                 type="date"
                 readOnly
                 className={`w-full border rounded-2xl px-5 py-4 font-bold text-sm focus:outline-none opacity-80 ${
                   isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-500'
                 }`} 
                 value={form.fecha_probable_parto || ''} 
               />
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={onRegister} 
              className={`flex-1 py-5 bg-teal-600 hover:bg-teal-500 text-white font-black rounded-2xl text-base shadow-lg uppercase tracking-wider active:scale-95 transition-all cursor-pointer ${
                isDark ? 'shadow-teal-950/80' : 'shadow-teal-500/20'
              }`}
            >
              Registrar Evento Reproductivo
            </button>
            <button 
              onClick={onRegisterParto} 
              className={`flex-1 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-base shadow-lg uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${
                isDark ? 'shadow-emerald-950/80' : 'shadow-emerald-500/20'
              }`}
            >
              <Baby size={22} /> Registrar Parto
            </button>
          </div>
        </div>
      </div>

      {/* Side Panel: Próximos Partos */}
      <div className={`p-8 border rounded-[40px] shadow-xl ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
         <h4 className="text-sm font-black text-cyan-400 flex items-center gap-2 mb-6 uppercase tracking-wider font-display">
           <Bell size={20} /> Monitoreo de Gestación
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
