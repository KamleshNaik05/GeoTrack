import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { TableSkeleton } from '../../components/common/LoadingSpinner';
import { Search, Filter, Users, ChevronLeft, ChevronRight, BookOpen, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TraineesList() {
  const navigate = useNavigate();
  const [trainees, setTrainees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('All');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch trainee profiles
      const { data: pData, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainee')
        .order('full_name', { ascending: true });

      if (pErr) throw pErr;

      // 2. Fetch locations
      const { data: lData, error: lErr } = await supabase
        .from('locations')
        .select('*');

      if (lErr) throw lErr;

      setTrainees(pData || []);
      setLocations(lData || []);
    } catch (err) {
      console.error('Error fetching trainees:', err.message);
      toast.error('Failed to query trainees directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to locations table changes for live status updates
    const locationChannel = supabase
      .channel('trainees-list-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [loadData]);

  // Handle Search and Filter logic
  const filteredTrainees = trainees.map(t => {
    const loc = locations.find(l => l.trainee_id === t.id);
    const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
    const isActive = loc && loc.updated_at && loc.updated_at >= fiveMinsAgo;
    return {
      ...t,
      isActive
    };
  }).filter(t => {
    const matchesSearch = 
      t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.employee_id && t.employee_id.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesDivision = 
      selectedDivision === 'All' || 
      t.division === selectedDivision;

    return matchesSearch && matchesDivision;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredTrainees.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTrainees = filteredTrainees.slice(startIndex, startIndex + PAGE_SIZE);

  const handleCardClick = (id) => {
    navigate(`/admin/trainees/${id}`);
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'TR';
  };

  const divisions = ['All', 'RMHP', 'Blast Furnace', 'Rolling Mill', 'Plate Mill', 'Power Plant'];

  return (
    <div className="space-y-6 pb-8 select-none">
      
      {/* 1. Page Header */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2.5">
          <Users className="text-primary-500 shrink-0" size={24} />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Trainees</h2>
            <p className="text-xs text-gray-500">View academics, shifts, and tracking telemetry records.</p>
          </div>
        </div>
        <span className="bg-primary-50 text-primary-700 text-xs font-extrabold px-3 py-1 rounded-full shadow-sm">
          {filteredTrainees.length} Total
        </span>
      </div>

      {/* 2. Controls Section */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full">
        {/* Search Input */}
        <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2 md:py-1.5 shadow-sm text-xs text-gray-700">
          <Search size={15} className="text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="focus:outline-none bg-transparent w-full"
          />
        </div>

        {/* Division Filter */}
        <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2 md:py-1.5 shadow-sm text-xs text-gray-750 shrink-0">
          <Filter size={14} className="text-gray-400 mr-2 shrink-0" />
          <select
            value={selectedDivision}
            onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
            className="focus:outline-none bg-transparent w-full font-semibold"
          >
            {divisions.map(div => <option key={div} value={div}>Division: {div}</option>)}
          </select>
        </div>
      </div>

      {/* 3. Cards Grid */}
      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : paginatedTrainees.length === 0 ? (
        <div className="bg-white border border-gray-200 border-dashed border-2 rounded-xl p-12 text-center text-gray-400">
          <p className="font-semibold text-sm">No trainees found</p>
          <p className="text-xs text-gray-400 mt-1">Try resetting search filters or checking keyword spellings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedTrainees.map((trainee) => (
            <div
              key={trainee.id}
              onClick={() => handleCardClick(trainee.id)}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer flex flex-col justify-between h-48 group"
            >
              {/* Card Top: Initials & Status Badge */}
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-extrabold text-sm flex items-center justify-center border border-primary-200 group-hover:scale-105 transition-transform">
                  {getInitials(trainee.full_name)}
                </div>
                
                {trainee.isActive ? (
                  <span className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span> Active now
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-gray-50 text-gray-500 border border-gray-200 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span> Offline
                  </span>
                )}
              </div>

              {/* Card Middle: Identity */}
              <div className="mt-4 flex-1">
                <h3 className="font-bold text-gray-900 group-hover:text-primary-500 transition-colors text-sm truncate leading-tight">
                  {trainee.full_name}
                </h3>
                <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                  ID: {trainee.employee_id || 'N/A'}
                </span>
              </div>

              {/* Card Bottom: Placement details */}
              <div className="border-t border-gray-100 pt-3 flex flex-col gap-1 text-xs text-gray-550">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate font-semibold">{trainee.division || 'RMHP'}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <BookOpen size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate text-[11px] text-gray-450">{trainee.institution || 'NIT Rourkela'}</span>
                </div>
                <div className="mt-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 bg-gray-100 text-gray-600">
                    Shift {trainee.shift_code || 'A'}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 4. Pagination */}
      {filteredTrainees.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-xs select-none">
          <span className="text-gray-500">
            Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredTrainees.length)} of {filteredTrainees.length}
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

    </div>
  );
}
