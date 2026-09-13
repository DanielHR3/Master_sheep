import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import Modal from '../shared/Modal';
import { main } from '../../../wailsjs/go/models';
import { GetRanchoPerfil, SaveRanchoPerfil } from '../../services/api';
import { ESTADOS, ESTADOS_MUNICIPIOS } from '../../data/mexico';

interface Props {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Datos del rancho que van al pie de la ficha genealógica, con los mismos
// renglones que el certificado UNO: criador y propietario.
const RanchoPerfilModal: React.FC<Props> = ({ show, onClose, onSaved }) => {
  const [p, setP] = useState<main.RanchoPerfil>(main.RanchoPerfil.createFrom({}));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (show) GetRanchoPerfil().then(setP).catch(() => {}); }, [show]);

  const input = 'w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white';
  const label = 'text-[10px] font-black uppercase text-slate-500';
  const set = (k: keyof main.RanchoPerfil) => (e: React.ChangeEvent<HTMLInputElement>) => setP(prev => main.RanchoPerfil.createFrom({ ...prev, [k]: e.target.value }));

  // Sugerencias para "Municipio // Estado": municipios del estado que ya se
  // escribió tras "//", o de todos los estados mientras no haya estado.
  const municipioOptions = (value: string): string[] => {
    const [mun, est] = value.split('//').map(s => s.trim());
    const estado = ESTADOS.find(e => est && e.toLowerCase() === est.toLowerCase());
    const q = (mun || '').toLowerCase();
    const out: string[] = [];
    const push = (m: string, e: string) => { if (out.length < 12 && (!q || m.toLowerCase().startsWith(q))) out.push(`${m.toUpperCase()} // ${e.toUpperCase()}`); };
    if (estado) ESTADOS_MUNICIPIOS[estado].forEach(m => push(m, estado));
    else if (q.length >= 2) ESTADOS.forEach(e => ESTADOS_MUNICIPIOS[e].forEach(m => push(m, e)));
    return out;
  };
  const block = (titulo: string, keys: [keyof main.RanchoPerfil, string, string][]) => (
    <div className="space-y-3">
      <h4 className="text-xs font-black uppercase tracking-widest text-cyan-400">{titulo}</h4>
      {keys.map(([k, t, ph]) => {
        const isMpio = (k as string).endsWith('municipio_estado');
        const listId = isMpio ? `lista-${k as string}` : undefined;
        return (
          <div key={k as string} className="space-y-1">
            <label className={label}>{t}</label>
            <input className={input} value={(p[k] as string) || ''} placeholder={ph} onChange={set(k)} spellCheck lang="es" autoComplete="off" list={listId} />
            {isMpio && (
              <datalist id={listId}>
                {municipioOptions((p[k] as string) || '').map(o => <option key={o} value={o} />)}
              </datalist>
            )}
          </div>
        );
      })}
    </div>
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await SaveRanchoPerfil(p); onSaved(); onClose(); } catch (err: any) { setError(err?.message || String(err)); } finally { setSaving(false); }
  };

  return (
    <Modal show={show} onClose={onClose} title="Datos del rancho (ficha genealógica)">
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-1">
          <label className={label}>Nombre del rancho (como saldrá en la ficha)</label>
          <input className={input} value={p.nombre || ''} placeholder="Rancho Las Bugambilias" onChange={set('nombre')} spellCheck lang="es" />
        </div>
        <div className="space-y-1">
          <label className={label}>Precio de venta por kg en pie (para el valor estimado del semáforo)</label>
          <input type="number" min={0} step={0.5} className={input} value={p.precio_kg || ''} placeholder="Ej. 75" onChange={e => setP(prev => main.RanchoPerfil.createFrom({ ...prev, precio_kg: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {block('Criador', [['criador_clave', 'Criador (clave y asociación)', 'OGN04-68 - A G L DE OVINOCULTORES...'], ['criador_nombre', 'Nombre', 'FN10-2598 NOMBRE'], ['criador_centro', 'Centro', 'CN10-2227 NOMBRE DEL CENTRO'], ['criador_municipio_estado', 'Mpio / Edo', 'TULANCINGO // HIDALGO']])}
          {block('Propietario', [['propietario_clave', 'Propietario (clave y asociación)', ''], ['propietario_nombre', 'Nombre', ''], ['propietario_centro', 'Centro', ''], ['propietario_municipio_estado', 'Mpio / Edo', '']])}
        </div>
        {error && <p className="text-sm font-bold text-rose-500">{error}</p>}
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-60 cursor-pointer">
          <Save size={16} /> {saving ? 'Guardando…' : 'Guardar datos del rancho'}
        </button>
      </form>
    </Modal>
  );
};

export default RanchoPerfilModal;
