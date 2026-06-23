import React, { useState } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import SosHoldButton from './SosHoldButton';
import { LayoutDashboard, Calendar, AlertOctagon } from 'lucide-react';

export default function Layout() {
  const { profile, loading } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTabletExpanded, setIsTabletExpanded] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-surface">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mx-auto"></div>
          <span className="text-xs text-gray-550 font-medium">Connecting session...</span>
        </div>
      </div>
    );
  }

  // If not logged in, render child route (which will redirect to Login)
  if (!profile) return <Outlet />;

  const isTrainee = profile.role === 'trainee';

  // Dynamic titles based on pathname
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/tracking')) return 'Live Operations Map';
    if (path.includes('/attendance')) return 'Trainee Attendance Logs';
    if (path.includes('/alerts')) return 'Security & SOS Alerts';
    if (path.includes('/geofence')) return 'Geofences Control Panel';
    return 'Dashboard';
  };

  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col font-sans select-none">
      {/* 1. Mobile top Navbar (below 768px) */}
      <Navbar 
        onMenuClick={() => setIsMobileOpen(true)} 
        pageTitle={getPageTitle()} 
      />

      <div className="flex flex-1 relative">
        {/* 2. Responsive Sidebar
            For admins: Sidebar shows on desktop, collapses on tablet, drawer-slides on mobile.
            For trainees: Sidebar shows on desktop, collapses on tablet, hidden completely on mobile.
        */}
        <Sidebar 
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          isTabletExpanded={isTabletExpanded}
          setIsTabletExpanded={setIsTabletExpanded}
        />

        {/* 3. Main content panel */}
        <main
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300
            ${/* Mobile top header padding */''}
            pt-[56px] md:pt-0
            
            ${/* Left offset on tablet (64px) and desktop (lg: 240px) */''}
            md:ml-[64px] lg:ml-[240px]
            
            ${/* Bottom navigation padding for mobile trainees */''}
            ${isTrainee ? 'pb-[64px] md:pb-0' : ''}
          `}
        >
          {/* Constrain horizontal width to avoid stretch on extra wide monitors */}
          <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 4. SOS Mobile Floating Action Button */}
      {isTrainee && (
        <SosHoldButton isMobileFAB={true} />
      )}

      {/* 5. Trainee Mobile Bottom Navigation Bar (below 768px) */}
      {isTrainee && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-white border-t border-gray-200 flex justify-around items-center z-30 shadow-md">
          <NavLink
            to="/trainee"
            end
            className={({ isActive }) => 
              `flex flex-col items-center justify-center w-full h-full text-[10px] font-semibold transition-colors duration-150 ${
                isActive ? 'text-primary-500' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard size={18} fill={isActive ? "currentColor" : "none"} />
                <span className="mt-0.5">Dashboard</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/trainee/attendance"
            className={({ isActive }) => 
              `flex flex-col items-center justify-center w-full h-full text-[10px] font-semibold transition-colors duration-150 ${
                isActive ? 'text-primary-500' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Calendar size={18} fill={isActive ? "currentColor" : "none"} />
                <span className="mt-0.5">Attendance</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/trainee/alerts"
            className={({ isActive }) => 
              `flex flex-col items-center justify-center w-full h-full text-[10px] font-semibold transition-colors duration-150 ${
                isActive ? 'text-primary-500' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <AlertOctagon size={18} fill={isActive ? "currentColor" : "none"} />
                <span className="mt-0.5">Alerts</span>
              </>
            )}
          </NavLink>
        </nav>
      )}
    </div>
  );
}
