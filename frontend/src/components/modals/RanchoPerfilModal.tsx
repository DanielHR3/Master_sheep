import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import Modal from '../shared/Modal';
import { main } from '../../../wailsjs/go/models';
import { GetRanchoPerfil, SaveRanchoPerfil } from '../../services/api';

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
  const block = (titulo: string, keys: [keyof main.RanchoPerfil, string, string][]) => (
    <div className="space-y-3">
      <h4 className="text-xs font-black uppercase tracking-widest text-cyan-400">{titulo}</h4>
      {keys.map(([k, t, ph]) => (
        <div key={k as string} className="space-y-1">
          <label className={label}>{t}</label>
          <input className={input} value={(p[k] as string) || ''} placeholder={ph} onChange={set(k)} />
        </div>
      ))}
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
          <input className={input} value={p.nombre || ''} placeholder="Rancho Las Bugambilias" onChange={set('nombre')} />
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
