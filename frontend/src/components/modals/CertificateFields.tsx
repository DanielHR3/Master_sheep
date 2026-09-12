import React from 'react';

// Campos del encabezado del certificado UNO. Se usa en alta y edición.
// `values` es cualquier objeto con estas llaves; `onChange` recibe llave y valor.
export const GRADOS_REGISTRO = ['SI', 'GE', 'ND', 'HO', 'TR', 'OT', 'RP'];

interface Props {
  values: Record<string, any>;
  onChange: (key: string, value: string | number) => void;
  dark?: boolean; // estilo del modal de edición (fondo slate-950)
}

const CertificateFields: React.FC<Props> = ({ values, onChange, dark }) => {
  const input = dark
    ? 'w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-antique-brass/50 transition-all font-bold'
    : 'w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white';
  const label = dark
    ? 'text-[10px] font-black text-slate-500 uppercase ml-2 flex items-center gap-2'
    : 'text-[10px] font-black uppercase text-slate-500';
  const text = (key: string, title: string, placeholder = '') => (
    <div className="space-y-2">
      <label className={label}>{title}</label>
      <input className={input} value={values[key] || ''} placeholder={placeholder} onChange={e => onChange(key, e.target.value)} />
    </div>
  );
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-black uppercase tracking-widest text-cyan-400">Certificado / Registro</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {text('nombre', 'Nombre', 'Nombre del animal')}
        {text('registro', 'Registro UNO', 'UNO:272991MN-RP')}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {text('tatuaje_der', 'Tatuaje oreja der.')}
        {text('tatuaje_izq', 'Tatuaje oreja izq.')}
        {text('tatuaje_cola', 'Tatuaje cola')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {text('color', 'Color', 'Carac. raza')}
        <div className="space-y-2">
          <label className={label}>Pureza (%)</label>
          <input type="number" min={0} max={100} step={0.01} className={input} value={values.pureza ?? ''} onChange={e => onChange('pureza', parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <label className={label}>Grado registro</label>
          <select className={input} value={values.grado_registro || ''} onChange={e => onChange('grado_registro', e.target.value)}>
            <option value="">—</option>
            {GRADOS_REGISTRO.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {text('siniiga', 'SINIIGA')}
        {text('id_electronica', 'ID electrónica')}
      </div>
    </div>
  );
};

export default CertificateFields;
