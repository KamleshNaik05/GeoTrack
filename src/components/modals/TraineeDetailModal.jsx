import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatTimestamp, formatLatLng } from '../../lib/locationUtils';
import AlertBadge from '../common/AlertBadge';
import { X, Mail, Phone, BookOpen, Warehouse, Fingerprint, CalendarClock, History } from 'lucide-react';

export default function TraineeDetailModal({ isOpen, onClose, trainee }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && trainee) {
      const loadAttendance = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('trainee_id', trainee.id)
            .order('date', { ascending: false })
            .limit(5);

          if (error) throw error;
          setAttendance(data || []);
        } catch (err) {
          console.error('Error fetching attendance logs:', err.message);
        } finally {
          setLoading(false);
        }
      };
      loadAttendance();
    }
  }, [isOpen, trainee]);

  if (!isOpen || !trainee) return null;

  const initials = trainee.full_name
    ? trainee.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'T';

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div 
        className="bg-white w-full md:max-w-lg md:relative md:rounded-xl md:max-h-none fixed bottom-0 left-0 right-0 rounded-t-2xl max-h-[90dvh] overflow-y-auto translate-y-0 shadow-2xl flex flex-col z-10 transition-transform duration-300 transform"
      >
        {/* Mobile Drag Handle */}
        <div className="md:hidden shrink-0 mt-3 mb-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto"></div>
        </div>

        {/* Modal Header */}
        <div className="p-4 flex justify-between items-center border-b border-gray-200 shrink-0 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center border border-primary-200 select-none text-sm">
              {initials}
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 leading-tight">{trainee.full_name}</h3>
              <p className="text-[10px] text-gray-550 font-medium uppercase tracking-wide">Trainee Specifications</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {/* Section 1: Detailed credentials */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Identity & Placement</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border border-gray-150">
                <Fingerprint size={14} className="text-gray-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-gray-400 block font-semibold leading-none">TRAINEE ID</span>
                  <span className="text-gray-700 font-semibold">{trainee.employee_id || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border border-gray-150">
                <Warehouse size={14} className="text-gray-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-gray-400 block font-semibold leading-none">DIVISION</span>
                  <span className="text-gray-700 font-semibold">{trainee.division || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border border-gray-150">
                <BookOpen size={14} className="text-gray-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-gray-400 block font-semibold leading-none">INSTITUTION</span>
                  <span className="text-gray-700 font-semibold truncate max-w-[150px]">{trainee.institution || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border border-gray-150">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-gray-400 block font-semibold leading-none">CONTACT</span>
                  <span className="text-gray-700 font-semibold">{trainee.contact || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Last Known GPS */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Telemetry Status</span>
            <div className="bg-primary-50 border border-primary-100 p-3 rounded-lg text-xs flex justify-between items-center">
              <div>
                <span className="text-[9px] text-primary-500 font-bold block uppercase tracking-wide">Last Location</span>
                <span className="text-primary-750 font-mono font-semibold">
                  {formatLatLng(trainee.latitude, trainee.longitude)}
                </span>
                <span className="text-[9px] text-gray-450 block mt-0.5">
                  Updated: {formatTimestamp(trainee.updated_at)}
                </span>
              </div>
              <AlertBadge status={(Date.now() - new Date(trainee.updated_at).getTime()) < 300000 ? 'active' : 'offline'} />
            </div>
          </div>

          {/* Section 3: Recent Attendance Logs */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recent Attendance (Last 5 Days)</span>
              <History size={13} className="text-gray-400" />
            </div>
            
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-8 bg-gray-100 rounded w-full"></div>
                <div className="h-8 bg-gray-100 rounded w-full"></div>
              </div>
            ) : attendance.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 bg-gray-50 border border-dashed border-gray-200 rounded">No attendance records found.</p>
            ) : (
              <div className="border border-gray-150 rounded-lg overflow-hidden divide-y divide-gray-100 text-xs">
                {attendance.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-2.5 hover:bg-gray-50">
                    <span className="font-semibold text-gray-700">
                      {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500">
                        {log.check_in ? new Date(log.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                        {' / '}
                        {log.check_out ? new Date(log.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                      </span>
                      <AlertBadge status={log.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-150 bg-gray-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="h-11 md:h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium text-xs rounded-lg shadow-sm transition-colors duration-150 flex items-center justify-center"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
