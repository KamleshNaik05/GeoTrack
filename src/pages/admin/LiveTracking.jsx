import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../hooks/useRealtime';
import AlertBadge from '../../components/common/AlertBadge';
import { formatTimestamp } from '../../lib/locationUtils';
import { MapSkeleton } from '../../components/common/LoadingSpinner';
import { Search, ChevronLeft, ChevronRight, Menu, MapPin, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LiveMap = React.lazy(() => import('../../components/map/LiveMap'));

export default function LiveTracking() {
  const [trainees, setTrainees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [zones, setZones] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTraineeId, setActiveTraineeId] = useState(null);
  
  // Panel state
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024); // Desktop/Tablet toggle
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false); // Mobile bottom sheet

  const loadTrackingData = useCallback(async () => {
    try {
      // 1. Fetch Trainees
      const { data: traineeProfiles, error: tErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainee');
      
      if (tErr) throw tErr;

      // 2. Fetch Locations
      const { data: locs, error: lErr } = await supabase
        .from('locations')
        .select('*');

      if (lErr) throw lErr;

      // 3. Fetch Geofence Zones
      const { data: geofences, error: gErr } = await supabase
        .from('geofence_zones')
        .select('*');

      if (gErr) throw gErr;

      // 4. Fetch Unresolved SOS alerts
      const { data: alerts, error: aErr } = await supabase
        .from('alerts')
        .select('*')
        .eq('resolved', false);

      if (aErr) throw aErr;

      setTrainees(traineeProfiles || []);
      setLocations(locs || []);
      setZones(geofences || []);
      setSosAlerts(alerts || []);
    } catch (err) {
      console.error('Error fetching live tracking data:', err.message);
      toast.error('Failed to sync live operation map.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  // Subscribe to live postgres database updates
  useRealtime(
    () => loadTrackingData(), // reload coordinates
    (newAlert) => {
      // Alert triggered -> refresh alerts and sync list
      loadTrackingData();
    }
  );

  // Map trainees to their coordinates
  const mappedTrainees = trainees.map(t => {
    const loc = locations.find(l => l.trainee_id === t.id);
    return {
      ...t,
      latitude: loc?.latitude || null,
      longitude: loc?.longitude || null,
      accuracy: loc?.accuracy || null,
      updated_at: loc?.updated_at || null,
    };
  });

  // Filter trainees based on search query
  const filteredTrainees = mappedTrainees.filter(t => {
    const nameMatch = t.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const divMatch = (t.division || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || divMatch;
  });

  const activeTraineesCount = mappedTrainees.filter(t => {
    const isOnline = t.updated_at && (Date.now() - new Date(t.updated_at).getTime()) < 300000;
    return isOnline;
  }).length;

  const handleTraineeClick = (traineeId) => {
    setActiveTraineeId(traineeId);
    setIsBottomSheetExpanded(false); // Collapse bottom sheet on select to show map
  };

  if (loading) {
    return (
      <div className="h-[calc(100dvh-100px)] md:h-[calc(100dvh-40px)]">
        <MapSkeleton />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-56px)] md:h-[calc(100dvh-80px)] lg:h-[calc(100dvh-64px)] flex relative overflow-hidden -mx-4 -my-6 md:mx-0 md:my-0 border-t md:border border-gray-200 md:rounded-lg">
      
      {/* 1. DESKTOP/TABLET SIDEBAR PANEL (280px) */}
      <div 
        className={`hidden md:flex flex-col bg-white border-r border-gray-250 z-20 transition-all duration-300 select-none shrink-0
          lg:relative lg:translate-x-0 lg:shadow-none
          md:absolute md:top-0 md:bottom-0 md:left-0 md:w-[280px] md:shadow-xl
          ${isSidebarOpen 
            ? 'md:translate-x-0 md:opacity-100 lg:w-[280px]' 
            : 'md:-translate-x-full md:opacity-0 lg:w-0 lg:opacity-0 lg:overflow-hidden'
          }
        `}
      >
        {/* Panel Header */}
        <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-xs text-gray-900 uppercase tracking-wide">Live Trainee Operations</h3>
            <span className="text-[10px] text-gray-400 font-semibold">{activeTraineesCount} Active Signals</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, division..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:border-primary-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Trainees List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredTrainees.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No trainees found.</p>
          ) : (
            filteredTrainees.map((t) => {
              const isOnline = t.updated_at && (Date.now() - new Date(t.updated_at).getTime()) < 300000;
              const hasSos = sosAlerts.some(a => a.trainee_id === t.id);
              const isSelected = t.id === activeTraineeId;

              return (
                <div
                  key={t.id}
                  onClick={() => handleTraineeClick(t.id)}
                  className={`p-3 text-left transition-colors duration-150 cursor-pointer flex justify-between items-start gap-2
                    ${isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-gray-800 block truncate">{t.full_name}</span>
                    <span className="text-[10px] text-gray-400 block font-semibold mt-0.5 uppercase tracking-wide">
                      {t.division} · {t.employee_id}
                    </span>
                    {t.latitude && (
                      <span className="text-[9px] text-gray-500 block font-mono mt-1">
                        GPS: {t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <AlertBadge status={hasSos ? 'sos' : (isOnline ? 'active' : 'offline')} />
                    {t.updated_at && (
                      <span className="text-[8px] text-gray-400 font-mono">
                        {new Date(t.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Toggle button to expand sidebar on Desktop */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="hidden md:flex absolute left-3 top-3 bg-white hover:bg-gray-50 border border-gray-250 p-1.5 rounded-md shadow-md z-30 text-gray-500"
          title="Open Trainee List"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* 2. MAP AREA (fills remaining screen) */}
      <div className="flex-1 h-full relative z-10">
        <Suspense fallback={<MapSkeleton />}>
          <LiveMap
            trainees={mappedTrainees}
            zones={zones}
            activeTraineeId={activeTraineeId}
            sosAlerts={sosAlerts}
          />
        </Suspense>
      </div>

      {/* 3. MOBILE BOTTOM SHEET (under 768px breakpoint) */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 rounded-t-2xl shadow-2xl transition-all duration-300 flex flex-col overflow-hidden select-none
          ${isBottomSheetExpanded ? 'h-[50dvh]' : 'h-[72px]'}
        `}
      >
        {/* Bottom Sheet Drag Handle */}
        <div 
          onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
          className="h-8 flex flex-col items-center justify-center border-b border-gray-100 bg-gray-50 shrink-0 cursor-pointer"
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full mb-1.5"></div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {activeTraineesCount} active signal{activeTraineesCount !== 1 ? 's' : ''} Online
          </span>
        </div>

        {/* Mobile Search - Visible only when expanded */}
        {isBottomSheetExpanded && (
          <div className="p-3 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search trainees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        )}

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredTrainees.map((t) => {
            const isOnline = t.updated_at && (Date.now() - new Date(t.updated_at).getTime()) < 300000;
            const hasSos = sosAlerts.some(a => a.trainee_id === t.id);

            return (
              <div
                key={t.id}
                onClick={() => handleTraineeClick(t.id)}
                className="p-3 flex items-center justify-between gap-3 active:bg-gray-100"
              >
                <div className="min-w-0">
                  <span className="font-bold text-xs text-gray-800 block truncate">{t.full_name}</span>
                  <span className="text-[10px] text-gray-400 block font-semibold">
                    {t.division} · {t.employee_id}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <AlertBadge status={hasSos ? 'sos' : (isOnline ? 'active' : 'offline')} />
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
