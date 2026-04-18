import React from 'react';
import { Plus } from 'lucide-react';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ show, onClose, title, children }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-slate-900 border border-white/10 w-full max-w-xl rounded-[40px] shadow-3xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
          <h3 className="text-xl font-black text-white font-serif italic">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-all">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        <div className="p-10">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
