import React, { useEffect } from 'react';
import { useStore } from '../../context/useStore';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function Snackbar() {
  const { notification, setNotification } = useStore();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000); // Auto-hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  if (!notification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center justify-between w-full max-w-sm p-4 bg-white rounded-lg shadow-xl ring-1 ring-black/5 animate-slide-in-right dropdown-animation">
      <div className="flex items-center gap-3">
        {notification.type === 'error' ? (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600">
            <AlertCircle size={20} />
          </div>
        ) : (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={20} />
          </div>
        )}
        <p className={twMerge(
          "text-sm font-medium",
          notification.type === 'error' ? "text-rose-800" : "text-emerald-800"
        )}>
          {notification.message}
        </p>
      </div>
      <button 
        onClick={() => setNotification(null)}
        className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-md p-1"
      >
        <X size={16} />
      </button>
    </div>
  );
}
