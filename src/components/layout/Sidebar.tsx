import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { ALL_NAV_ITEMS } from '../../constants/navigation';
// @ts-ignore
import DallmayrLogoLight from '../../../assets/icon-512-light.png';
// @ts-ignore
import DallmayrLogoDark from '../../../assets/icon-512-dark.png';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();

  const userRole = role || 'user';
  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole));

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const getRoleBadgeColor = (r: string) => {
    switch (r) {
      case 'admin': return 'bg-slate-900 text-white dark:bg-white dark:text-slate-950';
      case 'ops_manager': return 'bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200';
      case 'finance': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200';
      case 'warehouse': return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200';
      case 'tech':
      case 'road_tech': return 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200';
      default: return 'bg-bg-muted text-text-secondary';
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-brand-border bg-bg-elevated shadow-subtle transition-all duration-300 ease-in-out md:flex ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`flex h-16 shrink-0 items-center border-b border-brand-border ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
        {isCollapsed ? (
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-brand-border bg-bg-canvas">
            <img
              src={isDark ? DallmayrLogoDark : DallmayrLogoLight}
              className="h-12 max-w-none"
              alt="Dallmayr"
            />
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={isDark ? DallmayrLogoDark : DallmayrLogoLight}
              className="h-12 w-auto object-contain"
              alt="Dallmayr South Africa"
            />
          </div>
        )}
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-50 rounded-full border border-brand-border bg-bg-elevated p-1 text-text-secondary shadow-elevated transition hover:scale-105 hover:text-brand-gold"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
      </button>

      <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 py-5">
        {!isCollapsed && (
          <div className="mb-3 px-3 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
            Operations
          </div>
        )}
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-md px-3 py-2.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-dallmayr-blue text-dallmayr-gold-light shadow-subtle dark:bg-dallmayr-gold dark:text-dallmayr-blue'
                    : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary'
                } ${isCollapsed ? 'justify-center' : 'justify-start'}`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={`shrink-0 transition-transform ${isActive ? 'stroke-[2.5px]' : 'group-hover:scale-105'}`} />
                  {!isCollapsed && (
                    <span className="truncate text-sm font-bold">
                      {item.name}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className={`shrink-0 border-t border-brand-border bg-bg-canvas p-4 ${isCollapsed ? 'items-center' : ''}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-brand-border bg-bg-elevated text-sm font-black uppercase text-text-primary">
            {user?.email?.charAt(0) || <UserIcon size={18} />}
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-text-primary" title={user?.email || 'User'}>
                {user?.email || 'User'}
              </p>
              <div className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${getRoleBadgeColor(userRole)}`}>
                {userRole.replace('_', ' ')}
              </div>
            </div>
          )}
        </div>

        <div className={`mt-4 flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between border-t border-brand-border pt-3'}`}>
          <button
            onClick={() => setIsDark(!isDark)}
            title="Toggle theme"
            className={`rounded-md text-text-secondary transition hover:bg-bg-muted hover:text-text-primary ${isCollapsed ? 'flex h-9 w-9 items-center justify-center' : 'p-2'}`}
          >
            {isDark ? <Sun size={16} strokeWidth={2.5} /> : <Moon size={16} strokeWidth={2.5} />}
          </button>

          <button
            onClick={handleLogout}
            title="Log out"
            className={`flex items-center gap-2 rounded-md text-text-secondary transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300 ${
              isCollapsed ? 'h-9 w-9 justify-center' : 'px-3 py-2 text-xs font-bold'
            }`}
          >
            <LogOut size={16} strokeWidth={2.5} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
