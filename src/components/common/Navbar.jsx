import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar({ onMenuClick, pageTitle }) {
  const { profile } = useAuth();
  
  if (!profile) return null;
  const isAdmin = profile.role === 'admin';
  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <header className="fixed top-0 left-0 right-0 h-[56px] bg-primary-500 z-30 flex items-center justify-between px-4 md:hidden text-white shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-150 focus:outline-none flex items-center justify-center min-w-[44px] min-h-[44px]"
          title="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-sm font-semibold tracking-wide text-white truncate">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Simple Notification indicator */}
        <div className="relative p-1 text-blue-200 hover:text-white transition-colors cursor-pointer">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full pulse-dot"></span>
        </div>

        {/* Initials Circle */}
        <div className="w-8 h-8 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center border border-white/10 shrink-0 select-none">
          {initials}
        </div>
      </div>
    </header>
  );
}
