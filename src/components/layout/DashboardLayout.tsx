import { NavLink, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Package, Database, QrCode, Settings } from 'lucide-react';

export default function DashboardLayout() {
  const navItems = [
    { name: 'Stock', path: '/stock', icon: Package },
    { name: 'Assets', path: '/assets', icon: Database },
    { name: 'Scanner', path: '/scanner', icon: QrCode },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 md:pl-64 min-h-screen pb-20 md:pb-0">
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
      </nav>
    </div>
  );
}
