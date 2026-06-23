import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ALL_NAV_ITEMS } from '../../constants/navigation';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  role: string | null;
  isDark: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
}

export default function MobileDrawer({ isOpen, onClose, user, role, isDark, toggleTheme, onLogout }: MobileDrawerProps) {
  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const allowedNavItems = ALL_NAV_ITEMS.filter(item => 
    item.roles.includes(role || 'user')
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer Panel */}
      <div 
        className={`fixed inset-y-0 left-0 w-[280px] bg-bg-elevated text-text-primary shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-border shrink-0">
          <h1 className="text-lg font-bold text-brand-gold tracking-wide">Dallmayr SA</h1>
          <button 
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-white hover:bg-brand-border rounded-md transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose} // Auto-close drawer on navigation
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-base font-medium ${
                    isActive
                      ? 'bg-brand-gold text-white shadow-md'
                      : 'text-text-secondary hover:bg-brand-border/50 hover:text-brand-gold'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-brand-border shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-base font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
