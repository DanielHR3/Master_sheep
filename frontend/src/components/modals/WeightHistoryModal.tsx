import React from 'react';
import Modal from '../shared/Modal';

interface WeightHistoryModalProps {
  show: boolean;
  onClose: () => void;
  selectedAnimal: any;
  history: any[];
}

const WeightHistoryModal: React.FC<WeightHistoryModalProps> = ({ 
  show, 
  onClose, 
  selectedAnimal, 
  history 
}) => {
  return (
    <Modal show={show} onClose={onClose} title={`Historial de Crecimiento - ${selectedAnimal?.arete}`}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((w, idx) => (
              <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-white font-bold text-xl">{w.peso} kg</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black">{new Date(w.fecha).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-center text-slate-500 py-10">No hay registros de peso.</p>}
      </div>
    </Modal>
  );
};

export default WeightHistoryModal;
