import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { formatTimestamp } from '../../lib/locationUtils';
import AlertBadge from '../common/AlertBadge';

/**
 * Custom trainee position marker rendering as a navy circle with initials and pulse ring.
 */
export default function TraineeMarker({ trainee, position, isActive, hasSos, onClick }) {
  const initials = trainee.full_name
    ? trainee.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'T';

  // Customize ring color based on SOS alarm state or normal tracking
  const ringClass = hasSos ? 'pulse-ring-sos' : 'pulse-ring';
  const circleColor = hasSos ? 'bg-red-600' : 'bg-primary-500';

  const htmlContent = `
    <div class="relative flex items-center justify-center w-9 h-9">
      ${isActive || hasSos ? `<div class="${ringClass}"></div>` : ''}
      <div class="w-9 h-9 rounded-full ${circleColor} text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-md relative z-10 select-none transition-colors duration-250">
        ${initials}
      </div>
    </div>
  `;

  const customIcon = L.divIcon({
    html: htmlContent,
    className: 'custom-trainee-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });

  return (
    <Marker position={position} icon={customIcon} eventHandlers={{ click: onClick }}>
      <Popup className="custom-leaflet-popup">
        <div className="p-1 min-w-[200px] text-gray-700">
          <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 mb-1.5">
            <span className="font-semibold text-sm truncate">{trainee.full_name}</span>
            <AlertBadge status={hasSos ? 'sos' : (isActive ? 'active' : 'offline')} />
          </div>
          <div className="text-xs space-y-1">
            <div>
              <span className="text-gray-400 uppercase tracking-wide font-medium block text-[9px]">Division</span>
              <span className="text-gray-700 font-semibold">{trainee.division || 'RMHP'}</span>
            </div>
            <div>
              <span className="text-gray-400 uppercase tracking-wide font-medium block text-[9px]">Trainee ID</span>
              <span className="text-gray-700 font-semibold">{trainee.employee_id || 'TR-001'}</span>
            </div>
            <div>
              <span className="text-gray-400 uppercase tracking-wide font-medium block text-[9px]">Last Signal</span>
              <span className="text-gray-700">{formatTimestamp(trainee.updated_at)}</span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
