import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, Moon, Sun, X } from 'lucide-react';
import { ALL_NAV_ITEMS } from '../../constants/navigation';
import { normalizeRole } from '../../lib/permissions';
import { AppRole } from '../../types';
// @ts-ignore
import DallmayrLogoLight from '../../../assets/icon-512-light.png';
// @ts-ignore
import DallmayrLogoDark from '../../../assets/icon-512-dark.png';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  role: AppRole | string | null;
  isDark: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
}

export default function MobileDrawer({ isOpen, onClose, user, role, isDark, toggleTheme, onLogout }: MobileDrawerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const userRole = normalizeRole(role);
  const allowedNavItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole));

  const handleLogout = async () => {
    await onLogout();
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[304px] max-w-[86vw] flex-col border-r border-brand-border bg-bg-elevated text-text-primary shadow-elevated transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-brand-border p-4">
          <img
            src={isDark ? DallmayrLogoDark : DallmayrLogoLight}
            alt="Dallmayr South Africa"
            className="h-12 w-auto object-contain"
          />
          <button
            onClick={onClose}
            className="rounded-md border border-brand-border bg-bg-elevated p-2 text-text-secondary transition hover:text-brand-gold"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-brand-border bg-bg-canvas px-4 py-3">
          <p className="truncate text-sm font-black">{user?.email || 'User'}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            {userRole.replace('_', ' ')}
          </p>
        </div>

        <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-dallmayr-blue text-dallmayr-gold-light shadow-subtle'
                        : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-brand-border bg-bg-canvas p-4">
          <button
            onClick={toggleTheme}
            className="mb-2 flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-text-secondary transition hover:bg-bg-muted hover:text-text-primary"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
