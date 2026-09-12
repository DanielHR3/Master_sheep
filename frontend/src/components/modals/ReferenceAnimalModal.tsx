import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import Modal from '../shared/Modal';
import { main } from '../../../wailsjs/go/models';
import { GRADOS_REGISTRO } from './CertificateFields';

// Animal de referencia: un ancestro que no vive en el rancho (viene del
// certificado de un semental comprado). Solo existe para el árbol.
export interface ReferenceDraft {
  id?: string;         // presente al editar
  arete: string;       // identificación / tatuaje
  nombre: string;
  registro: string;
  grado_registro: string;
  raza: string;
  pureza: number;
  sexo: string;
}

interface Props {
  show: boolean;
  title: string;        // "Agregar padre de SEM-01", "Editar ancestro"
  initial: ReferenceDraft | null;
  onClose: () => void;
  onSave: (draft: ReferenceDraft) => Promise<void>;
}

const empty = (sexo: string): ReferenceDraft => ({ arete: '', nombre: '', registro: '', grado_registro: 'SI', raza: 'Dorper', pureza: 100, sexo });

const ReferenceAnimalModal: React.FC<Props> = ({ show, title, initial, onClose, onSave }) => {
  const [draft, setDraft] = useState<ReferenceDraft>(initial || empty('Macho'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setDraft(initial || empty('Macho')); setError(''); }, [initial, show]);

  const input = 'w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white dark:bg-slate-950';
  const label = 'text-[10px] font-black uppercase text-slate-500';
  const set = (k: keyof ReferenceDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft(d => ({ ...d, [k]: k === 'pureza' ? (parseFloat(e.target.value) || 0) : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.arete.trim() && !draft.registro.trim()) { setError('Captura la identificación (tatuaje) o el registro.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ ...draft, arete: draft.arete.trim() || draft.registro.trim() });
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally { setSaving(false); }
  };

  return (
    <Modal show={show} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><label className={label}>Identificación / tatuaje</label><input className={input} value={draft.arete} onChange={set('arete')} placeholder="PHIL-3543-F" /></div>
          <div className="space-y-2"><label className={label}>Registro UNO</label><input className={input} value={draft.registro} onChange={set('registro')} placeholder="UNO:220916MF-RP" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><label className={label}>Nombre</label><input className={input} value={draft.nombre} onChange={set('nombre')} /></div>
          <div className="space-y-2"><label className={label}>Sexo</label>
            <select className={input} value={draft.sexo} onChange={set('sexo')}><option>Macho</option><option>Hembra</option></select></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2"><label className={label}>Raza</label><input className={input} value={draft.raza} onChange={set('raza')} placeholder="DOR" /></div>
          <div className="space-y-2"><label className={label}>Pureza %</label><input type="number" min={0} max={100} step={0.01} className={input} value={draft.pureza} onChange={set('pureza')} /></div>
          <div className="space-y-2"><label className={label}>Grado</label>
            <select className={input} value={draft.grado_registro} onChange={set('grado_registro')}>{GRADOS_REGISTRO.map(g => <option key={g}>{g}</option>)}</select></div>
        </div>
        <p className="text-[11px] text-slate-400">Este animal no vive en el rancho: solo se usa para la genealogía y no cuenta en el inventario.</p>
        {error && <p className="text-sm font-bold text-rose-500">{error}</p>}
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-60 cursor-pointer">
          <Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </Modal>
  );
};

export type { main };
export default ReferenceAnimalModal;
