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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-xl rounded-[40px] shadow-3xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
          <h3 className="text-xl font-black font-serif italic text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-250 dark:hover:bg-white/10 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        <div className="p-10">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
