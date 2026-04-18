import React from 'react';
import { 
  Compass, 
  Users, 
  ClipboardList, 
  Stethoscope, 
  CircleUser 
} from 'lucide-react';
import MobileNavItem from '../MobileNavItem';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: string;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, theme }) => {
  return (
    <div className={`fixed bottom-0 left-0 right-0 h-24 lg:hidden z-50 border-t flex justify-around items-center px-6 transition-all ${
      theme === 'dark' ? 'bg-slate-950/80 border-white/5 backdrop-blur-xl' : 'bg-white/80 border-antique-brass/10 backdrop-blur-xl'
    }`}>
      <MobileNavItem icon={<Compass size={24} />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
      <MobileNavItem icon={<Users size={24} />} active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
      <MobileNavItem icon={<ClipboardList size={24} />} active={activeTab === 'breeding'} onClick={() => setActiveTab('breeding')} />
      <MobileNavItem icon={<Stethoscope size={24} />} active={activeTab === 'clinical'} onClick={() => setActiveTab('clinical')} />
      <MobileNavItem icon={<CircleUser size={24} />} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
    </div>
  );
};

export default MobileNav;
