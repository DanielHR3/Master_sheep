import React from 'react';

interface MobileNavItemProps {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({ icon, active, onClick }) => {
  return (
    <button 
      onClick={onClick} 
      className={`p-4 rounded-2xl transition-all duration-300 cursor-pointer ${
        active 
          ? 'bg-antique-brass text-white shadow-lg shadow-antique-brass/20 scale-110' 
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
      }`}
    >
      {icon}
    </button>
  );
};

export default MobileNavItem;
