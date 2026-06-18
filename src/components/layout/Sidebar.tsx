import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Database, 
  QrCode, 
  Settings, 
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  BarChart3,
  ClipboardList,
  Map,
  MapPin
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';

export default function Sidebar() {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();

  const userRole = role || 'user';

  const allNavItems = [
    { name: 'Stock', path: '/stock', icon: Package, roles: ['admin', 'ops_manager', 'warehouse'] },
    { name: 'Orders', path: '/orders', icon: ClipboardList, roles: ['admin', 'ops_manager', 'warehouse'] },
    { name: 'Route Planner', path: '/route-planner', icon: Map, roles: ['admin', 'ops_manager'] },
    { name: 'My Route', path: '/my-route', icon: MapPin, roles: ['tech'] },
    { name: 'Assets', path: '/assets', icon: Database, roles: ['admin', 'ops_manager', 'warehouse', 'tech', 'user'] },
    { name: 'Scanner', path: '/scanner', icon: QrCode, roles: ['admin', 'ops_manager', 'warehouse', 'tech', 'user'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['admin', 'ops_manager'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'ops_manager'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

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

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-bg-elevated border-r border-brand-border flex-col z-40">
      {/* Header */}
      <div className="p-6 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-brand-gold" size={32} />
          <div>
            <h1 className="font-bold text-lg text-text-primary leading-tight">Dallmayr SA</h1>
            <p className="text-xs text-text-secondary">Corporate Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-brand-gold text-white shadow-[0_4px_12px_rgba(197,160,89,0.3)] font-medium'
                  : 'text-text-secondary hover:bg-bg-base hover:text-text-primary'
              }`
            }
          >
            <item.icon size={20} />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-brand-border space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold">
            <UserIcon size={20} />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-text-primary truncate">{user?.email || 'User'}</p>
            <p className="text-xs text-text-secondary uppercase font-semibold font-mono tracking-wider">{role || 'Standard User'}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg hover:bg-bg-base text-text-secondary transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-600 transition-colors text-sm">
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </div>
    </aside>
  );
}
