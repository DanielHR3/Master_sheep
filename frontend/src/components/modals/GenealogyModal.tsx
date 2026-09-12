import React, { useEffect, useState } from 'react';
import { FileDown, Plus, Pencil, Network } from 'lucide-react';
import Modal from '../shared/Modal';
import { main } from '../../../wailsjs/go/models';
import { GetPedigree, AddAnimal, UpdateAnimal, DownloadFicha } from '../../services/api';
import ReferenceAnimalModal, { ReferenceDraft } from './ReferenceAnimalModal';

interface GenealogyModalProps {
  show: boolean;
  onClose: () => void;
  animal: main.Animal | null;
  animals: main.Animal[];
  theme: string;
  onChanged?: () => void;      // refrescar el inventario tras crear/editar referencias
  notify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

type Slot = { node?: main.PedigreeNode; parent?: main.PedigreeNode; side: 'padre' | 'madre' };
const GEN_TITLES = ['Padres', 'Abuelos', 'Bisabuelos', 'Tatarabuelos'];

// Aplana el árbol en 4 columnas de 2, 4, 8 y 16 ranuras (padre arriba, madre abajo).
function columns(root: main.PedigreeNode | null): Slot[][] {
  const cols: Slot[][] = [];
  let level: Slot[] = [{ node: root?.padre, parent: root || undefined, side: 'padre' }, { node: root?.madre, parent: root || undefined, side: 'madre' }];
  for (let g = 0; g < 4; g++) {
    cols.push(level);
    const next: Slot[] = [];
    level.forEach(s => {
      next.push({ node: s.node?.padre, parent: s.node, side: 'padre' });
      next.push({ node: s.node?.madre, parent: s.node, side: 'madre' });
    });
    level = next;
  }
  return cols;
}

const GenealogyModal: React.FC<GenealogyModalProps> = ({ show, onClose, animal, theme, onChanged, notify }) => {
  const isDark = theme === 'dark';
  const [tree, setTree] = useState<main.PedigreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ slot: Slot; title: string; initial: ReferenceDraft | null } | null>(null);

  const load = async () => {
    if (!animal) return;
    setLoading(true);
    try { setTree(await GetPedigree(animal.id)); } catch (e: any) { notify?.('No se pudo cargar la genealogía: ' + (e?.message || e), 'error'); } finally { setLoading(false); }
  };
  useEffect(() => { if (show) load(); else setTree(null); /* eslint-disable-next-line */ }, [show, animal?.id]);

  if (!animal) return null;

  const openAdd = (slot: Slot) => {
    const who = slot.side === 'padre' ? 'padre' : 'madre';
    const of = slot.parent?.arete || animal.arete;
    setEditing({ slot, title: `Agregar ${who} de ${of}`, initial: { arete: '', nombre: '', registro: '', grado_registro: 'SI', raza: animal.raza || 'Dorper', pureza: 100, sexo: slot.side === 'padre' ? 'Macho' : 'Hembra' } });
  };
  const openEdit = (slot: Slot) => {
    const n = slot.node!;
    setEditing({ slot, title: `Editar ${n.arete}`, initial: { id: n.id, arete: n.arete, nombre: n.nombre, registro: n.registro, grado_registro: n.grado_registro, raza: n.raza, pureza: n.pureza, sexo: n.sexo } });
  };

  // Guardar referencia: crea (o actualiza) el animal de referencia y enlaza
  // al hijo por arete. Si el "hijo" es un nodo de texto (sin registro), no
  // se puede enlazar: se pide capturar primero al padre como referencia.
  const saveReference = async (d: ReferenceDraft) => {
    const slot = editing!.slot;
    if (d.id) {
      const current = await findFull(d.id);
      await UpdateAnimal(main.Animal.createFrom({ ...current, arete: d.arete, nombre: d.nombre, registro: d.registro, grado_registro: d.grado_registro, raza: d.raza, pureza: d.pureza, sexo: d.sexo }));
    } else {
      const child = slot.parent;
      if (!child || !child.existe || !child.id) throw new Error('Primero captura este ancestro como referencia (usa "Agregar" en su propio nodo) para poder colgarle padres.');
      await AddAnimal(main.Animal.createFrom({ id: '', arete: d.arete, nombre: d.nombre, registro: d.registro, grado_registro: d.grado_registro, raza: d.raza, pureza: d.pureza, sexo: d.sexo, es_referencia: true, especie: 'Ovino', destino: 'Pie de Cría', estatus: 'Referencia' }));
      const childFull = await findFull(child.id);
      await UpdateAnimal(main.Animal.createFrom({ ...childFull, [slot.side === 'padre' ? 'padre_id' : 'madre_id']: d.arete }));
    }
    setEditing(null);
    notify?.('Genealogía actualizada', 'success');
    onChanged?.();
    await load();
  };

