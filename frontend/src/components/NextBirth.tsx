import React from 'react';

interface NextBirthProps {
  id: string;
  date: string;
  progress: number;
}

const NextBirth: React.FC<NextBirthProps> = ({ id, date, progress }) => {
  const percentage = Math.min(100, (progress / 150) * 100);
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
       <div className="flex justify-between text-xs font-black text-slate-800 dark:text-white mb-2">
         <span>{id}</span>
         <span className="text-slate-500 dark:text-slate-400">{date}</span>
       </div>
       <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
         <div className="h-full bg-emerald-500 dark:bg-emerald-600" style={{ width: `${percentage}%` }} />
       </div>
    </div>
  );
};

export default NextBirth;
