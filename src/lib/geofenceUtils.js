/**
 * Ray Casting / Point-in-Polygon (PIP) algorithm.
 * Checks if a point is inside a polygon.
 * @param {object} point - { lat, lng }
 * @param {array} polygon - Array of { lat, lng } points
 * @returns {boolean} - true if point is inside polygon
 */
export function isPointInPolygon(point, polygon) {
  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) return false;
  
  const x = point.lng;
  const y = point.lat;
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = parseFloat(polygon[i].lng);
    const yi = parseFloat(polygon[i].lat);
    const xj = parseFloat(polygon[j].lng);
    const yj = parseFloat(polygon[j].lat);
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Checks a trainee's location against all active geofence zones.
 * If zone_type === 'restricted' AND point is INSIDE -> breach
 * If zone_type === 'permitted' AND point is OUTSIDE -> breach
 * 
 * @param {object} point - { lat, lng }
 * @param {array} zones - Array of geofence zones
 * @returns {array} - Array of breached zones (empty if all clear)
 */
export function checkGeofenceBreaches(point, zones) {
  const breaches = [];
  
  // Find if trainee is inside any plant boundary zone
  const plantBoundaryZones = zones.filter(z => z.zone_type === 'plant_boundary');
  let insidePlant = false;
  
  if (plantBoundaryZones.length > 0) {
    insidePlant = plantBoundaryZones.some(zone => isPointInPolygon(point, zone.coordinates));
  } else {
    // If no plant boundary zone is loaded yet, default to inside to avoid false positives for permitted zones
    insidePlant = true;
  }

  for (const zone of zones) {
    // Skip checking plant boundary for normal breaches (it has separate entry/exit logic for attendance)
    if (zone.zone_type === 'plant_boundary') continue;

    const isInside = isPointInPolygon(point, zone.coordinates);
    
    if (zone.zone_type === 'restricted' && isInside) {
      // Inside a restricted area is a breach
      breaches.push(zone);
    } else if (zone.zone_type === 'permitted' && !isInside && insidePlant) {
      // Outside a permitted area (but still within the plant boundary) is a breach
      breaches.push(zone);
    }
  }
  
  return breaches;
}
