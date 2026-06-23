import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { formatTimestamp, formatLatLng } from '../../lib/locationUtils';
import StatCard from '../../components/common/StatCard';
import AlertBadge from '../../components/common/AlertBadge';
import SeverityBadge from '../../components/common/SeverityBadge';
import { CardSkeleton, MapSkeleton } from '../../components/common/LoadingSpinner';
import { useRealtime } from '../../hooks/useRealtime';
import { Users, Radio, AlertOctagon, HelpCircle, ShieldAlert, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const LiveMap = React.lazy(() => import('../../components/map/LiveMap'));

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalTrainees: 0,
    activeNow: 0,
    sosToday: 0,
    breachesToday: 0,
  });
  const [traineeLocations, setTraineeLocations] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format

  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Fetch Trainees and Locations
      const { data: trainees, error: tErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainee');
      
      if (tErr) throw tErr;

      const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
      const { data: locations, error: lErr } = await supabase
        .from('locations')
        .select('*');

      if (lErr) throw lErr;

      // Map locations to trainee profiles
      const activeTraineesList = trainees.map(t => {
        const loc = locations.find(l => l.trainee_id === t.id);
        return {
          ...t,
          latitude: loc?.latitude || null,
          longitude: loc?.longitude || null,
          updated_at: loc?.updated_at || null,
        };
      }).filter(t => t.latitude !== null);

      setTraineeLocations(activeTraineesList);

      // Calculate counts
      const totalTraineesCount = trainees.length;
      const activeCount = activeTraineesList.filter(t => t.updated_at && t.updated_at >= fiveMinsAgo).length;

      // 2. Fetch today's alerts count (SOS and breaches)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startOfDayIso = startOfDay.toISOString();

      const { data: alertsToday, error: aErr } = await supabase
        .from('alerts')
        .select('*')
        .gte('created_at', startOfDayIso);

      if (aErr) throw aErr;

      const sosTodayCount = alertsToday.filter(a => a.alert_type === 'SOS').length;
      const breachesTodayCount = alertsToday.filter(a => a.alert_type === 'geofence_breach').length;

      setStats({
        totalTrainees: totalTraineesCount,
        activeNow: activeCount,
        sosToday: sosTodayCount,
        breachesToday: breachesTodayCount,
      });

      // 3. Fetch recent unresolved or overall alerts (Last 10)
      const { data: latestAlerts, error: rErr } = await supabase
        .from('alerts')
        .select(`
          *,
          profiles:trainee_id (full_name, division, contact)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (rErr) throw rErr;
      setRecentAlerts(latestAlerts || []);

      // 4. Fetch today's attendance logs for Chart
      const { data: attendance, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', todayStr);

      if (attErr) throw attErr;

      // Compile chart data division-wise
      const divisions = ['RMHP', 'Blast Furnace', 'Rolling Mill', 'Plate Mill', 'Power Plant'];
      const compiledChart = divisions.map(div => {
        const divTrainees = trainees.filter(t => t.division === div);
        let present = 0;
        let late = 0;
        let absent = 0;

        divTrainees.forEach(t => {
          const record = attendance.find(a => a.trainee_id === t.id);
          if (record) {
            if (record.status === 'present') present++;
            else if (record.status === 'late') late++;
            else if (record.status === 'absent') absent++;
          } else {
            absent++; // No check-in log today implies absent
          }
        });

        return {
          name: div,
          Present: present,
          Late: late,
          Absent: absent,
        };
      });

      setChartData(compiledChart);

      // 5. Fetch Geofence Zones
      const { data: geofences, error: gErr } = await supabase
        .from('geofence_zones')
        .select('*');

      if (gErr) throw gErr;
      setZones(geofences || []);
    } catch (err) {
      console.error('Error loading admin dashboard metrics:', err.message);
      toast.error('Failed to sync live operation logs.');
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Connect supervisor dashboard to Realtime changes
  useRealtime(
    () => loadDashboardData(), // location table insert/update triggers reload
    () => loadDashboardData()  // alerts table inserts triggers reload
  );

  const handleResolveAlert = async (alertId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('alerts')
        .update({
          resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
      toast.success('Incident alert marked as resolved.');
      loadDashboardData();
    } catch (err) {
      console.error('Error resolving alert:', err.message);
      toast.error('Failed to resolve alert incident.');
    }
  };

  const getTraineeInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'T';
  };

  const unresolvedCriticalCount = recentAlerts.filter(
    a => !a.resolved && a.severity?.toLowerCase() === 'critical'
  ).length;

  const sortedRecentAlerts = [...recentAlerts].sort((a, b) => {
    const isCriticalUnresolvedA = !a.resolved && a.severity?.toLowerCase() === 'critical';
    const isCriticalUnresolvedB = !b.resolved && b.severity?.toLowerCase() === 'critical';

    if (isCriticalUnresolvedA && !isCriticalUnresolvedB) return -1;
    if (!isCriticalUnresolvedA && isCriticalUnresolvedB) return 1;

    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="space-y-6 pb-8 select-none">
      
      {/* 1. Header */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-3">
        <h2 className="text-xl font-semibold text-gray-900">Operations Control Center</h2>
        <span className="text-xs font-bold text-gray-500 font-mono bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm">
          Today: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* 2. Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard 
              label="Total Trainees" 
              value={stats.totalTrainees} 
              icon={Users} 
              color="navy"
              trend="Registered in safety portal"
            />
            <StatCard 
              label="Active Operations" 
              value={stats.activeNow} 
              icon={Radio} 
              color="teal"
              trend="Locations updating live"
            />
            <StatCard 
              label="SOS Alerts Today" 
              value={stats.sosToday} 
              icon={ShieldAlert} 
              color="red"
              trend="Distress signals dispatched"
            />
            <StatCard 
              label="Geofence Breaches" 
              value={stats.breachesToday} 
              icon={AlertOctagon} 
              color="yellow"
              trend="Boundary zones violations"
            />
          </>
        )}
      </div>

      {/* 3. Middle split: Mini-map left & recent alerts right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-4">
        
        {/* Live locations Mini map (col-span-3 on xl, col-span-1 on lg) */}
        <div className="lg:col-span-1 xl:col-span-3 bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div className="mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Live Plant Operations View</span>
            <span className="text-[10px] text-gray-500">Trainee tracking markers update on signal broadcast.</span>
          </div>

          <div className="h-[220px] md:h-[300px] lg:h-[380px] border border-gray-200 rounded-lg overflow-hidden relative">
            <Suspense fallback={<MapSkeleton />}>
              <LiveMap 
                trainees={traineeLocations} 
                zones={zones}
                zoom={15} 
                center={[22.257, 84.885]} 
              />
            </Suspense>
          </div>
        </div>

        {/* Recent alerts panel (col-span-2 on xl, col-span-1 on lg) */}
        <div className="lg:col-span-1 xl:col-span-2 bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Recent Incidents Feed</span>
              <span className="text-[10px] text-gray-500">Requires monitoring team verification.</span>
            </div>
            {unresolvedCriticalCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-150 animate-pulse">
                🔴 {unresolvedCriticalCount} Critical
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[220px] md:max-h-[300px] lg:max-h-[380px]">
            {sortedRecentAlerts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6">
                <span className="text-xs text-gray-400 font-semibold">No alerts or breaches reported.</span>
              </div>
            ) : (
              sortedRecentAlerts.map((alert) => {
                let borderClass = 'border-l-4 border-transparent';
                if (!alert.resolved) {
                  const sev = (alert.severity || 'medium').toLowerCase();
                  if (sev === 'critical') {
                    borderClass = 'border-l-4 border-red-500 animate-pulse';
                  } else if (sev === 'high') {
                    borderClass = 'border-l-4 border-orange-500';
                  } else if (sev === 'medium') {
                    borderClass = 'border-l-4 border-yellow-500';
                  } else {
                    borderClass = 'border-l-4 border-blue-500';
                  }
                }

                return (
                  <div 
                    key={alert.id} 
                    className={`p-3 transition-colors hover:bg-gray-50 flex items-center justify-between gap-3 ${borderClass}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-gray-800">
                          {alert.profiles?.full_name || 'Trainee'}
                        </span>
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-[10px] text-gray-400">
                          ({alert.profiles?.division || 'RMHP'})
                        </span>
                      </div>
                      <p className="text-xs text-gray-655 truncate mt-0.5" title={alert.message}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-505 mt-0.5">
                        📞 {alert.profiles?.contact || 'No contact on file'}
                      </p>
                      <span className="text-[9px] font-semibold text-gray-400 font-mono block mt-1">
                        {formatTimestamp(alert.created_at)}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {alert.resolved ? (
                        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold">
                          <Check size={12} /> Resolved
                        </div>
                      ) : (
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shadow-sm transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 4. Division Attendance Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="mb-6">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block">Trainee Shift Demographics</span>
          <span className="text-[10px] text-gray-500">Breakdown of checked-in, late, and absent trainees per division.</span>
        </div>

        <div className="h-[200px] md:h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 500 }} 
                axisLine={false} 
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#6B7280', fontSize: 10 }} 
                axisLine={false} 
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '11px',
                  fontFamily: 'Inter, sans-serif'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconSize={10} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />
              {/* Stacked or side-by-side bars */}
              <Bar dataKey="Present" fill="#10B981" radius={[3, 3, 0, 0]} barSize={20} />
              <Bar dataKey="Late" fill="#F59E0B" radius={[3, 3, 0, 0]} barSize={20} />
              <Bar dataKey="Absent" fill="#EF4444" radius={[3, 3, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