  // Lee el animal completo (inventario o referencia) para no perder campos al actualizar.
  const findFull = async (id: string): Promise<main.Animal> => {
    const { GetAnimales, GetAnimalesReferencia } = await import('../../services/api');
    const [inv, refs] = await Promise.all([GetAnimales(), GetAnimalesReferencia()]);
    const found = [...(inv || []), ...(refs || [])].find(a => a.id === id);
    if (!found) throw new Error('Animal no encontrado');
    return found;
  };

  const downloadFicha = async () => {
    try {
      const path = await DownloadFicha(animal.id, animal.arete);
      notify?.(path ? `Ficha guardada en ${path}` : 'Ficha descargada', 'success');
    } catch (e: any) { notify?.('No se pudo generar la ficha: ' + (e?.message || e), 'error'); }
  };

  const cols = columns(tree);
  const box = (dark: boolean) => dark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800';

  return (
    <Modal show={show} onClose={onClose} title={`Genética: ${animal.arete}`} wide>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isDark ? 'bg-cyan-900/30 border-cyan-500/40 text-cyan-100' : 'bg-cyan-50 border-cyan-300 text-cyan-900'}`}>
          {animal.foto ? <img src={animal.foto} alt="" className="w-10 h-10 rounded-full object-cover" /> : <Network size={18} className="text-cyan-500" />}
          <div>
            <p className="font-black text-sm">{animal.arete} {animal.nombre ? `· ${animal.nombre}` : ''}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{[animal.raza, animal.registro, animal.tipo_parto && `Parto ${animal.tipo_parto}`, animal.metodo_concepcion, animal.tipo_nacimiento && `Nac. ${animal.tipo_nacimiento}`].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {(animal.especie || 'Ovino') === 'Ovino' && (
          <button onClick={downloadFicha} className="flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-white cursor-pointer">
            <FileDown size={16} /> Ficha PDF
          </button>
        )}
      </div>

      {loading && <p className="text-xs text-slate-400 mb-2">Cargando árbol…</p>}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-4 gap-3 min-w-[760px]">
          {cols.map((col, g) => (
            <div key={g} className="flex flex-col">
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{GEN_TITLES[g]}</p>
              <div className="flex-1 flex flex-col justify-around gap-1">
                {col.map((slot, i) => {
                  const n = slot.node;
                  const canAdd = !!slot.parent && (slot.parent.existe || slot.parent === tree);
                  return (
                    <div key={i} className={`rounded-xl border px-2 py-1.5 text-left ${box(isDark)} ${n ? '' : 'border-dashed opacity-80'}`} style={{ fontSize: g >= 2 ? 10 : 11 }}>
                      {n ? (
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="font-black truncate">{n.registro || n.arete}{n.grado_registro ? ` // ${n.grado_registro}` : ''}</p>
                            <p className="truncate opacity-80">{(n.nombre || n.arete)}{n.raza ? ` // ${n.raza}${n.pureza ? ` ${n.pureza}%` : ''}` : ''}</p>
                            {!n.existe && <p className="text-[9px] text-amber-500 font-bold">Sin registro</p>}
                          </div>
                          {n.existe && n.es_referencia && (
                            <button title="Editar ancestro" onClick={() => openEdit(slot)} className="shrink-0 p-1 rounded-lg hover:bg-slate-500/20 cursor-pointer"><Pencil size={12} /></button>
                          )}
                        </div>
                      ) : (
                        canAdd ? (
                          <button onClick={() => openAdd(slot)} className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-black uppercase text-emerald-500 hover:text-emerald-400 cursor-pointer">
                            <Plus size={12} /> Agregar
                          </button>
                        ) : <span className="block text-center text-[10px] text-slate-400">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[11px] text-slate-400">Los ancestros que no viven en el rancho se guardan como referencias: captura una vez el certificado del semental y sus crías heredan el árbol.</p>

      <ReferenceAnimalModal show={!!editing} title={editing?.title || ''} initial={editing?.initial || null} onClose={() => setEditing(null)} onSave={saveReference} />
    </Modal>
  );
};

export default GenealogyModal;
