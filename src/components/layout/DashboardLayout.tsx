import { NavLink, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Package, Database, QrCode, Settings, BarChart3, LogOut, Sun, Moon, ShieldCheck, Map, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';

export default function DashboardLayout() {
  const { role, logout } = useAuth();
  
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

  const allNavItems = [
    { name: 'Stock', path: '/stock', icon: Package, roles: ['admin', 'ops_manager', 'warehouse'] },
    { name: 'Route Planner', path: '/route-planner', icon: Map, roles: ['admin', 'ops_manager'] },
    { name: 'My Route', path: '/my-route', icon: MapPin, roles: ['tech'] },
    { name: 'Assets', path: '/assets', icon: Database, roles: ['admin', 'ops_manager', 'warehouse', 'tech', 'user'] },
    { name: 'Scanner', path: '/scanner', icon: QrCode, roles: ['admin', 'ops_manager', 'warehouse', 'tech', 'user'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['admin', 'ops_manager'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'ops_manager'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-bg-base/95 border-b border-brand-border backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-brand-gold" size={24} />
          <h1 className="font-bold text-lg text-text-primary">Dallmayr SA</h1>
        </div>
         <button 
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg hover:bg-bg-elevated text-text-secondary transition-colors"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>
      
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:pl-64 min-h-screen pt-16 md:pt-0 pb-24 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar styled elegantly with safe-area support */}
      <nav 
        className="fixed bottom-0 left-0 right-0 md:hidden bg-bg-elevated border-t border-brand-border flex justify-around items-center z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] bg-opacity-95 backdrop-blur-md pt-2"
        style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 gap-1 text-center min-h-[44px] min-w-[64px] ${
                isActive
                  ? 'text-brand-gold font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-[10px] tracking-wide font-medium">{item.name}</span>
          </NavLink>
        ))}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 gap-1 text-center min-h-[44px] min-w-[64px] text-text-secondary hover:text-red-500"
        >
          <LogOut size={20} />
          <span className="text-[10px] tracking-wide font-medium">Log Out</span>
        </button>
      </nav>
    </div>
  );
}
