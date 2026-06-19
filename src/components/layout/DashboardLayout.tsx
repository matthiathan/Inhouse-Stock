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
    <div className="flex min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-white/95 dark:bg-[#111] border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-gray-900 dark:text-white" size={24} />
            <h1 className="font-black text-lg tracking-tight">DALLMAYR</h1>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        navItems={navItems}
        user={user}
        role={role}
        isDark={isDark}
        toggleTheme={() => setIsDark(!isDark)}
        onLogout={logout}
      />
      
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />

      {/* Main Content Area */}
      <main 
        className={`flex-1 min-h-screen transition-all duration-300 ease-in-out pt-16 md:pt-0 ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Desktop Breadcrumb Header */}
        <div className="hidden md:flex h-16 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm sticky top-0 z-30 px-8 items-center justify-between">
          {generateBreadcrumbs()}
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500">
              Workspace
            </span>
          </div>
        </div>

        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
