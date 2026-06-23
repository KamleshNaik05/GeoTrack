import React from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { formatTimestamp } from '../../lib/locationUtils';
import { X } from 'lucide-react';
import GeofenceLayer from '../map/GeofenceLayer';

export default function SOSModal({ isOpen, onClose, alert, traineeName, zones = [] }) {
  if (!isOpen || !alert) return null;

  const position = [alert.latitude, alert.longitude];

  // Custom red pulse icon for Leaflet
  const alertIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="pulse-ring-sos"></div>
        <div class="w-5 h-5 rounded-full bg-red-600 border border-white shadow-md relative z-10"></div>
      </div>
    `,
    className: 'alert-sos-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      ></div>

      {/* Responsive Modal Card: Bottom Sheet on Mobile, Centered Dialog on Desktop */}
      <div 
        className="bg-white w-full md:max-w-lg md:relative md:rounded-xl md:max-h-none fixed bottom-0 left-0 right-0 rounded-t-2xl max-h-[90dvh] overflow-y-auto translate-y-0 shadow-2xl flex flex-col z-10 transition-transform duration-300 transform"
      >
        {/* Mobile Drag Handle */}
        <div className="md:hidden shrink-0 mt-3 mb-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto"></div>
        </div>

        {/* Modal Header */}
        <div className="p-4 flex justify-between items-center border-b border-gray-200 shrink-0 bg-gray-50">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide text-red-600 flex items-center gap-1.5">
              <span>🚨</span> {alert.alert_type === 'SOS' ? 'SOS Distress Location' : 'Geofence Breach Spot'}
            </h3>
            <span className="text-[10px] text-gray-550 font-semibold">{formatTimestamp(alert.created_at)}</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
            <div>
              <span className="text-gray-400 uppercase tracking-wide font-medium block text-[9px]">Trainee Name</span>
              <span className="text-gray-700 font-semibold">{traineeName || 'Unknown Trainee'}</span>
            </div>
            <div>
              <span className="text-gray-400 uppercase tracking-wide font-medium block text-[9px]">Type</span>
              <span className="text-gray-750 font-semibold uppercase">{alert.alert_type}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400 uppercase tracking-wide font-medium block text-[9px]">Description</span>
              <span className="text-gray-700">{alert.message || 'No additional alert details provided.'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400 uppercase tracking-wide font-medium block text-[9px]">Coordinates</span>
              <span className="text-gray-700 font-mono">{alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</span>
            </div>
          </div>

          {/* Mini-map Container */}
          <div className="h-56 md:h-64 border border-gray-250 rounded-lg overflow-hidden relative">
            <MapContainer
              center={position}
              zoom={16}
              zoomControl={false}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; CARTO'
              />
              <GeofenceLayer zones={zones} />
              <Marker position={position} icon={alertIcon} />
              <Circle 
                center={position} 
                radius={30} 
                pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.1, weight: 1 }} 
              />
            </MapContainer>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-150 bg-gray-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="h-11 md:h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white font-medium text-xs rounded-lg shadow-sm transition-colors duration-150 flex items-center justify-center"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
