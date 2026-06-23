import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  ChevronRight,
  Home,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import { useAuth } from '../../hooks/useAuth';
import { ALL_NAV_ITEMS } from '../../constants/navigation';
import { ScannerTrigger } from '../scanner/ScannerTrigger';

export default function DashboardLayout() {
  const { role, logout, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const userRole = role || 'user';
  const roleLabel = userRole.replace(/_/g, ' ');

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

  const navItems = useMemo(
    () => ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole)),
    [userRole],
  );

  const matchedBaseItem = useMemo(
    () => ALL_NAV_ITEMS.find(item => location.pathname.startsWith(item.path)),
    [location.pathname],
  );

  const mobileNavItems = useMemo(() => {
    const preferredPathsByRole: Record<string, string[]> = {
      admin: ['/warehouse', '/dispatch', '/scanner', '/analytics'],
      ops_manager: ['/warehouse', '/dispatch', '/scanner', '/analytics'],
      warehouse: ['/warehouse', '/orders', '/fulfillment', '/scanner'],
      tech: ['/my-route', '/scanner', '/assets'],
      road_tech: ['/my-route', '/scanner', '/assets'],
      finance: ['/tasks'],
      user: ['/scanner', '/assets'],
    };

    const preferredPaths = preferredPathsByRole[userRole] || ['/scanner', '/assets'];
    return preferredPaths
      .map(path => navItems.find(item => item.path === path))
      .filter(Boolean)
      .slice(0, 4);
  }, [navItems, userRole]);

  if (matchedBaseItem && !matchedBaseItem.roles.includes(userRole)) {
    return <Navigate to={navItems[0]?.path || '/'} replace />;
  }

  if (location.pathname === '/' && navItems.length > 0 && navItems[0].path !== '/') {
    return <Navigate to={navItems[0].path} replace />;
  }

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentTitle = matchedBaseItem?.name || pathSegments.at(-1)?.replace(/-/g, ' ') || 'Workspace';

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base font-sans text-text-primary">
      <div className={`hidden flex-shrink-0 transition-[width] duration-300 md:block ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      </div>

      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        role={role}
        isDark={isDark}
        toggleTheme={() => setIsDark(!isDark)}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-brand-border bg-bg-elevated/95 px-4 backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-dallmayr-blue text-dallmayr-gold-light">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">Dallmayr SA</p>
              <p className="truncate text-[11px] font-semibold uppercase text-text-secondary">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-md border border-brand-border bg-bg-elevated p-2 text-text-secondary transition hover:text-brand-gold"
            aria-label="Open mobile menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="relative flex-1 overflow-y-auto overflow-x-hidden bg-bg-base">
          <div className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-brand-border bg-bg-elevated/92 px-8 backdrop-blur md:flex">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                <Home size={13} className="shrink-0" />
                {pathSegments.map((segment, idx) => {
                  const label = segment.replace(/-/g, ' ');
                  return (
                    <span key={`${segment}-${idx}`} className="flex min-w-0 items-center gap-2">
                      <ChevronRight size={13} className="shrink-0 text-border-hover" />
                      <span className="truncate">{label}</span>
                    </span>
                  );
                })}
              </div>
              <h1 className="truncate text-lg font-black capitalize text-text-primary">{currentTitle}</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200 lg:flex">
                <Activity size={15} />
                Live
              </div>
              <button
                type="button"
                aria-label="Notifications"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-brand-border bg-bg-elevated text-text-secondary transition hover:text-brand-gold"
              >
                <Bell size={17} />
              </button>
              <div className="flex min-w-[180px] items-center gap-3 rounded-md border border-brand-border bg-bg-canvas px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-dallmayr-blue text-xs font-black uppercase text-dallmayr-gold-light">
                  {user?.email?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-text-primary">{user?.email || 'User'}</p>
                  <p className="truncate text-[10px] font-bold uppercase tracking-widest text-text-secondary">{roleLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1500px] px-4 py-5 pb-28 md:px-6 md:pb-5 lg:px-8">
            <Outlet />
          </div>
          <ScannerTrigger />
        </main>

        {mobileNavItems.length > 0 && (
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-bg-elevated/96 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-elevated backdrop-blur md:hidden">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${mobileNavItems.length}, minmax(0, 1fr))` }}>
              {mobileNavItems.map((item) => {
                if (!item) return null;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-black transition ${
                        isActive
                          ? 'bg-dallmayr-blue text-dallmayr-gold-light'
                          : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary'
                      }`
                    }
                  >
                    <item.icon size={19} strokeWidth={2.4} />
                    <span className="max-w-full truncate">{item.name.replace('Dispatch & Routing', 'Dispatch').replace('Service Tasks Monitor', 'Tasks')}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
