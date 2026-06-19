import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, User as UserIcon, LogOut, Sun, Moon } from 'lucide-react';
import { User, AppRole } from '../../types';
// @ts-ignore
import DallmayrLogo from '@/assets/dallmayr_logo.svg';

export interface MobileDrawerNavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: MobileDrawerNavItem[];
  user: User | null;
  role: AppRole | null;
  isDark: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
}

export default function MobileDrawer({ isOpen, onClose, navItems, user, role, isDark, toggleTheme, onLogout }: MobileDrawerProps) {
  if (!isOpen) return null;

  const getRoleBadgeColor = (r: string) => {
    switch (r) {
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
      case 'ops_manager': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300';
      case 'finance': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
      case 'warehouse': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
      case 'tech': 
      case 'road_tech': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-bg-elevated flex flex-col md:hidden transition-colors duration-300">
      <div className="p-4 flex items-center justify-between border-b border-brand-border">
        <div className="flex items-center gap-3">
          <img 
            src={DallmayrLogo} 
            className="h-10 w-auto filter drop-shadow-xs" 
            alt="Dallmayr South Africa" 
          />
        </div>
        <button onClick={onClose} className="p-2 text-text-secondary hover:bg-dallmayr-blue/5 dark:hover:bg-dallmayr-gold/5 rounded-lg">
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-hide">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-dallmayr-blue text-dallmayr-gold-light dark:bg-dallmayr-gold dark:text-dallmayr-blue shadow-md font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dallmayr-blue/5 dark:hover:bg-dallmayr-gold/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
                <span className={`text-base font-semibold ${isActive ? 'font-black tracking-tight' : ''}`}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-brand-border bg-dallmayr-blue/[0.02] dark:bg-dallmayr-gold/[0.01] space-y-4 pb-safe-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 shrink-0 shadow-sm border border-brand-border rounded-xl bg-bg-elevated flex items-center justify-center text-text-primary font-bold uppercase overflow-hidden">
            {user?.email?.charAt(0) || <UserIcon size={18} />}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-black text-text-primary truncate">
              {user?.email || 'User'}
            </p>
            <div className={`mt-1 inline-flex text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md ${getRoleBadgeColor(role || 'user')}`}>
              {(role || 'user').replace('_', ' ')}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-brand-border">
           <button onClick={toggleTheme} className="p-3 text-text-secondary hover:text-text-primary hover:bg-dallmayr-blue/5 dark:hover:bg-dallmayr-gold/5 rounded-xl transition-all">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-text-secondary hover:text-red-650 transition-all font-bold">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
