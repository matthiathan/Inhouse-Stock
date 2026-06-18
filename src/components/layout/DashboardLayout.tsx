import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import { 
  ShieldCheck, 
  Menu
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';

import { ALL_NAV_ITEMS } from '../../constants/navigation';

export default function DashboardLayout() {
  const { role, logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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

  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-bg-base/95 border-b border-brand-border backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-brand-gold" size={24} />
            <h1 className="font-bold text-lg text-text-primary">Dallmayr SA</h1>
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
      
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:pl-64 min-h-screen pt-16 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
