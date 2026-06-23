import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { TableSkeleton } from '../../components/common/LoadingSpinner';
import AlertBadge from '../../components/common/AlertBadge';
import { ChevronLeft, ChevronRight, Calendar, List, Award, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

export default function MyAttendance() {
  const { profile } = useAuth();
  
  const [viewType, setViewType] = useState('calendar'); // 'calendar' | 'table'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileWithShift, setProfileWithShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  const formatHistoryDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatHistoryText = (history) => {
    const oldVal = history.old_shift ? `Shift ${history.old_shift}` : 'Unassigned';
    const newVal = history.new_shift ? `Shift ${history.new_shift}` : 'Unassigned';
    return `Changed from ${oldVal} → ${newVal} on ${formatHistoryDate(history.changed_at)}`;
  };

  useEffect(() => {
    if (!profile) return;
    
    const fetchShiftInfo = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*, shifts:shift_code(shift_name, start_time, end_time)')
          .eq('id', profile.id)
          .single();
        if (data) {
          setProfileWithShift(data);
        }
      } catch (err) {
        console.error('Error fetching profile with shift details:', err.message);
      }
    };

    const fetchShiftHistory = async () => {
      try {
        const { data } = await supabase
          .from('shift_history')
          .select('*')
          .eq('trainee_id', profile.id)
          .order('changed_at', { ascending: false })
          .limit(5);
        if (data) {
          setShiftHistory(data);
        }
      } catch (err) {
        console.error('Error fetching shift history:', err.message);
      }
    };

    fetchShiftInfo();
    fetchShiftHistory();
  }, [profile?.id]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-15

  // Fetch attendance for the selected month/year
  const fetchAttendance = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    
    // Start and end dates of the current month in YYYY-MM-DD
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('trainee_id', profile.id)
        .gte('date', startStr)
        .lte('date', endStr);

      if (error) throw error;
      setAttendance(data || []);
    } catch (err) {
      console.error('Error fetching attendance:', err.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, year, month]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Find attendance record for a specific day of the month
  const getRecordForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance.find(r => r.date === dateStr);
  };

  // Monthly statistics calculations
  const stats = {
    present: attendance.filter(r => r.status === 'present').length,
    late: attendance.filter(r => r.status === 'late').length,
    absent: attendance.filter(r => r.status === 'absent').length,
    totalHours: attendance.reduce((acc, r) => {
      if (!r.check_in || !r.check_out) return acc;
      const hours = (new Date(r.check_out) - new Date(r.check_in)) / (1000 * 60 * 60);
      return acc + hours;
    }, 0).toFixed(1),
  };

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Generate calendar cells array
  const renderCalendarCells = () => {
    const cells = [];
    
    // Fill empty cells for offset days
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-14 bg-gray-50 border border-gray-100 opacity-40"></div>);
    }

    // Fill actual day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const record = getRecordForDay(day);
      let dayBg = 'bg-white';
      let dotColor = null;

      if (record) {
        if (record.status === 'present') {
          dayBg = 'bg-green-50/20';
          dotColor = 'bg-green-500';
        } else if (record.status === 'late') {
          dayBg = 'bg-yellow-50/20';
          dotColor = 'bg-yellow-500';
        } else if (record.status === 'absent') {
          dayBg = 'bg-red-50/20';
          dotColor = 'bg-red-500';
        }
      }

      cells.push(
        <div 
          key={`day-${day}`} 
          className={`h-14 border border-gray-150 p-1 flex flex-col justify-between items-start transition-colors hover:bg-gray-50 ${dayBg}`}
        >
          <span className="text-[10px] font-bold text-gray-500 font-mono">{day}</span>
          {record && (
            <div className="w-full flex items-center justify-between mt-auto">
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
              <span className="text-[8px] font-semibold text-gray-400 font-mono">
                {record.check_in ? new Date(record.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
              </span>
            </div>
          )}
        </div>
      );
    }

    return cells;
  };

  return (
    <div className="space-y-6 pb-8 select-none">
      
      {/* 1. Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">SAIL Industrial Safety Portal</span>
          <h2 className="text-lg font-bold text-primary-500 mt-0.5">My Attendance Records</h2>
        </div>
        
        {/* Navigation & view toggles */}
        <div className="flex items-center gap-2">
          {/* Month Changer */}
          <div className="flex items-center border border-gray-200 bg-white rounded-lg shadow-sm">
            <button 
              onClick={prevMonth} 
              className="p-1.5 hover:bg-gray-50 text-gray-550 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-bold font-mono text-gray-750">{monthLabel}</span>
            <button 
              onClick={nextMonth} 
              className="p-1.5 hover:bg-gray-50 text-gray-550 transition-colors"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
            <button
              onClick={() => setViewType('calendar')}
              className={`p-1.5 rounded-md transition-all duration-150 ${viewType === 'calendar' ? 'bg-white text-primary-500 shadow-sm' : 'text-gray-400 hover:text-gray-650'}`}
              title="Calendar View"
            >
              <Calendar size={15} />
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`p-1.5 rounded-md transition-all duration-150 ${viewType === 'table' ? 'bg-white text-primary-500 shadow-sm' : 'text-gray-400 hover:text-gray-650'}`}
              title="Table Log View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Shift Info Banner */}
      <div className="bg-primary-50 border border-primary-100 rounded-lg p-3">
        {profileWithShift?.shifts ? (
          <p className="text-sm text-primary-700 font-medium">
            Your Assigned Shift: {profileWithShift.shift_code} — {profileWithShift.shifts.shift_name} ({formatTime(profileWithShift.shifts.start_time)}–{formatTime(profileWithShift.shifts.end_time)})
          </p>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No shift assigned. Contact your supervisor.
          </p>
        )}
      </div>

      {/* Shift History Section */}
      {shiftHistory && shiftHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Shift Change History</h4>
          <ul className="divide-y divide-gray-150">
            {shiftHistory.map((h) => (
              <li key={h.id} className="py-1.5 text-xs text-gray-500 first:pt-0 last:pb-0 font-medium">
                • {formatHistoryText(h)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. Monthly Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <Award size={16} />
          </div>
          <div>
            <span className="text-[9px] text-gray-450 uppercase font-semibold tracking-wider block leading-none">Days Present</span>
            <span className="text-sm font-bold text-gray-700">{stats.present}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-yellow-50 flex items-center justify-center text-yellow-600 shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div>
            <span className="text-[9px] text-gray-450 uppercase font-semibold tracking-wider block leading-none">Days Late</span>
            <span className="text-sm font-bold text-gray-700">{stats.late}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <AlertCircle size={16} />
          </div>
          <div>
            <span className="text-[9px] text-gray-450 uppercase font-semibold tracking-wider block leading-none">Days Absent</span>
            <span className="text-sm font-bold text-gray-700">{stats.absent}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary-50 flex items-center justify-center text-primary-500 shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <span className="text-[9px] text-gray-450 uppercase font-semibold tracking-wider block leading-none">Total Hours</span>
            <span className="text-sm font-bold text-gray-700 font-mono">{stats.totalHours} hrs</span>
          </div>
        </div>
      </div>

      {/* 3. Main logs viewer */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : viewType === 'calendar' ? (
        /* Calendar View rendering */
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
            {weekdays.map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarCells()}
          </div>
          <div className="flex gap-4 justify-center text-[10px] font-semibold text-gray-550 border-t border-gray-100 pt-4 mt-4 select-none">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500"></span> Present</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-500"></span> Late</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500"></span> Absent</span>
          </div>
        </div>
      ) : (
        /* Table Log View rendering */
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* Table view for md and up */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400 bg-gray-50">
                      No logs reported for the month of {monthLabel}.
                    </td>
                  </tr>
                ) : (
                  attendance.map((log) => {
                    const duration = log.check_in && log.check_out 
                      ? ((new Date(log.check_out) - new Date(log.check_in)) / (1000 * 60 * 60)).toFixed(1) + ' hrs'
                      : '—';
                      
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-bold">
                          {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {log.check_in ? new Date(log.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {log.check_out ? new Date(log.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono">{duration}</td>
                        <td className="py-3 px-4">
                          <AlertBadge status={log.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Card view for mobile (below md) */}
          <div className="block md:hidden divide-y divide-gray-100">
            {attendance.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs">
                No logs reported for the month of {monthLabel}.
              </div>
            ) : (
              attendance.map((log) => {
                const duration = log.check_in && log.check_out 
                  ? ((new Date(log.check_out) - new Date(log.check_in)) / (1000 * 60 * 60)).toFixed(1) + ' hrs'
                  : '—';
                return (
                  <div key={log.id} className="p-3 bg-white">
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
                          {log.check_in ? new Date(log.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                        </span>
                      </div>
                      <div className="bg-gray-50 border border-gray-150 rounded p-1">
                        <span className="text-[8px] text-gray-450 block font-sans font-bold uppercase tracking-wider">Out</span>
                        <span className="text-gray-750 font-bold">
                          {log.check_out ? new Date(log.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                        </span>
                      </div>
                      <div className="bg-gray-50 border border-gray-150 rounded p-1">
                        <span className="text-[8px] text-gray-450 block font-sans font-bold uppercase tracking-wider">Hours</span>
                        <span className="text-gray-750 font-bold">{duration}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
