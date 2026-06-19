import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { ALL_NAV_ITEMS } from '../../constants/navigation';
// @ts-ignore
import DallmayrLogo from '@/assets/dallmayr_logo.svg';

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
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
      case 'ops_manager': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300';
      case 'finance': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
      case 'warehouse': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
      case 'tech': 
      case 'road_tech': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300';
    }
  };

  return (
    <aside 
      className={`hidden md:flex fixed left-0 top-0 h-screen bg-bg-elevated border-r border-brand-border flex-col z-40 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center h-16 border-b border-brand-border ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
        <div className="flex items-center gap-3 overflow-hidden w-full justify-center">
          {isCollapsed ? (
            /* Royal Crest crop on Collapsed Side */
            <div className="w-10 h-10 overflow-hidden relative flex items-center justify-center shrink-0">
              <img 
                src={DallmayrLogo} 
                className="max-w-none h-10 absolute left-0" 
                style={{ left: '-2.5px' }}
                alt="Dallmayr Crest" 
              />
            </div>
          ) : (
            /* Full Premium Dallmayr South Africa Identity Logo */
            <img 
              src={DallmayrLogo} 
              className="h-10 w-auto max-w-full object-contain filter drop-shadow-sm transition-all duration-300"
              alt="Dallmayr South Africa" 
            />
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-bg-elevated border border-brand-border rounded-full p-1 text-text-secondary hover:text-brand-gold z-50 hover:scale-110 shadow-md transition-all"
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5 scrollbar-hide">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={isCollapsed ? item.name : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group overflow-hidden ${
                isActive
                  ? 'bg-dallmayr-blue text-dallmayr-gold-light dark:bg-dallmayr-gold dark:text-dallmayr-blue font-bold shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dallmayr-blue/5 dark:hover:bg-dallmayr-gold/5'
              } ${isCollapsed ? 'justify-center' : 'justify-start'}`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={`shrink-0 transition-all ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px] group-hover:scale-110'}`} />
                {!isCollapsed && (
                  <span className={`text-sm font-semibold whitespace-nowrap transition-opacity duration-300 ${isActive ? 'font-bold tracking-tight' : ''}`}>
                    {item.name}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Pinned User Section */}
      <div className={`p-4 border-t border-brand-border bg-dallmayr-blue/[0.02] dark:bg-dallmayr-gold/[0.01] flex flex-col gap-4 ${isCollapsed ? 'items-center' : ''}`}>
        
        {/* User Info */}
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 shrink-0 shadow-sm border border-brand-border rounded-xl bg-bg-elevated flex items-center justify-center text-text-primary font-bold uppercase overflow-hidden">
            {user?.email?.charAt(0) || <UserIcon size={18} />}
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs font-black text-text-primary truncate" title={user?.email || 'User'}>
                {user?.email || 'User'}
              </p>
              <div className={`mt-0.5 inline-flex text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-md ${getRoleBadgeColor(userRole)}`}>
                {userRole.replace('_', ' ')}
              </div>
            </div>
          )}
        </div>
        
        {/* Actions Menu */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3' : 'justify-between pt-2 border-t border-brand-border'}`}>
          <button 
            onClick={() => setIsDark(!isDark)}
            title="Toggle Theme"
            className={`p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-dallmayr-blue/5 dark:hover:bg-dallmayr-gold/5 transition-all ${isCollapsed ? 'w-full flex justify-center' : ''}`}
          >
            {isDark ? <Sun size={16} strokeWidth={2.5} /> : <Moon size={16} strokeWidth={2.5} />}
          </button>
          
          <button 
            onClick={handleLogout} 
            title="Log Out"
            className={`flex items-center gap-2 rounded-lg text-text-secondary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all ${
              isCollapsed ? 'p-2 w-full justify-center' : 'px-3 py-2 text-xs font-bold'
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

