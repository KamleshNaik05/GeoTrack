import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtime } from '../../hooks/useRealtime';
import { formatTimestamp, formatLatLng } from '../../lib/locationUtils';
import { TableSkeleton } from '../../components/common/LoadingSpinner';
import AlertBadge from '../../components/common/AlertBadge';
import SeverityBadge from '../../components/common/SeverityBadge';
import SOSModal from '../../components/modals/SOSModal';
import { ShieldAlert, AlertOctagon, MapPin, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AlertsPanel() {
  const [activeTab, setActiveTab] = useState('SOS'); // 'SOS' | 'geofence_breach'
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [alerts, setAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [activeModalAlert, setActiveModalAlert] = useState(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const loadAlertsData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          profiles!alerts_trainee_id_fkey(full_name, employee_id, division),
          geofence_zones(zone_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);

      // Fetch Geofence Zones
      const { data: geofences, error: zErr } = await supabase
        .from('geofence_zones')
        .select('*');
      if (zErr) throw zErr;
      setZones(geofences || []);
    } catch (err) {
      console.error('Error fetching alerts:', err.message);
      toast.error('Failed to query incidents logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlertsData();
  }, [loadAlertsData]);

  // Connect alerts panel to Postgres realtime channels
  useRealtime(
    null, // Ignore coordinate updates on this page
    () => {
      // Reload on alert insert
      loadAlertsData();
    }
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
      toast.success('Incident resolved.');
      loadAlertsData();
    } catch (err) {
      console.error('Error resolving alert:', err.message);
      toast.error('Failed to resolve alert.');
    }
  };

  // Filter alerts by active tab and selected severity
  const filteredAlerts = alerts
    .filter(a => a.alert_type === activeTab)
    .filter(a => selectedSeverity === 'All' || (a.severity || 'medium').toLowerCase() === selectedSeverity.toLowerCase());

  // Sort alerts by severity default: Critical -> High -> Medium -> Low
  const severityRank = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const rankA = severityRank[a.severity?.toLowerCase()] || 0;
    const rankB = severityRank[b.severity?.toLowerCase()] || 0;
    if (rankB !== rankA) {
      return rankB - rankA;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Pagination slicing
  const totalPages = Math.ceil(sortedAlerts.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedAlerts = sortedAlerts.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-6 pb-8 select-none">
      
      {/* 1. Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 font-sans">Safety Incidents Manager</h2>
          <p className="text-xs text-gray-500">Monitor plant breaches and trainee SOS signals live.</p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('SOS'); setCurrentPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-150 ${
              activeTab === 'SOS' 
                ? 'bg-white text-red-700 shadow-sm' 
                : 'text-gray-400 hover:text-gray-750'
            }`}
          >
            <ShieldAlert size={14} /> SOS Alarms
          </button>
          <button
            onClick={() => { setActiveTab('geofence_breach'); setCurrentPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-150 ${
              activeTab === 'geofence_breach' 
                ? 'bg-white text-orange-700 shadow-sm' 
                : 'text-gray-400 hover:text-gray-750'
            }`}
          >
            <AlertOctagon size={14} /> Boundary Breaches
          </button>
        </div>
      </div>

      {/* Controls Section */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full">
        {/* Severity Filter */}
        <div className="flex items-center bg-white border border-gray-300 rounded-lg p-2 md:p-1.5 shadow-sm text-xs font-semibold text-gray-750 w-full md:w-auto shrink-0">
          <span className="mr-2 text-gray-400 uppercase text-[9px] font-bold">Severity:</span>
          <select
            value={selectedSeverity}
            onChange={(e) => { setSelectedSeverity(e.target.value); setCurrentPage(1); }}
            className="focus:outline-none bg-transparent w-full font-semibold"
          >
            <option value="All">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* 2. Incidents List Content */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : (
        <>
          {/* A. TABLE LAYOUT - Hidden on Mobile */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Trainee</th>
                  <th className="py-3 px-4">Division</th>
                  {activeTab === 'geofence_breach' && <th className="py-3 px-4">Breached Zone</th>}
                  <th className="py-3 px-4">Trigger Time</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">GPS Coordinates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-750 font-medium">
                {paginatedAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'geofence_breach' ? 8 : 7} className="py-6 text-center text-gray-400 bg-gray-50">
                      No active alerts in this category.
                    </td>
                  </tr>
                ) : (
                  paginatedAlerts.map((alert) => {
                    let rowHighlightClass = 'border-l-4 border-transparent';
                    if (!alert.resolved) {
                      const sev = (alert.severity || 'medium').toLowerCase();
                      if (sev === 'critical') {
                        rowHighlightClass = 'border-l-4 border-red-500 bg-red-50/10 animate-pulse';
                      } else if (sev === 'high') {
                        rowHighlightClass = 'border-l-4 border-orange-500 bg-orange-50/10';
                      } else if (sev === 'medium') {
                        rowHighlightClass = 'border-l-4 border-yellow-500 bg-yellow-50/10';
                      } else {
                        rowHighlightClass = 'border-l-4 border-blue-500 bg-blue-50/10';
                      }
                    }

                    return (
                      <tr key={alert.id} className={`hover:bg-gray-50 transition-colors ${rowHighlightClass}`}>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 block">
                            {alert.profiles?.full_name || 'Trainee'}
                          </span>
                          <span className="text-[10px] text-gray-400 block font-semibold">
                            {alert.profiles?.employee_id || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{alert.profiles?.division || 'RMHP'}</td>
                        {activeTab === 'geofence_breach' && (
                          <td className="py-3 px-4 text-orange-650 font-semibold">
                            {alert.geofence_zones?.zone_name || 'Restricted Area'}
                          </td>
                        )}
                        <td className="py-3 px-4 font-mono">
                          {formatTimestamp(alert.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <SeverityBadge severity={alert.severity} />
                        </td>
                        <td className="py-3 px-4">
                          {alert.latitude ? (
                            <button
                              onClick={() => setActiveModalAlert(alert)}
                              className="inline-flex items-center gap-1 text-primary-500 hover:text-primary-600 font-mono font-semibold hover:underline"
                              title="Show on mini-map"
                            >
                              <MapPin size={12} />
                              {formatLatLng(alert.latitude, alert.longitude)}
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <AlertBadge status={alert.resolved ? 'resolved' : 'pending'} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {alert.resolved ? (
                            <div className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded font-bold text-[10px] select-none">
                              <Check size={12} /> Resolved
                            </div>
                          ) : (
                            <button
                              onClick={() => handleResolveAlert(alert.id)}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] shadow-sm transition-colors duration-150"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* B. CARD LAYOUT - Visible on Mobile */}
          <div className="block md:hidden space-y-3">
            {paginatedAlerts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No incident alerts reported.</p>
            ) : (
              paginatedAlerts.map((alert) => {
                let borderHighlight = 'border-l-4 border-transparent';
                if (!alert.resolved) {
                  const sev = (alert.severity || 'medium').toLowerCase();
                  if (sev === 'critical') {
                    borderHighlight = 'border-l-4 border-red-500 animate-pulse';
                  } else if (sev === 'high') {
                    borderHighlight = 'border-l-4 border-orange-500';
                  } else if (sev === 'medium') {
                    borderHighlight = 'border-l-4 border-yellow-500';
                  } else {
                    borderHighlight = 'border-l-4 border-blue-500';
                  }
                }

                return (
                  <div 
                    key={alert.id}
                    className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col space-y-3 relative active:bg-gray-50 ${borderHighlight}`}
                  >
                    {/* Status & Severity Badges top right */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      <SeverityBadge severity={alert.severity} />
                      <AlertBadge status={alert.resolved ? 'resolved' : 'pending'} />
                    </div>

                    {/* Content */}
                    <div className="space-y-0.5">
                      <span className="font-bold text-sm text-gray-900 block">
                        {alert.profiles?.full_name || 'Trainee'}
                      </span>
                      <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">
                        {alert.profiles?.division} · {alert.profiles?.employee_id}
                      </span>
                      {activeTab === 'geofence_breach' && (
                        <span className="text-xs text-orange-600 font-semibold block pt-1">
                          Zone: {alert.geofence_zones?.zone_name || 'Restricted area'}
                        </span>
                      )}
                    </div>

                    <div className="border-t border-b border-gray-100 py-2 text-xs space-y-1 font-mono">
                      <div>
                        <span className="text-[9px] text-gray-400 font-sans font-semibold">TRIGGERED</span>
                        <span className="text-gray-700">{formatTimestamp(alert.created_at)}</span>
                      </div>
                      {alert.latitude && (
                        <div>
                          <span className="text-[9px] text-gray-400 font-sans font-semibold">LOCATION</span>
                          <button
                            onClick={() => setActiveModalAlert(alert)}
                            className="text-primary-500 hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <MapPin size={12} /> {formatLatLng(alert.latitude, alert.longitude)}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mobile Card Action button */}
                    {!alert.resolved && (
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="w-full py-2 bg-red-650 hover:bg-red-700 text-white rounded-md text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} /> Resolve Incident
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* C. PAGINATION */}
          {filteredAlerts.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-xs select-none">
              <span className="text-gray-500">
                Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredAlerts.length)} of {filteredAlerts.length}
              </span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 font-semibold text-gray-700 font-mono">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Mini-map Location Spotlight Modal */}
      {activeModalAlert && (
        <SOSModal
          isOpen={!!activeModalAlert}
          onClose={() => setActiveModalAlert(null)}
          alert={activeModalAlert}
          traineeName={activeModalAlert.profiles?.full_name}
          zones={zones}
        />
      )}

    </div>
  );
}
