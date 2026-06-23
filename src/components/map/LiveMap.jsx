import React, { useEffect, useState } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  ZoomControl, 
  useMap, 
  useMapEvents,
  Marker,
  Polygon,
  Polyline
} from 'react-leaflet';
import L from 'leaflet';
import TraineeMarker from './TraineeMarker';
import GeofenceLayer from './GeofenceLayer';

// Helper component to handle flying the map view to specific coordinates or trainees
function MapViewController({ activeTraineeId, trainees, externalCenter }) {
  const map = useMap();

  useEffect(() => {
    if (externalCenter) {
      map.flyTo(externalCenter, map.getZoom(), { animate: true, duration: 1.5 });
      return;
    }

    if (activeTraineeId) {
      const activeTrainee = trainees.find(t => t.id === activeTraineeId);
      if (activeTrainee && activeTrainee.latitude && activeTrainee.longitude) {
        map.flyTo(
          [activeTrainee.latitude, activeTrainee.longitude], 
          17, 
          { animate: true, duration: 1.5 }
        );
      }
    }
  }, [activeTraineeId, trainees, externalCenter, map]);

  return null;
}

// Helper component to handle custom map clicks when in drawing mode
function MapClickEvents({ isDrawing, onMapClick }) {
  useMapEvents({
    click(e) {
      if (isDrawing && onMapClick) {
        onMapClick(e.latlng);
      }
    }
  });
  return null;
}

export default function LiveMap({
  center = [22.257, 84.885], // Center of RSP Plant
  zoom = 15,
  trainees = [],
  zones = [],
  activeTraineeId = null,
  externalCenter = null,
  isDrawing = false,
  drawingPoints = [],
  setDrawingPoints = null,
  sosAlerts = [], // list of today's SOS alerts to show red pulsers
}) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle map click to place drawing vertexes
  const handleMapClick = (latlng) => {
    if (setDrawingPoints) {
      setDrawingPoints((prev) => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
    }
  };

  // Render small teal squares as vertexes of the polygon being drawn
  const vertexIcon = L.divIcon({
    html: `<div class="w-2.5 h-2.5 bg-accent-500 border border-white rounded-sm shadow-md"></div>`,
    className: 'drawing-vertex-icon',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  return (
    <div className="w-full h-full relative border border-gray-200 rounded-lg overflow-hidden select-none">
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false} // Managed custom ZoomControl
        className="w-full h-full"
      >
        {/* CartoDB Positron clean map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Map View Controller for focus actions */}
        <MapViewController 
          activeTraineeId={activeTraineeId} 
          trainees={trainees} 
          externalCenter={externalCenter}
        />

        {/* Click events listener */}
        <MapClickEvents isDrawing={isDrawing} onMapClick={handleMapClick} />

        {/* Geofence Polygons */}
        <GeofenceLayer zones={zones} />

        {/* Live Trainees Markers */}
        {trainees.map((trainee) => {
          if (!trainee.latitude || !trainee.longitude) return null;
          const isTraineeActive = (Date.now() - new Date(trainee.updated_at).getTime()) < 300000; // Active if updated in last 5m
          const hasSos = sosAlerts.some(a => a.trainee_id === trainee.id && !a.resolved);

          return (
            <TraineeMarker
              key={trainee.id}
              trainee={trainee}
              position={[trainee.latitude, trainee.longitude]}
              isActive={isTraineeActive}
              hasSos={hasSos}
            />
          );
        })}

        {/* Drawing Mode Renderings */}
        {isDrawing && drawingPoints.length > 0 && (
          <>
            {/* Markers for placed points */}
            {drawingPoints.map((pt, index) => (
              <Marker 
                key={index} 
                position={[pt.lat, pt.lng]} 
                icon={vertexIcon} 
              />
            ))}
            
            {/* Line connecting points */}
            {drawingPoints.length > 1 && (
              <Polyline 
                positions={drawingPoints.map(p => [p.lat, p.lng])} 
                pathOptions={{ color: '#1F6B75', weight: 2 }} 
              />
            )}

            {/* Polygon visual preview */}
            {drawingPoints.length >= 3 && (
              <Polygon 
                positions={drawingPoints.map(p => [p.lat, p.lng])} 
                pathOptions={{ color: '#1F6B75', fillColor: '#1F6B75', fillOpacity: 0.15, weight: 1 }} 
              />
            )}
          </>
        )}

        {/* Responsive Zoom Controls */}
        <ZoomControl position={isMobile ? 'bottomright' : 'topright'} />
      </MapContainer>

      {/* Floating hints / overlays */}
      {isDrawing && (
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm border border-gray-200 px-3 py-1.5 rounded-md shadow-md text-xs font-semibold text-gray-700 z-[1000] pointer-events-none">
          Click on the map to define polygon vertexes.
        </div>
      )}
    </div>
  );
}
