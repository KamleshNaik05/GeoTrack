import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { TableSkeleton } from '../../components/common/LoadingSpinner';
import AlertBadge from '../../components/common/AlertBadge';
import TraineeDetailModal from '../../components/modals/TraineeDetailModal';
import { Download, Calendar, Filter, Clock, ChevronLeft, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AttendancePanel() {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA')); // default: today
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedShift, setSelectedShift] = useState('All');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const loadAttendanceData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all trainee profiles
      const { data: trainees, error: tErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainee');

      if (tErr) throw tErr;

      // 2. Fetch attendance records for selected date
      const { data: attendance, error: aErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate);

      if (aErr) throw aErr;

      // Left join trainees with attendance. If no record, represent as 'absent'
      const combined = (trainees || []).map(t => {
        const att = (attendance || []).find(a => a.trainee_id === t.id);
        if (att) {
          return {
            ...att,
            profiles: t
          };
        } else {
          return {
            id: `absent-${t.id}`,
            trainee_id: t.id,
            date: selectedDate,
            check_in: null,
            check_out: null,
            status: 'absent',
            profiles: t
          };
        }
      });

      setRecords(combined);
      setCurrentPage(1); // Reset page on query reload
    } catch (err) {
      console.error('Error fetching attendance logs:', err.message);
      toast.error('Failed to query daily attendance logs.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  // Apply filters in memory
  const filteredRecords = records.filter(r => {
    const matchesDivision = selectedDivision === 'All' || r.profiles?.division === selectedDivision;
    const matchesShift = selectedShift === 'All' || r.profiles?.shift_code === selectedShift;
    return matchesDivision && matchesShift;
  });

  // Calculate elapsed hours
  const calculateHours = (inStr, outStr) => {
    if (!inStr) return 0;
    const start = new Date(inStr);
    const end = outStr ? new Date(outStr) : new Date();
    const diff = end - start;
    return parseFloat((diff / (1000 * 60 * 60)).toFixed(1));
  };

  // Compile summary stats
  const totalCount = filteredRecords.length;
  const presentCount = filteredRecords.filter(r => r.status === 'present').length;
  const lateCount = filteredRecords.filter(r => r.status === 'late').length;
  const absentCount = filteredRecords.filter(r => r.status === 'absent').length;

  const avgHours = totalCount > 0
    ? (filteredRecords.reduce((acc, r) => acc + calculateHours(r.check_in, r.check_out), 0) / totalCount).toFixed(1)
    : '0.0';

  // Slicing for pagination
  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + PAGE_SIZE);

  // CSV Export utility
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error('No attendance logs to export.');
      return;
    }

    const headers = ['Trainee Name', 'Employee ID', 'Division', 'Shift', 'Check-in', 'Check-out', 'Hours Worked', 'Status'];
    const csvRows = [
      headers.join(','),
      ...filteredRecords.map(r => [
        `"${r.profiles?.full_name || ''}"`,
        `"${r.profiles?.employee_id || ''}"`,
        `"${r.profiles?.division || ''}"`,
        `"${r.profiles?.shift_code || 'A'}"`,
        r.check_in ? `"${new Date(r.check_in).toISOString()}"` : '"—"',
        r.check_out ? `"${new Date(r.check_out).toISOString()}"` : '"—"',
        calculateHours(r.check_in, r.check_out),
        `"${r.status.toUpperCase()}"`
      ].join(','))
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `geotrack_attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV report exported.');
  };

  const divisions = ['All', 'RMHP', 'Blast Furnace', 'Rolling Mill', 'Plate Mill', 'Power Plant'];

  return (
    <div className="space-y-6 pb-8 select-none">
      
      {/* 1. Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 font-sans">Attendance Logs</h2>
          <p className="text-xs text-gray-500">Track trainee entries, checkouts, and active shift counts.</p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3 w-full md:w-auto">
          {/* Date Picker */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg p-2 md:p-1.5 shadow-sm text-xs font-semibold text-gray-700 w-full md:w-auto">
            <Calendar size={14} className="text-gray-400 mr-2 shrink-0" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="focus:outline-none bg-transparent w-full"
            />
          </div>

          {/* Division Filter */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg p-2 md:p-1.5 shadow-sm text-xs font-semibold text-gray-750 w-full md:w-auto">
            <Filter size={14} className="text-gray-400 mr-2 shrink-0" />
            <select
              value={selectedDivision}
              onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
              className="focus:outline-none bg-transparent w-full font-semibold"
            >
              {divisions.map(div => <option key={div} value={div}>Division: {div}</option>)}
            </select>
          </div>

          {/* Shift Filter */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg p-2 md:p-1.5 shadow-sm text-xs font-semibold text-gray-750 w-full md:w-auto">
            <Filter size={14} className="text-gray-400 mr-2 shrink-0" />
            <select
              value={selectedShift}
              onChange={(e) => { setSelectedShift(e.target.value); setCurrentPage(1); }}
              className="focus:outline-none bg-transparent w-full font-semibold"
            >
              <option value="All">Shift: All</option>
              <option value="A">Shift A</option>
              <option value="B">Shift B</option>
              <option value="C">Shift C</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 h-[40px] md:h-8 px-3 bg-primary-500 hover:bg-primary-600 text-white font-medium text-xs rounded-lg shadow-sm transition-colors w-full md:w-auto focus:outline-none"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* 2. Metrics summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-green-500 shrink-0"></span>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wide block">Checked-In</span>
            <span className="text-sm font-bold text-gray-700">{presentCount}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0"></span>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wide block">Late arrivals</span>
            <span className="text-sm font-bold text-gray-700">{lateCount}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0"></span>
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wide block">Absent</span>
            <span className="text-sm font-bold text-gray-700">{absentCount}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm flex items-center gap-3">
          <Clock size={16} className="text-primary-500 shrink-0" />
          <div>
            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wide block">Avg. Hours</span>
            <span className="text-sm font-bold text-gray-700 font-mono">{avgHours} hrs</span>
          </div>
        </div>
      </div>

      {/* 3. Main content */}
      {loading ? (
        <TableSkeleton rows={7} cols={6} />
      ) : (
        <>
          {/* A. TABLE VIEW - Hidden below md breakpoint */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Trainee Name</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Employee ID</th>
                  <th className="py-3 px-4">Division</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-755 font-medium">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-400 bg-gray-50">
                      No records reported for the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r) => {
                    const elapsed = r.check_in ? `${calculateHours(r.check_in, r.check_out)} hrs` : '—';
                    
                    return (
                      <tr 
                        key={r.id} 
                        onClick={() => setSelectedTrainee(r.profiles)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-bold text-primary-500">{r.profiles?.full_name}</td>
                        <td className="py-3 px-4 hidden lg:table-cell font-mono">{r.profiles?.employee_id}</td>
                        <td className="py-3 px-4">{r.profiles?.division}</td>
                        <td className="py-3 px-4 font-semibold text-gray-600">{r.profiles?.shift_code || 'A'}</td>
                        <td className="py-3 px-4 font-mono">
                          {r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono">{elapsed}</td>
                        <td className="py-3 px-4">
                          <AlertBadge status={r.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* B. CARD VIEW - Visible below md breakpoint */}
          <div className="block md:hidden space-y-2">
            {paginatedRecords.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No records reported.</p>
            ) : (
              paginatedRecords.map((r) => {
                const elapsed = r.check_in ? `${calculateHours(r.check_in, r.check_out)} hrs` : '—';
                return (
                  <div 
                    key={r.id}
                    onClick={() => setSelectedTrainee(r.profiles)}
                    className="bg-white border border-gray-200 rounded-lg p-3 mb-2 cursor-pointer hover:border-gray-300 transition-colors"
                  >
                    {/* Top Row: name + status */}
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-medium text-gray-900 text-sm block leading-tight">{r.profiles?.full_name}</span>
                        <div className="mt-1 select-none">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 bg-gray-100 text-gray-600">
                            Shift {r.profiles?.shift_code || 'A'}
                          </span>
                        </div>
                      </div>
                      <AlertBadge status={r.status} />
                    </div>

                    {/* Second Row: date */}
                    <div className="text-xs text-gray-500 mb-2">
                      {new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>

                    {/* Third Row: Check-in | Check-out | Hours */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="bg-gray-50 border border-gray-150 rounded p-1">
                        <span className="text-[8px] text-gray-400 block font-sans font-bold uppercase tracking-wider">In</span>
                        <span className="text-gray-700 font-bold">
                          {r.check_in ? new Date(r.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                        </span>
                      </div>
                      <div className="bg-gray-50 border border-gray-150 rounded p-1">
                        <span className="text-[8px] text-gray-400 block font-sans font-bold uppercase tracking-wider">Out</span>
                        <span className="text-gray-700 font-bold">
                          {r.check_out ? new Date(r.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                        </span>
                      </div>
                      <div className="bg-gray-50 border border-gray-150 rounded p-1">
                        <span className="text-[8px] text-gray-400 block font-sans font-bold uppercase tracking-wider">Hours</span>
                        <span className="text-gray-700 font-bold">{elapsed}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* C. PAGINATION */}
          {filteredRecords.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-xs select-none">
              <span className="text-gray-500">
                Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}
              </span>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 transition-opacity"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 font-semibold text-gray-700 font-mono">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 transition-opacity"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trainee Details Profile Modal */}
      {selectedTrainee && (
        <TraineeDetailModal
          isOpen={!!selectedTrainee}
          onClose={() => setSelectedTrainee(null)}
          trainee={selectedTrainee}
        />
      )}

    </div>
  );
}
