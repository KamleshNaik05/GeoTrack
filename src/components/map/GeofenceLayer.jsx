import React from 'react';
import { Polygon, Tooltip } from 'react-leaflet';

/**
 * Renders geofence zones as Leaflet Polygons.
 * Coordinates are array of {lat, lng} objects.
 */
export default function GeofenceLayer({ zones }) {
  if (!zones || zones.length === 0) return null;

  return (
    <>
      {zones.map((zone) => {
        // MapCoordinates coordinates: coordinates in database are saved as jsonb (array of {lat, lng})
        // react-leaflet Polygon requires array of [lat, lng] or {lat, lng}
        const positions = zone.coordinates.map((pt) => [pt.lat, pt.lng]);
        const color = zone.color || '#3B82F6';

        return (
          <Polygon
            key={zone.id}
            positions={positions}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.08,
              weight: 2,
              dashArray: zone.zone_type === 'plant_boundary' ? '5, 5' : undefined,
            }}
          >
            <Tooltip sticky direction="top" className="custom-geofence-tooltip text-xs font-semibold">
              <div className="p-0.5 space-y-0.5">
                <p className="font-bold text-gray-800">{zone.zone_name}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                  Type: {zone.zone_type.replace('_', ' ')}
                </p>
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
