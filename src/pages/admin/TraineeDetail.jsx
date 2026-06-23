import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { TableSkeleton, MapSkeleton } from '../../components/common/LoadingSpinner';
import StatCard from '../../components/common/StatCard';
import AlertBadge from '../../components/common/AlertBadge';
import SeverityBadge from '../../components/common/SeverityBadge';
import GeofenceLayer from '../../components/map/GeofenceLayer';
import { generateTraineePDF } from '../../lib/reportGenerator';
import { formatTimestamp, formatLatLng } from '../../lib/locationUtils';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  MapPin, 
  Activity, 
  Clock, 
  ShieldAlert, 
  AlertOctagon, 
  BookOpen, 
  Phone, 
  Building2, 
  User,
  History,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

// Leaflet map center helper
function MapRecenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] !== undefined && coords[1] !== undefined) {
      map.setView(coords, 15);
    }
  }, [coords, map]);
  return null;
}

export default function TraineeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Profile data
  const [trainee, setTrainee] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Filter Date Range State (default: current month)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA');
  });

  // Telemetry data
  const [attendance, setAttendance] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Tab State: 'overview' | 'attendance' | 'location'
  const [activeTab, setActiveTab] = useState('overview');

  // Trail Date Selection State (default: today)
  const [trailDate, setTrailDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [trailLocations, setTrailLocations] = useState([]);
  const [loadingTrail, setLoadingTrail] = useState(false);

  const { user: adminUser } = useAuth();

  const handleShiftChange = async (selectedShift) => {
    if (!trainee) return;
    const previousShiftCode = trainee.shift_code;
    const selectedValue = selectedShift === "" ? null : selectedShift;

    try {
      // 1. Get current logged in admin user ID
      let adminId = adminUser?.id;
      if (!adminId) {
        const { data: authData } = await supabase.auth.getUser();
        adminId = authData?.user?.id;
      }

      // 2. Update the profiles table in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ shift_code: selectedValue })
        .eq('id', id);

      if (profileError) throw profileError;

      // 3. Insert record into shift_history table to track changes
      const { error: historyError } = await supabase
        .from('shift_history')
        .insert({
          trainee_id: id,
          old_shift: previousShiftCode,
          new_shift: selectedValue,
          changed_by: adminId
        });

      if (historyError) throw historyError;

      // 4. Update local state
      setTrainee(prev => ({
        ...prev,
        shift_code: selectedValue
      }));

      toast.success('Shift updated successfully');
    } catch (err) {
      console.error('Error changing shift:', err.message);
      toast.error('Failed to update shift: ' + err.message);
    }
  };

  // Load trainee profile
  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('role', 'trainee')
        .single();

      if (error) throw error;
      setTrainee(data);
    } catch (err) {
      console.error('Error fetching trainee profile:', err.message);
      toast.error('Trainee profile not found.');
      navigate('/admin/trainees');
    } finally {
      setLoadingProfile(false);
    }
  }, [id, navigate]);

  // Load history data (Attendance, Alerts, Zones) within selected range
  const fetchDataLogs = useCallback(async () => {
    setLoadingData(true);
    try {
      // 1. Fetch Attendance
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('trainee_id', id)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false });

      if (attErr) throw attErr;
      setAttendance(attData || []);

      // 2. Fetch Alerts
      const { data: altData, error: altErr } = await supabase
        .from('alerts')
        .select('*')
        .eq('trainee_id', id)
        .gte('created_at', `${dateFrom}T00:00:00.000Z`)
        .lte('created_at', `${dateTo}T23:59:59.999Z`)
        .order('created_at', { ascending: false });

      if (altErr) throw altErr;
      setAlerts(altData || []);

      // 3. Fetch Geofence Zones
      const { data: gZones, error: gErr } = await supabase
        .from('geofence_zones')
        .select('*');

      if (gErr) throw gErr;
      setZones(gZones || []);
    } catch (err) {
      console.error('Error fetching trainee metrics logs:', err.message);
      toast.error('Failed to load metrics log history.');
    } finally {
      setLoadingData(false);
    }
  }, [id, dateFrom, dateTo]);

  // Load daily location trail
  const fetchTrail = useCallback(async () => {
    setLoadingTrail(true);
    try {
      const startOfDay = `${trailDate}T00:00:00.000Z`;
      const endOfDay = `${trailDate}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('trainee_id', id)
        .gte('updated_at', startOfDay)
        .lte('updated_at', endOfDay)
        .order('updated_at', { ascending: true });

      if (error) throw error;
      setTrailLocations(data || []);
    } catch (err) {
      console.error('Error fetching location trail:', err.message);
    } finally {
      setLoadingTrail(false);
    }
  }, [id, trailDate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchDataLogs();
  }, [fetchDataLogs]);

  useEffect(() => {
    if (activeTab === 'location') {
      fetchTrail();
    }
  }, [activeTab, fetchTrail]);

  // Determine active status (updated in last 5 mins)
  const getActiveStatus = () => {
    if (!trainee) return false;
    const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
    // Assuming profiles join lists latest active coordinates
    return trainee.updated_at && trainee.updated_at >= fiveMinsAgo;
  };

  // Helper: Count absent days
  const getAbsentCount = () => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    let count = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) continue; // Ignore Sundays
      const dateStr = d.toISOString().split('T')[0];
      const hasCheckedIn = attendance.some(
        r => r.date === dateStr && (r.status === 'present' || r.status === 'late')
      );
      if (!hasCheckedIn) {
        count++;
      }
    }
    return count;
  };

  // Quick stats calculations
  const totalPresentDays = attendance.filter(r => r.status === 'present' || r.status === 'late').length;
  const totalLateDays = attendance.filter(r => r.status === 'late').length;
  const totalAbsentDays = getAbsentCount();
  const totalSOS = alerts.filter(a => a.alert_type === 'SOS').length;
  const criticalSos = alerts.filter(a => a.alert_type === 'SOS' && a.severity === 'critical').length;
  const highSos = alerts.filter(a => a.alert_type === 'SOS' && a.severity === 'high').length;
  const totalBreaches = alerts.filter(a => a.alert_type === 'geofence_breach').length;
  
  const totalHoursWorked = attendance.reduce((acc, log) => {
    if (!log.check_in || !log.check_out) return acc;
    const hours = (new Date(log.check_out) - new Date(log.check_in)) / (1000 * 60 * 60);
    return acc + hours;
  }, 0);
  
  const avgHours = totalPresentDays > 0 
    ? (totalHoursWorked / totalPresentDays).toFixed(1)
    : '0.0';

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'TR';
  };

  // Mixed Activity Timeline (last 10 events)
  const getTimeline = () => {
    const events = [];
    attendance.forEach(log => {
      if (log.check_in) {
        events.push({
          time: log.check_in,
          title: 'Shift Check-In',
          desc: `Entered plant boundary geofence. Status: ${log.status.toUpperCase()}`,
          icon: Clock,
          color: log.status === 'late' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 'text-green-600 bg-green-50 border-green-200'
        });
      }
      if (log.check_out) {
        events.push({
          time: log.check_out,
          title: 'Shift Check-Out',
          desc: 'Exited plant boundary geofence. Shift logged.',
          icon: Clock,
          color: 'text-gray-500 bg-gray-50 border-gray-200'
        });
      }
    });

    alerts.forEach(alt => {
      const isSos = alt.alert_type === 'SOS';
      events.push({
        time: alt.created_at,
        title: isSos ? 'Emergency SOS Alarm' : 'Geofence Breach Warning',
        desc: alt.message || 'Incident reported.',
        icon: isSos ? ShieldAlert : AlertOctagon,
        color: isSos ? 'text-red-600 bg-red-50 border-red-200 animate-pulse' : 'text-orange-600 bg-orange-50 border-orange-200'
      });
    });

    return events.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
  };

  // Trainee marker initials icon
  const initialsIcon = trainee ? L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-9 h-9">
        <div class="pulse-ring absolute inset-0 rounded-full bg-accent-500 animate-ping opacity-60"></div>
        <div class="w-9 h-9 rounded-full bg-accent-600 text-white font-extrabold text-xs flex items-center justify-center border-2 border-white shadow-md relative z-10">
          ${getInitials(trainee.full_name)}
        </div>
      </div>
    `,
    className: 'my-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  }) : null;

  // Trigger PDF Download
  const handleDownloadPDF = () => {
    if (!trainee) return;
    generateTraineePDF({
      trainee: {
        ...trainee,
        is_active: getActiveStatus()
      },
      stats: {
        daysPresent: totalPresentDays,
        daysAbsent: totalAbsentDays,
        daysLate: totalLateDays,
        totalHours: totalHoursWorked.toFixed(1),
        sosAlerts: totalSOS,
        breachAlerts: totalBreaches
      },
      dateRange: { from: dateFrom, to: dateTo },
      attendance: [...attendance].reverse(), // chronologically ordered in PDF
      alerts: [...alerts].reverse()
    });
    toast.success('Trainee PDF report downloaded.');
  };

  if (loadingProfile || !trainee) {
    return (
      <div className="flex items-center justify-center min-h-[50dvh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const initials = getInitials(trainee.full_name);
  const isOnline = getActiveStatus();
  const recentTimeline = getTimeline();

  return (
    <div className="space-y-6 pb-8 select-none">
      
      {/* Back button & Page title */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('/admin/trainees')}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors border border-gray-200 shadow-sm shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Trainee Profile</h2>
          <p className="text-xs text-gray-500">View detailed statistics, calendars, and trail records.</p>
        </div>
      </div>

      {/* 1. Profile Summary Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 border-2 border-primary-200 font-black text-lg flex items-center justify-center shrink-0 shadow-inner">
            {initials}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-extrabold text-base text-gray-900 truncate leading-tight">{trainee.full_name}</h3>
              {trainee.shift_code ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 bg-gray-100 text-gray-600">
                  Shift {trainee.shift_code}
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 bg-gray-100 text-gray-400">
                  No Shift
                </span>
              )}
              {isOnline ? (
                <span className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 bg-gray-50 text-gray-500 border border-gray-200 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Offline
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-gray-400 block">ID: {trainee.employee_id || 'N/A'}</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-550 pt-1 font-medium">
              <span className="flex items-center gap-1.5 truncate"><Building2 size={13} className="text-gray-400" /> {trainee.division || 'N/A'}</span>
              <span className="flex items-center gap-1.5 truncate"><BookOpen size={13} className="text-gray-400" /> {trainee.institution || 'N/A'}</span>
              <span className="flex items-center gap-1.5 truncate"><Phone size={13} className="text-gray-400" /> {trainee.contact || 'N/A'}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 pt-2 border-t border-gray-100 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-gray-550 font-medium">
                <Clock size={13} className="text-gray-400 shrink-0" />
                <span className="font-bold shrink-0">Shift:</span>
                {trainee.shift_code ? (
                  <span className="text-gray-800 font-semibold">
                    {trainee.shift_code === 'A' ? 'A — Morning Shift (06:00 – 14:00)' :
                     trainee.shift_code === 'B' ? 'B — Evening Shift (14:00 – 22:00)' :
                     'C — Night Shift (22:00 – 06:00)'}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400 italic">No shift assigned</span>
                )}
              </span>
              
              <div className="w-full md:w-auto flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">Assign Shift:</span>
                <select
                  value={trainee.shift_code || ''}
                  onChange={(e) => handleShiftChange(e.target.value)}
                  className="w-full md:w-auto h-8 px-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                >
                  <option value="">(None / Unassigned)</option>
                  <option value="A">A — Morning Shift (06:00 – 14:00)</option>
                  <option value="B">B — Evening Shift (14:00 – 22:00)</option>
                  <option value="C">C — Night Shift (22:00 – 06:00)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Download PDF Button */}
        <button
          onClick={handleDownloadPDF}
          className="hidden md:flex items-center justify-center gap-2 h-11 px-4 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Download size={14} /> Download Report (PDF)
        </button>

        {/* Mobile Download PDF Button */}
        <button
          onClick={handleDownloadPDF}
          className="flex md:hidden items-center justify-center gap-2 h-12 w-full bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer mt-2"
        >
          <Download size={14} /> Download Report (PDF)
        </button>
      </div>

      {/* 2. Date Range Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Select Range Filter</span>
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full">
          <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-lg p-2.5 shadow-sm text-xs font-semibold text-gray-700">
            <Calendar size={14} className="text-gray-400 mr-2 shrink-0" />
            <span className="mr-2 text-gray-450 uppercase text-[9px] font-bold">From:</span>
            <input 
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="focus:outline-none bg-transparent w-full font-mono"
            />
          </div>
          <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-lg p-2.5 shadow-sm text-xs font-semibold text-gray-700">
            <Calendar size={14} className="text-gray-400 mr-2 shrink-0" />
            <span className="mr-2 text-gray-450 uppercase text-[9px] font-bold">To:</span>
            <input 
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="focus:outline-none bg-transparent w-full font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {loadingData ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />)
        ) : (
          <>
            <StatCard 
              label="Days Present" 
              value={totalPresentDays} 
              icon={CheckCircle2} 
              color="teal" 
              trend={`${totalAbsentDays} absent days`}
            />
            <StatCard 
              label="Late Check-Ins" 
              value={totalLateDays} 
              icon={Clock} 
              color="yellow"
              trend="Check-in after 09:30 AM"
            />
            <StatCard 
              label="SOS Signals" 
              value={totalSOS} 
              icon={ShieldAlert} 
              color="red"
              trend={
                <span className="text-xs text-gray-500">
                  {criticalSos} Critical, {highSos} High
                </span>
              }
            />
            <StatCard 
              label="Geofence Breaches" 
              value={totalBreaches} 
              icon={AlertOctagon} 
              color="orange"
              trend="Restricted entries/exits"
            />
            <StatCard 
              label="Avg. Hours / Day" 
              value={`${avgHours}h`} 
              icon={TrendingUp} 
              color="navy"
              trend={`Total ${totalHoursWorked.toFixed(1)} hrs`}
            />
          </>
        )}
      </div>

      {/* 4. Tabs & Details Area */}
      <div className="space-y-4">
        {/* Horizontal tabs navigation - Swipeable on mobile */}
        <div className="border-b border-gray-250 select-none overflow-x-auto whitespace-nowrap flex flex-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider shrink-0 transition-all border-b-2
              ${activeTab === 'overview' 
                ? 'border-primary-500 text-primary-500' 
                : 'border-transparent text-gray-400 hover:text-gray-650'
              }
            `}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider shrink-0 transition-all border-b-2
              ${activeTab === 'attendance' 
                ? 'border-primary-500 text-primary-500' 
                : 'border-transparent text-gray-400 hover:text-gray-650'
              }
            `}
          >
            Attendance History
          </button>
          <button
            onClick={() => setActiveTab('location')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider shrink-0 transition-all border-b-2
              ${activeTab === 'location' 
                ? 'border-primary-500 text-primary-500' 
                : 'border-transparent text-gray-400 hover:text-gray-650'
              }
            `}
          >
            Location & Alerts Trail
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm min-h-[300px]">
          
          {/* TAB 1 — OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Mini Map */}
              <div className="lg:col-span-3 space-y-3">
                <h4 className="text-xs font-bold text-gray-450 uppercase tracking-wide block">Most Recent Coordinates</h4>
                <div className="h-[220px] md:h-[350px] border border-gray-200 rounded-lg overflow-hidden relative">
                  {trainee.latitude ? (
                    <MapContainer
                      center={[trainee.latitude, trainee.longitude]}
                      zoom={15}
                      zoomControl={false}
                      className="w-full h-full"
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; CARTO'
                      />
                      <GeofenceLayer zones={zones} />
                      <Marker position={[trainee.latitude, trainee.longitude]} icon={initialsIcon} />
                      <MapRecenter coords={[trainee.latitude, trainee.longitude]} />
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center text-center p-6">
                      <div className="max-w-xs space-y-1.5 text-xs text-gray-400">
                        <MapPin size={24} className="mx-auto text-gray-300" />
                        <p className="font-semibold">No Live Coordinates</p>
                        <p className="text-[11px] text-gray-450">Trainee has not shared any GPS coordinates telemetry with the safety portal yet.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* mixed timeline events */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="text-xs font-bold text-gray-450 uppercase tracking-wide block">Recent Activities Timeline</h4>
                <div className="flow-root max-h-[350px] overflow-y-auto pr-2 space-y-4">
                  {recentTimeline.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">No activities recorded inside range filter.</p>
                  ) : (
                    <ul className="-mb-8">
                      {recentTimeline.map((event, idx) => {
                        const Icon = event.icon;
                        return (
                          <li key={idx}>
                            <div className="relative pb-8">
                              {idx !== recentTimeline.length - 1 && (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-250" aria-hidden="true" />
                              )}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span className={`h-8 w-8 rounded-full border flex items-center justify-center shrink-0 ${event.color}`}>
                                    <Icon size={14} />
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="text-xs font-bold text-gray-800 flex justify-between">
                                    <span>{event.title}</span>
                                    <span className="text-[10px] font-medium font-mono text-gray-400 shrink-0">
                                      {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{event.desc}</p>
                                  <span className="text-[9px] text-gray-400 block mt-1">
                                    {new Date(event.time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 — ATTENDANCE HISTORY */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-450 uppercase tracking-wide block">Shift Log Details</h4>
              </div>

              {loadingData ? (
                <TableSkeleton rows={5} cols={5} />
              ) : (
                <>
                  {/* A. TABLE - Hidden on Mobile */}
                  <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Check-In</th>
                          <th className="py-2.5 px-4">Check-Out</th>
                          <th className="py-2.5 px-4">Hours Worked</th>
                          <th className="py-2.5 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                        {attendance.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-gray-400 bg-gray-50">
                              No attendance records inside selected range.
                            </td>
                          </tr>
                        ) : (
                          attendance.map((log) => {
                            const elapsed = log.check_in && log.check_out 
                              ? ((new Date(log.check_out) - new Date(log.check_in)) / (1000 * 60 * 60)).toFixed(1) + ' hrs'
                              : '—';
                            return (
                              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-2.5 px-4 font-bold">{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="py-2.5 px-4 font-mono">{log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                <td className="py-2.5 px-4 font-mono">{log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                                <td className="py-2.5 px-4 font-mono">{elapsed}</td>
                                <td className="py-2.5 px-4"><AlertBadge status={log.status} /></td>
                              </tr>
                            );
                          })
                        )}
                        {/* Summary Row */}
                        {attendance.length > 0 && (
                          <tr className="bg-gray-50 font-bold text-gray-800 border-t border-gray-200">
                            <td className="py-3 px-4">SUMMARY</td>
                            <td colSpan={2} className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Present: <span className="text-teal-650 font-bold">{totalPresentDays}</span> · Late: <span className="text-yellow-650 font-bold">{totalLateDays}</span> · Absent: <span className="text-red-650 font-bold">{totalAbsentDays}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-primary-500">{totalHoursWorked.toFixed(1)} hrs</td>
                            <td className="py-3 px-4"></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* B. CARD LIST - Visible on Mobile */}
                  <div className="block md:hidden space-y-2">
                    {attendance.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No shift logs found.</p>
                    ) : (
                      attendance.map((log) => {
                        const elapsed = log.check_in && log.check_out 
                          ? ((new Date(log.check_out) - new Date(log.check_in)) / (1000 * 60 * 60)).toFixed(1) + ' hrs'
                          : '—';
                        return (
                          <div 
                            key={log.id} 
                            className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-gray-900 text-xs">
                                {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <AlertBadge status={log.status} />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                              <div className="bg-gray-50 border border-gray-150 rounded p-1">
                                <span className="text-[8px] text-gray-450 block font-sans font-bold uppercase tracking-wider">In</span>
                                <span className="text-gray-750 font-bold">
                                  {log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                              </div>
                              <div className="bg-gray-50 border border-gray-150 rounded p-1">
                                <span className="text-[8px] text-gray-450 block font-sans font-bold uppercase tracking-wider">Out</span>
                                <span className="text-gray-750 font-bold">
                                  {log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                              </div>
                              <div className="bg-gray-50 border border-gray-150 rounded p-1">
                                <span className="text-[8px] text-gray-450 block font-sans font-bold uppercase tracking-wider">Hours</span>
                                <span className="text-gray-750 font-bold">{elapsed}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {/* Mobile Summary Box */}
                    {attendance.length > 0 && (
                      <div className="bg-gray-50 border border-gray-250 p-3 rounded-lg text-xs space-y-1 text-gray-800 font-semibold mt-4">
                        <div className="flex justify-between border-b border-gray-200 pb-1.5 mb-1.5 uppercase font-bold text-gray-500 text-[10px] tracking-wider">
                          <span>SUMMARY</span>
                          <span className="font-mono text-primary-500 text-xs">{totalHoursWorked.toFixed(1)} Total Hrs</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Present / Late:</span>
                          <span>{totalPresentDays} present / {totalLateDays} late</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Absent Days:</span>
                          <span className="text-red-650">{totalAbsentDays} absent</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3 — LOCATION & ALERTS HISTORY */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <h4 className="text-xs font-bold text-gray-450 uppercase tracking-wide block">Daily Movement Trail</h4>
                
                {/* Specific day selector */}
                <div className="flex items-center bg-white border border-gray-300 rounded-lg p-2 md:p-1.5 shadow-sm text-xs font-semibold text-gray-700 w-full sm:w-auto">
                  <Calendar size={14} className="text-gray-400 mr-2 shrink-0" />
                  <input
                    type="date"
                    value={trailDate}
                    min={dateFrom}
                    max={dateTo}
                    onChange={(e) => setTrailDate(e.target.value)}
                    className="focus:outline-none bg-transparent w-full font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Daily Trail Map */}
                <div className="lg:col-span-3 space-y-2">
                  <div className="h-[220px] md:h-[350px] border border-gray-200 rounded-lg overflow-hidden relative">
                    {loadingTrail ? (
                      <MapSkeleton />
                    ) : trailLocations.length === 0 ? (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-center p-6">
                        <div className="max-w-xs space-y-1.5 text-xs text-gray-400">
                          <MapPin size={24} className="mx-auto text-gray-300" />
                          <p className="font-semibold">No location data recorded for this date</p>
                          <p className="text-[11px] text-gray-450">Trainee location was not reported on {new Date(trailDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}.</p>
                        </div>
                      </div>
                    ) : (
                      <MapContainer
                        center={[trailLocations[0].latitude, trailLocations[0].longitude]}
                        zoom={16}
                        zoomControl={false}
                        className="w-full h-full"
                      >
                        <TileLayer
                          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                          attribution='&copy; CARTO'
                        />
                        <GeofenceLayer zones={zones} />
                        
                        {/* Trail Polyline */}
                        {trailLocations.length > 1 && (
                          <Polyline 
                            positions={trailLocations.map(pt => [pt.latitude, pt.longitude])} 
                            color="#1F6B75" 
                            weight={3}
                            opacity={0.8}
                          />
                        )}
                        
                        {/* Start Marker */}
                        <Marker 
                          position={[trailLocations[0].latitude, trailLocations[0].longitude]} 
                          icon={L.divIcon({
                            html: '<div class="w-6 h-6 rounded-full bg-green-600 text-white font-extrabold text-[9px] flex items-center justify-center border border-white shadow-sm">IN</div>',
                            className: 'start-marker',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                          })}
                        />
                        
                        {/* End Marker */}
                        {trailLocations.length > 1 && (
                          <Marker 
                            position={[trailLocations[trailLocations.length - 1].latitude, trailLocations[trailLocations.length - 1].longitude]} 
                            icon={L.divIcon({
                              html: '<div class="w-6 h-6 rounded-full bg-red-600 text-white font-extrabold text-[9px] flex items-center justify-center border border-white shadow-sm">OUT</div>',
                              className: 'end-marker',
                              iconSize: [24, 24],
                              iconAnchor: [12, 12]
                            })}
                          />
                        )}
                        
                        <MapRecenter coords={[trailLocations[0].latitude, trailLocations[0].longitude]} />
                      </MapContainer>
                    )}
                  </div>
                </div>

                {/* Day's Alerts Feed */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-bold text-gray-450 uppercase tracking-wide block">Day's Safety Incidents</h4>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                    {alerts.filter(a => a.created_at.split('T')[0] === trailDate).length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">No security alerts triggered on this date.</p>
                    ) : (
                      alerts.filter(a => a.created_at.split('T')[0] === trailDate).map((alert) => (
                        <div 
                          key={alert.id}
                          className={`p-3 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col space-y-1 relative border-l-4 ${alert.alert_type === 'SOS' ? 'border-l-red-500' : 'border-l-orange-500'}`}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-xs text-gray-800 truncate">
                                {alert.alert_type === 'SOS' ? '🚨 EMERGENCY SOS' : '⚠️ GEOFENCE BREACH'}
                              </span>
                              <SeverityBadge severity={alert.severity} />
                            </div>
                            <span className="text-[10px] text-gray-400 font-semibold font-mono shrink-0">
                              {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 leading-normal">{alert.message || 'Breach alarm logged.'}</p>
                          <div className="flex justify-between items-center pt-1 border-t border-gray-50 mt-1 text-[10px]">
                            <span className="text-gray-450 font-mono">{formatLatLng(alert.latitude, alert.longitude)}</span>
                            <span className={`font-bold ${alert.resolved ? 'text-green-700' : 'text-red-700'}`}>
                              {alert.resolved ? 'Resolved ✓' : 'Pending Verification'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
