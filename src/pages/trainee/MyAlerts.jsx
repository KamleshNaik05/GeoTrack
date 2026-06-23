import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { formatTimestamp, formatLatLng } from '../../lib/locationUtils';
import { TableSkeleton } from '../../components/common/LoadingSpinner';
import AlertBadge from '../../components/common/AlertBadge';

export default function MyAlerts() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!profile) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('trainee_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAlerts(data || []);
      } catch (err) {
        console.error('Error fetching alerts:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [profile?.id]);

  return (
    <div className="space-y-6 pb-8 select-none">
      
      {/* Header Area */}
      <div>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">SAIL Industrial Safety Portal</span>
        <h2 className="text-lg font-bold text-primary-500 mt-0.5">My Safety Alerts & Incidents</h2>
      </div>

      {/* Main logs display */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : alerts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 shadow-sm border-dashed border-2">
          <p className="text-sm font-semibold text-gray-500">All Clear</p>
          <p className="text-xs text-gray-400 mt-1">You have not triggered any SOS alarms or geofence breaches.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Table view for md and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Trigger Time</th>
                  <th className="py-3 px-4">Warning Message</th>
                  <th className="py-3 px-4">GPS Coordinates</th>
                  <th className="py-3 px-4">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-bold">
                      {alert.alert_type === 'SOS' ? (
                        <span className="text-red-650">🚨 EMERGENCY SOS</span>
                      ) : (
                        <span className="text-orange-650">⚠️ GEOFENCE BREACH</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono">
                      {formatTimestamp(alert.created_at)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {alert.message || 'Geofence limit breach recorded.'}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">
                      {alert.latitude ? formatLatLng(alert.latitude, alert.longitude) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <AlertBadge status={alert.resolved ? 'resolved' : 'pending'} />
                      {alert.resolved && alert.resolved_at && (
                        <span className="block text-[9px] text-gray-400 font-semibold mt-0.5">
                          Resolved: {new Date(alert.resolved_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card view for mobile */}
          <div className="block md:hidden divide-y divide-gray-100">
            {alerts.map((alert) => {
              const borderHighlight = !alert.resolved 
                ? (alert.alert_type === 'SOS' ? 'border-l-4 border-red-500' : 'border-l-4 border-orange-500')
                : 'border-l-4 border-transparent';
              return (
                <div 
                  key={alert.id}
                  className={`p-4 bg-white flex flex-col space-y-3 relative ${borderHighlight}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      {alert.alert_type === 'SOS' ? (
                        <span className="text-red-650 font-bold text-xs">🚨 EMERGENCY SOS</span>
                      ) : (
                        <span className="text-orange-650 font-bold text-xs">⚠️ GEOFENCE BREACH</span>
                      )}
                      <span className="block text-[10px] text-gray-400 font-mono mt-0.5">
                        {formatTimestamp(alert.created_at)}
                      </span>
                    </div>
                    <AlertBadge status={alert.resolved ? 'resolved' : 'pending'} />
                  </div>

                  <div className="text-xs text-gray-600 border-t border-b border-gray-100 py-2 space-y-1">
                    <p className="font-medium text-gray-700">{alert.message || 'Geofence limit breach recorded.'}</p>
                    {alert.latitude && (
                      <p className="font-mono text-[11px] text-gray-500">
                        GPS: {formatLatLng(alert.latitude, alert.longitude)}
                      </p>
                    )}
                  </div>

                  {alert.resolved && alert.resolved_at && (
                    <div className="text-[10px] text-gray-500 flex items-center justify-between bg-green-50 p-2 rounded">
                      <span className="font-bold text-green-700">Resolved ✓</span>
                      <span className="font-mono">
                        {new Date(alert.resolved_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
