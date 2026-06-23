import React, { useState, useEffect, Suspense } from 'react';
import { useGeofence } from '../../hooks/useGeofence';
import { MapSkeleton } from '../../components/common/LoadingSpinner';
import { Plus, Trash2, X, Check, Eye, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const LiveMap = React.lazy(() => import('../../components/map/LiveMap'));

export default function GeofenceManager() {
  const { zones, loading, addZone, deleteZone } = useGeofence();
  
  // View states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Drawing form states
  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState('permitted'); // 'permitted' | 'restricted' | 'plant_boundary'
  const [zoneColor, setZoneColor] = useState('#3B82F6');
  const [drawingPoints, setDrawingPoints] = useState([]);
  
  // Map refocus coordinate
  const [focusCenter, setFocusCenter] = useState(null);

  // Auto-set standard color depending on zone type
  useEffect(() => {
    if (zoneType === 'permitted') setZoneColor('#3B82F6'); // Blue
    else if (zoneType === 'restricted') setZoneColor('#EF4444'); // Red
    else if (zoneType === 'plant_boundary') setZoneColor('#10B981'); // Green
  }, [zoneType]);

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setZoneName('');
    setDrawingPoints([]);
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      toast.error('Please enter a zone name.');
      return;
    }
    if (drawingPoints.length < 3) {
      toast.error('Polygons must contain at least 3 vertexes. Click on the map to add points.');
      return;
    }

    const { data, error } = await addZone({
      name: zoneName.trim(),
      type: zoneType,
      coordinates: drawingPoints,
      color: zoneColor,
    });

    if (!error) {
      setIsDrawing(false);
      setDrawingPoints([]);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (window.confirm('Are you sure you want to delete this geofence zone?')) {
      await deleteZone(zoneId);
    }
  };

  const handleFocusZone = (zone) => {
    if (zone.coordinates && zone.coordinates.length > 0) {
      // Find midpoint of coordinates to recenter map
      const lats = zone.coordinates.map(pt => pt.lat);
      const lngs = zone.coordinates.map(pt => pt.lng);
      const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
      const midLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
      setFocusCenter([midLat, midLng]);
      
      // Reset centering target after flight finishes
      setTimeout(() => setFocusCenter(null), 2000);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'permitted':
        return <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Permitted</span>;
      case 'restricted':
        return <span className="bg-red-50 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Restricted</span>;
      case 'plant_boundary':
        return <span className="bg-green-50 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Boundary</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100dvh-100px)] md:h-[calc(100dvh-40px)]">
        <MapSkeleton />
      </div>
    );
  }

  return (
    <div className="h-auto md:h-[calc(100dvh-80px)] lg:h-[calc(100dvh-64px)] flex flex-col md:flex-row relative overflow-visible md:overflow-hidden -mx-4 -my-6 md:mx-0 md:my-0 border border-gray-200 rounded-lg select-none">
      
      {/* 1. COLLAPSIBLE LEFT DRAWER PANE */}
      <div 
        className={`flex flex-col bg-white border-t md:border-t-0 md:border-r border-gray-250 z-20 transition-all duration-300 order-2 md:order-1 w-full md:w-[300px] shrink-0
          ${isSidebarOpen ? 'h-auto md:h-full' : 'h-0 overflow-hidden md:w-0'}
        `}
      >
        {/* Drawing Mode Form */}
        {isDrawing ? (
          <div className="flex flex-col h-full bg-gray-50/50 p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-250 pb-2">
              <h3 className="font-extrabold text-xs text-gray-900 uppercase tracking-wide">Draw Geofence</h3>
              <button 
                onClick={handleCancelDrawing}
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-3.5 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Plate Mill Warehouse"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Zone Type</label>
                <select
                  value={zoneType}
                  onChange={(e) => setZoneType(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:border-primary-500"
                >
                  <option value="permitted">Permitted Area</option>
                  <option value="restricted">Restricted Area</option>
                  <option value="plant_boundary">Plant Boundary Limit</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Polygon Fill Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={zoneColor}
                    onChange={(e) => setZoneColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-350 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-semibold text-gray-500 uppercase">{zoneColor}</span>
                </div>
              </div>

              {/* Drawing statistics */}
              <div className="bg-white border border-gray-200 rounded p-2.5 text-xs text-gray-550 leading-relaxed space-y-1">
                <p className="font-bold text-gray-700">Drawing Progress:</p>
                <p>Placed Points: <span className="font-bold text-primary-500 font-mono">{drawingPoints.length}</span></p>
                {drawingPoints.length < 3 ? (
                  <p className="text-[10px] text-red-500 font-medium leading-tight">Need at least 3 points to complete polygon.</p>
                ) : (
                  <p className="text-[10px] text-green-500 font-medium leading-tight">Minimum requirements met. Ready to save.</p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 h-11 md:h-8 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded flex items-center justify-center gap-1 shadow-sm transition-colors"
                >
                  <Check size={14} /> Save Zone
                </button>
                <button
                  type="button"
                  onClick={handleCancelDrawing}
                  className="h-11 md:h-8 px-3 bg-gray-150 hover:bg-gray-200 text-gray-750 text-xs font-bold rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Normal Mode: Zones List & Search */
          <div className="flex flex-col h-full">
            {/* Panel Header */}
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-xs text-gray-900 uppercase tracking-wide">Zone Geofences</h3>
                <span className="text-[10px] text-gray-400 font-semibold">{zones.length} active polygons</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Add Zone trigger */}
            <div className="p-3 border-b border-gray-100 shrink-0">
              <button
                onClick={handleStartDrawing}
                className="w-full h-11 md:h-8 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus size={15} /> Create Geofence
              </button>
            </div>

            {/* List scroll panel */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {zones.length === 0 ? (
                <p className="text-xs text-gray-450 text-center py-6">No geofence zones defined.</p>
              ) : (
                zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="p-3 hover:bg-gray-50 flex justify-between items-center gap-2 group transition-colors min-h-[56px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="h-2 w-2 rounded-full shrink-0" 
                          style={{ backgroundColor: zone.color }}
                        ></span>
                        <span className="font-bold text-xs text-gray-800 truncate block">{zone.zone_name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {getTypeBadge(zone.zone_type)}
                        <span className="text-[9px] text-gray-400 font-mono">{zone.coordinates.length} vertexes</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleFocusZone(zone)}
                        className="w-11 h-11 flex items-center justify-center text-gray-450 hover:text-primary-500 hover:bg-gray-100 rounded transition-colors"
                        title="Locate zone on map"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteZone(zone.id)}
                        className="w-11 h-11 flex items-center justify-center text-gray-450 hover:text-red-650 hover:bg-gray-100 rounded transition-colors"
                        title="Delete zone"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toggle button to expand sidebar on Desktop */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="hidden md:flex absolute left-3 top-3 bg-white hover:bg-gray-50 border border-gray-250 p-1.5 rounded-md shadow-md z-30 text-gray-500"
          title="Open Geofences List"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* 2. MAP COMPONENT WITH DRAWING ACTIONS */}
      <div className="order-1 md:order-2 flex-1 w-full h-[250px] md:h-full relative z-10">
        <Suspense fallback={<MapSkeleton />}>
          <LiveMap
            zones={zones}
            isDrawing={isDrawing}
            drawingPoints={drawingPoints}
            setDrawingPoints={setDrawingPoints}
            externalCenter={focusCenter}
          />
        </Suspense>

        {/* Mobile controls inside map overlay */}
        <div className="md:hidden absolute top-3 left-3 z-30 flex flex-col gap-2">
          {isDrawing ? (
            <div className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-lg flex flex-col gap-2 max-w-[240px] text-xs">
              <span className="font-extrabold uppercase text-[9px] text-gray-400 block border-b border-gray-100 pb-1">Define mobile geofence</span>
              <input
                type="text"
                placeholder="Zone Name"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className="w-full h-8 px-2 border rounded"
              />
              <select
                value={zoneType}
                onChange={(e) => setZoneType(e.target.value)}
                className="w-full h-8 px-1.5 border rounded"
              >
                <option value="permitted">Permitted Area</option>
                <option value="restricted">Restricted Area</option>
                <option value="plant_boundary">Plant Boundary</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveZone}
                  className="flex-1 h-8 bg-primary-500 hover:bg-primary-600 text-white rounded text-[10px] font-bold"
                >
                  Save ({drawingPoints.length})
                </button>
                <button
                  onClick={handleCancelDrawing}
                  className="h-8 px-2 bg-gray-100 rounded text-[10px] font-bold text-gray-650"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartDrawing}
              className="bg-white border border-gray-250 py-1.5 px-3 rounded-lg shadow-md font-bold text-xs text-primary-500 flex items-center gap-1"
            >
              <Plus size={14} /> Add Geofence
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
