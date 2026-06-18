import { NavLink } from 'react-router-dom';
import { X, ShieldCheck, User as UserIcon, LogOut, Sun, Moon } from 'lucide-react';

export default function MobileDrawer({ isOpen, onClose, navItems, user, role, isDark, toggleTheme, onLogout }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-bg-base flex flex-col md:hidden">
      <div className="p-6 flex items-center justify-between border-b border-brand-border">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-brand-gold" size={24} />
          <h1 className="font-bold text-lg text-text-primary">Dallmayr SA</h1>
        </div>
        <button onClick={onClose} className="p-2 text-text-secondary"><X size={24} /></button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item: any) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-4 rounded-lg transition-colors ${
                isActive ? 'bg-brand-gold text-white font-medium' : 'text-text-secondary'
              }`
            }
          >
            <item.icon size={20} />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-brand-border space-y-4">
        <div className="flex items-center justify-between">
           <button onClick={toggleTheme} className="p-2 text-text-secondary">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 text-red-500 font-semibold">
            <LogOut size={20} /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
