import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { formatTimestamp, formatLatLng } from '../../lib/locationUtils';
import AlertBadge from '../../components/common/AlertBadge';
import SosHoldButton from '../../components/common/SosHoldButton';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Clock, LogIn, LogOut, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import GeofenceLayer from '../../components/map/GeofenceLayer';

// Helper component to refocus map on current coordinates
function MapRecenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView([coords.lat, coords.lng], 16);
    }
  }, [coords, map]);
  return null;
}

export default function TraineeDashboard() {
  const { 
    profile: authProfile, 
    isSharing, 
    coords, 
    locationError, 
    accuracy, 
    startTracking, 
    stopTracking 
  } = useAuth();

  const [profile, setProfile] = useState(null);

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [loadingAtt, setLoadingAtt] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format

  // Fetch today's attendance, last 5 alerts, and geofences
  const loadDashboardData = async () => {
    if (!authProfile) return;
    
    // 0. Fetch Profile with joined Shift info
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, shifts:shift_code(shift_name, start_time, end_time)')
        .eq('id', authProfile.id)
        .single();
      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile with shift details:', err.message);
    }

    // 1. Fetch Today's Attendance
    try {
      setLoadingAtt(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('trainee_id', authProfile.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (error) throw error;
      setTodayAttendance(data);
    } catch (err) {
      console.error('Error fetching today attendance:', err.message);
    } finally {
      setLoadingAtt(false);
    }

    // 2. Fetch Recent Alerts
    try {
      setLoadingAlerts(true);
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('trainee_id', authProfile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentAlerts(data || []);
    } catch (err) {
      console.error('Error fetching recent alerts:', err.message);
    } finally {
      setLoadingAlerts(false);
    }

    // 3. Fetch Geofence Zones
    try {
      const { data, error } = await supabase
        .from('geofence_zones')
        .select('*');
      if (error) throw error;
      setZones(data || []);
    } catch (err) {
      console.error('Error fetching geofence zones:', err.message);
    }
  };

  useEffect(() => {
    if (!authProfile?.id) return;
    loadDashboardData();

    // Subscribe to attendance & alert tables to refresh dashboards live
    const attendanceChannel = supabase
      .channel('trainee-attendance-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance', filter: `trainee_id=eq.${authProfile.id}` },
        () => loadDashboardData()
      )
      .subscribe();

    const alertsChannel = supabase
      .channel('trainee-alerts-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `trainee_id=eq.${authProfile.id}` },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [authProfile?.id]);

  const handleToggleSharing = () => {
    if (isSharing) {
      stopTracking();
      toast.success('Location sharing turned off.');
    } else {
      startTracking(profile.id);
      toast.success('Location sharing turned on. Scanning GPS signals...');
    }
  };

  // Trainee marker icon
  const myIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-9 h-9">
        <div class="pulse-ring"></div>
        <div class="w-9 h-9 rounded-full bg-accent-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-md relative z-10 select-none">
          ME
        </div>
      </div>
    `,
    className: 'my-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  // Calculate elapsed shift hours
  const getElapsedHours = () => {
    if (!todayAttendance || !todayAttendance.check_in) return '—';
    const start = new Date(todayAttendance.check_in);
    const end = todayAttendance.check_out ? new Date(todayAttendance.check_out) : new Date();
    const diffMs = end - start;
    const hours = diffMs / (1000 * 60 * 60);
    return `${hours.toFixed(1)} hrs`;
  };

  // Format today's date label (e.g. Wednesday, 17 Jun 2026)
  const getFormattedTodayDate = () => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  const displayName = profile?.full_name || authProfile?.full_name || 'Trainee';
  const displayDivision = profile?.division || authProfile?.division || 'RMHP';
  const displayEmployeeId = profile?.employee_id || authProfile?.employee_id || 'TR-001';

  return (
    <div className="space-y-6 select-none pb-8">
      {/* 1. Welcome Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">SAIL Industrial Safety Portal</span>
          <h2 className="text-lg font-bold text-primary-500 mt-0.5">
            Good morning, {displayName}
          </h2>
          <div className="flex flex-wrap gap-2 text-xs text-gray-550 mt-1 font-medium">
            <span>Division: <strong className="text-gray-700">{displayDivision}</strong></span>
            <span>•</span>
            <span>Trainee ID: <strong className="text-gray-700">{displayEmployeeId}</strong></span>
          </div>
          <div className="mt-2">
            {profile?.shifts ? (
              <div className="space-y-0.5">
                <div className="text-sm text-gray-600 font-medium">
                  ⏰ Shift {profile.shift_code} — {profile.shifts.shift_name} ({formatTime(profile.shifts.start_time)}–{formatTime(profile.shifts.end_time)})
                </div>
                <div className="text-[11px] text-gray-450 font-semibold">
                  ⏰ Your shift starts at {formatTime(profile.shifts.start_time)}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic">
                ⏰ No shift assigned yet
              </div>
            )}
          </div>
        </div>
        <div className="bg-primary-50 text-primary-700 border border-primary-100 rounded-md py-1.5 px-3 text-right shrink-0">
          <span className="text-[9px] font-bold block uppercase tracking-wide text-primary-500">Today</span>
          <span className="text-xs font-bold font-mono">{getFormattedTodayDate()}</span>
        </div>
      </div>

      {/* 2. Row 1: GPS Share Status Card + Today's Attendance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* A. Location Sharing Toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={18} className={isSharing ? 'text-accent-500 animate-pulse' : 'text-gray-400'} />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Live GPS Broadcasting</span>
            </div>
            {/* Toggle Switch */}
            <button
              onClick={handleToggleSharing}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 focus:outline-none
                ${isSharing ? 'bg-accent-500' : 'bg-gray-200'}
              `}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200
                  ${isSharing ? 'translate-x-5' : 'translate-x-0'}
                `}
              ></div>
            </button>
          </div>
          
          <p className="text-xs text-gray-550 leading-normal">
            Broadcasting coordinates enables geofence tracking for automated check-in/out and emergency dispatches.
          </p>

          {locationError && (
            <div className="bg-red-50 text-red-700 border border-red-100 p-2.5 rounded text-[11px] leading-tight font-medium">
              {locationError}
            </div>
          )}

          {isSharing && coords && (
            <div className="text-[11px] font-mono text-gray-500 bg-gray-50 border border-gray-150 p-2 rounded flex justify-between">
              <span>GPS: {formatLatLng(coords.lat, coords.lng)}</span>
              <span>Accuracy: ±{accuracy ? accuracy.toFixed(1) : '—'}m</span>
            </div>
          )}
        </div>

        {/* B. Today's Attendance Telemetry */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-3">Today's Attendance Status</span>
            
            {loadingAtt ? (
              <div className="h-14 bg-gray-100 animate-pulse rounded-md"></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mt-2">
                <div className="border-r border-gray-100 py-1">
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                    <LogIn size={13} />
                    <span className="text-[9px] font-semibold uppercase tracking-wide">Check-In</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-gray-700">
                    {todayAttendance?.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                  </span>
                </div>

                <div className="sm:border-r border-gray-100 py-1">
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                    <LogOut size={13} />
                    <span className="text-[9px] font-semibold uppercase tracking-wide">Check-Out</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-gray-700">
                    {todayAttendance?.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                  </span>
                </div>

                <div className="border-r border-gray-100 py-1">
                  <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                    <Clock size={13} />
                    <span className="text-[9px] font-semibold uppercase tracking-wide">Hours</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-gray-700">{getElapsedHours()}</span>
                </div>

                <div className="py-1 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Status</span>
                  <AlertBadge status={todayAttendance ? todayAttendance.status : 'absent'} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Row 2: SOS Card + Mini-Map Card */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* A. Hold SOS Action Card */}
        <div className="lg:col-span-2 bg-red-50/60 border border-red-100 rounded-lg p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={18} className="text-red-600 animate-pulse" />
              <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Emergency SOS Dispatch</span>
            </div>
            <p className="text-xs text-red-800/80 mb-6 leading-relaxed">
              If in distress or injured inside Rourkela Steel Plant premises, trigger this SOS signal immediately. Safety monitors will be alerted.
            </p>
          </div>
          <SosHoldButton isMobileFAB={false} />
        </div>

        {/* B. My Location Mini-Map */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Current GPS Position</span>
          
          <div className="h-[200px] md:h-[350px] border border-gray-200 rounded-lg overflow-hidden relative">
            {coords ? (
              <MapContainer
                center={[coords.lat, coords.lng]}
                zoom={16}
                zoomControl={false}
                className="w-full h-full"
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; CARTO'
                />
                <MapRecenter coords={coords} />
                <GeofenceLayer zones={zones} />
                <Marker position={[coords.lat, coords.lng]} icon={myIcon} />
              </MapContainer>
            ) : (
              <div className="w-full h-full bg-gray-50 flex items-center justify-center text-center p-6 border border-dashed border-gray-200 rounded-lg">
                <div className="max-w-xs space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500">Telemetry Stream Offline</p>
                  <p className="text-[11px] text-gray-400">Toggle location sharing ON to initialize GPS tracking and display your location on the map.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Recent Security Logs (Last 5 Alerts) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-3">Recent Security Warnings & SOS Dispatches</span>
        
        {loadingAlerts ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-6 bg-gray-100 rounded w-full"></div>
            <div className="h-6 bg-gray-100 rounded w-full"></div>
          </div>
        ) : recentAlerts.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 border border-dashed border-gray-250 rounded-lg">All clear. No safety breaches logged.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 select-none">
                  <th className="py-2.5 px-4 text-gray-500 font-semibold uppercase tracking-wider">Type</th>
                  <th className="py-2.5 px-4 text-gray-500 font-semibold uppercase tracking-wider">Time</th>
                  <th className="py-2.5 px-4 text-gray-500 font-semibold uppercase tracking-wider">Coordinates</th>
                  <th className="py-2.5 px-4 text-gray-500 font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-gray-700">
                      {alert.alert_type === 'SOS' ? '🚨 EMERGENCY SOS' : '⚠️ GEOFENCE BREACH'}
                    </td>
                    <td className="py-2.5 px-4 text-gray-550 font-medium">
                      {formatTimestamp(alert.created_at)}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 font-mono">
                      {alert.latitude ? formatLatLng(alert.latitude, alert.longitude) : '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <AlertBadge status={alert.resolved ? 'resolved' : 'pending'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
