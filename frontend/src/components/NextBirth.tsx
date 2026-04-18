import React from 'react';

interface NextBirthProps {
  id: string;
  date: string;
  progress: number;
}

const NextBirth: React.FC<NextBirthProps> = ({ id, date, progress }) => {
  const percentage = Math.min(100, (progress / 150) * 100);
  return (
    <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5">
       <div className="flex justify-between text-xs font-black text-white mb-2">
         <span>{id}</span>
         <span className="text-6666-cream">{date}</span>
       </div>
       <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
         <div className="h-full bg-6666-maroon" style={{ width: `${percentage}%` }} />
       </div>
    </div>
  );
};

export default NextBirth;
