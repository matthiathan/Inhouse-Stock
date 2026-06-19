import { NavLink } from 'react-router-dom';
import { X, ShieldCheck, User as UserIcon, LogOut, Sun, Moon } from 'lucide-react';

export default function MobileDrawer({ isOpen, onClose, navItems, user, role, isDark, toggleTheme, onLogout }: any) {
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[100] bg-white dark:bg-[#111111] flex flex-col md:hidden transition-colors duration-300">
      <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-gray-900 dark:text-white" size={24} />
          <div>
            <h1 className="font-black text-sm text-gray-900 dark:text-white leading-tight tracking-tight">DALLMAYR</h1>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Portal</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-hide">
        {navItems.map((item: any) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
                <span className={`text-base font-semibold ${isActive ? 'font-black tracking-tight' : ''}`}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02] space-y-4 pb-safe-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 shrink-0 shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold uppercase overflow-hidden">
            {user?.email?.charAt(0) || <UserIcon size={18} />}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-black text-gray-900 dark:text-white truncate">
              {user?.email || 'User'}
            </p>
            <div className={`mt-1 inline-flex text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md ${getRoleBadgeColor(role || 'user')}`}>
              {(role || 'user').replace('_', ' ')}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800/50">
           <button onClick={toggleTheme} className="p-3 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all font-bold">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
