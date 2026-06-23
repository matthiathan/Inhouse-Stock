import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import { 
  ShieldCheck, 
  Menu,
  ChevronRight,
  Home
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';

import { ALL_NAV_ITEMS } from '../../constants/navigation';
import { ScannerTrigger } from '../scanner/ScannerTrigger';

export default function DashboardLayout() {
  const { role, logout, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const userRole = role || 'user';

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

  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole));

  // Access Control / Routing Guard
  // Determine if the current path is completely forbidden for this role
  let isForbidden = false;
  // Let's find the matching parent route in ALL_NAV_ITEMS
  const matchedBaseItem = ALL_NAV_ITEMS.find(item => location.pathname.startsWith(item.path));
  if (matchedBaseItem) {
    if (!matchedBaseItem.roles.includes(userRole)) {
      isForbidden = true;
    }
  }

  if (isForbidden) {
    // Redirect to the first available dashboard screen for their role
    return <Navigate to={navItems[0]?.path || '/'} replace />;
  }

  if (location.pathname === '/' && navItems.length > 0 && navItems[0].path !== '/') {
    return <Navigate to={navItems[0].path} replace />;
  }

  // Dynamic Breadcrumb computation
  const generateBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return null;

    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <Home size={14} className="shrink-0" />
        {paths.map((p, idx) => {
          const isLast = idx === paths.length - 1;
          const formatted = p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return (
            <div key={idx} className="flex items-center gap-2">
              <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
              <span className={isLast ? 'text-gray-900 dark:text-white font-bold' : ''}>
                {formatted}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden font-sans text-text-primary">
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-64 md:flex-shrink-0 border-r border-border-subtle bg-bg-elevated">
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      </div>

      {/* Mobile Drawer Overlay (Hidden on Desktop) */}
      <MobileDrawer 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        role={role}
        isDark={isDark}
        toggleTheme={() => setIsDark(!isDark)}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 w-full min-w-0 overflow-hidden">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-bg-elevated border-b border-border-subtle z-10 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-text-primary" size={24} />
            <span className="font-bold text-lg tracking-wider">DALLMAYR</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-text-secondary hover:text-brand-gold hover:bg-bg-base rounded-md transition-colors"
            aria-label="Open mobile menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-bg-base">
          {/* Desktop Breadcrumb Header */}
            <div className="hidden md:flex h-16 border-b border-border-subtle bg-bg-elevated sticky top-0 z-30 px-8 items-center justify-between">
              {generateBreadcrumbs()}
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-text-secondary">
                  Workspace
                </span>
              </div>
            </div>

          <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
            <Outlet />
          </div>
          <ScannerTrigger />
        </main>
      </div>
    </div>
  );
}
