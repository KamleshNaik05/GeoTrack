import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  Map, 
  Users,
  Calendar, 
  AlertOctagon, 
  Locate, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  X 
} from 'lucide-react';

export default function Sidebar({ 
  isMobileOpen, 
  setIsMobileOpen, 
  isTabletExpanded, 
  setIsTabletExpanded 
}) {
  const { profile, signOut } = useAuth();
  
  if (!profile) return null;

  const isAdmin = profile.role === 'admin';

  // Navigation config
  const navItems = isAdmin 
    ? [
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/tracking', label: 'Live Tracking', icon: Map },
        { path: '/admin/trainees', label: 'Trainees', icon: Users },
        { path: '/admin/attendance', label: 'Attendance', icon: Calendar },
        { path: '/admin/alerts', label: 'Alerts', icon: AlertOctagon },
        { path: '/admin/geofence', label: 'Geofence Manager', icon: Locate },
      ]
    : [
        { path: '/trainee', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/trainee/attendance', label: 'My Attendance', icon: Calendar },
        { path: '/trainee/alerts', label: 'My Alerts', icon: AlertOctagon },
      ];

  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const activeClass = 'bg-white/15 text-white border-l-4 border-accent-400 rounded-r-md rounded-l-none font-medium';
  const inactiveClass = 'text-blue-100 hover:bg-white/10 hover:text-white rounded-md mx-2 transition-all-150';

  return (
    <>
      {/* 1. MOBILE DRAWER BACKDROP (Admin only, as trainee has bottom nav) */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      {/* 2. SIDEBAR CONTAINER */}
      <aside
        className={`fixed top-0 left-0 h-[100dvh] bg-primary-500 z-50 flex flex-col justify-between transition-all duration-300
          ${/* Mobile drawer behavior */''}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
          
          ${/* Tablet & Desktop width sizing */''}
          ${isTabletExpanded 
            ? 'md:w-[240px]' 
            : 'md:w-[64px] lg:w-[240px]'
          }
          w-[280px]
        `}
      >
        <div>
          {/* Header Area */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
            <div className={`flex flex-col truncate ${!isTabletExpanded ? 'md:hidden lg:flex' : 'flex'}`}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-white">GeoTrack</span>
                <span className="font-bold text-lg text-accent-400">RSP</span>
              </div>
              <span className="text-[10px] text-teal-300 tracking-wide font-medium">v1.0 · RMHP</span>
            </div>

            {/* Micro-logo for tablet icon mode */}
            <div className={`font-bold text-lg text-accent-400 mx-auto ${!isTabletExpanded ? 'hidden md:block lg:hidden' : 'hidden'}`}>
              GT
            </div>

            {/* Mobile close button */}
            <button 
              onClick={() => setIsMobileOpen(false)} 
              className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none"
            >
              <X size={20} />
            </button>

            {/* Tablet collapse/expand toggle button */}
            <button
              onClick={() => setIsTabletExpanded(!isTabletExpanded)}
              className={`hidden md:flex lg:hidden text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none ${!isTabletExpanded ? 'mx-auto' : ''}`}
            >
              {isTabletExpanded ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Section Divider */}
          <div className="mt-4 px-4 py-1">
            <span className={`text-[10px] text-blue-300 font-semibold uppercase tracking-wider block ${!isTabletExpanded ? 'md:hidden lg:block' : 'block'}`}>
              Monitoring
            </span>
            <div className={`border-b border-white/10 my-2 ${!isTabletExpanded ? 'md:block lg:hidden' : 'hidden'}`}></div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin' || item.path === '/trainee'}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) => 
                    `group relative flex items-center py-2 px-3 mx-2 text-sm ${
                      isActive ? activeClass : inactiveClass
                    }`
                  }
                >
                  <Icon size={20} className="shrink-0 group-hover:scale-105 transition-transform duration-150" />
                  
                  {/* Text Label */}
                  <span className={`ml-3 truncate transition-opacity duration-200 ${
                    !isTabletExpanded ? 'md:opacity-0 lg:opacity-100 md:w-0 lg:w-auto md:ml-0 lg:ml-3' : 'opacity-100'
                  }`}>
                    {item.label}
                  </span>

                  {/* Tablet Floating Tooltip */}
                  <span className={`absolute left-16 bg-primary-700 text-white text-xs px-2.5 py-1.5 rounded shadow-lg opacity-0 pointer-events-none transition-all duration-150 group-hover:opacity-100 whitespace-nowrap z-50
                    ${!isTabletExpanded ? 'md:group-hover:translate-x-1 lg:hidden' : 'hidden'}
                  `}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer / User Profile Area */}
        <div className="p-3 border-t border-white/10 bg-primary-600/30">
          <div className={`flex items-center justify-between gap-2 ${!isTabletExpanded ? 'md:flex-col md:gap-3 md:justify-center' : ''}`}>
            {/* Avatar Circle */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/10">
                {initials}
              </div>
              
              {/* User details */}
              <div className={`flex flex-col truncate transition-opacity duration-200 ${
                !isTabletExpanded ? 'md:opacity-0 lg:opacity-100 md:w-0 lg:w-auto md:ml-0' : 'opacity-100'
              }`}>
                <span className="text-xs font-semibold text-white truncate">{profile.full_name}</span>
                <span className="text-[10px] text-blue-300 truncate uppercase tracking-wider">{profile.role} · {profile.division || 'SAIL'}</span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={signOut}
              className={`p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors focus:outline-none ${
                !isTabletExpanded ? 'md:mx-auto lg:mx-0' : ''
              }`}
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
