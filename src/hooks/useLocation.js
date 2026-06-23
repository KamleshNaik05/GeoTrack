import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { checkGeofenceBreaches, isPointInPolygon } from '../lib/geofenceUtils';
import toast from 'react-hot-toast';

export function useLocation() {
  const [isSharing, setIsSharing] = useState(false);
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [zones, setZones] = useState([]);

  const watchIdRef = useRef(null);
  const lastWriteTimeRef = useRef(0);
  const wasInsidePlantRef = useRef(false);

  // Fetch geofences on mount or when sharing is toggled
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { data, error: err } = await supabase.from('geofence_zones').select('*');
        if (err) throw err;
        setZones(data || []);
      } catch (err) {
        console.error('Error fetching geofence zones:', err.message);
      }
    };
    fetchZones();
  }, []);

  const handleLocationUpdate = async (position, userId) => {
    const { latitude, longitude, accuracy: gpsAccuracy } = position.coords;
    setCoords({ lat: latitude, lng: longitude });
    setAccuracy(gpsAccuracy);
    setError(null);

    const currentTime = Date.now();
    // Debounce database writes to max once every 5 seconds
    if (currentTime - lastWriteTimeRef.current < 5000) {
      return;
    }
    lastWriteTimeRef.current = currentTime;

    try {
      // 1. Upsert Location to locations table
      const { data: existingLoc } = await supabase
        .from('locations')
        .select('id')
        .eq('trainee_id', userId)
        .maybeSingle();

      if (existingLoc) {
        await supabase
          .from('locations')
          .update({
            latitude,
            longitude,
            accuracy: gpsAccuracy,
            updated_at: new Date().toISOString(),
          })
          .eq('trainee_id', userId);
      } else {
        await supabase
          .from('locations')
          .insert({
            trainee_id: userId,
            latitude,
            longitude,
            accuracy: gpsAccuracy,
            updated_at: new Date().toISOString(),
          });
      }

      // 2. Geofence checks
      if (zones.length === 0) return;

      const currentPoint = { lat: latitude, lng: longitude };

      // A. Check if user is inside the overall Plant Boundary
      const plantBoundaryZones = zones.filter(z => z.zone_type === 'plant_boundary');
      const isCurrentlyInsidePlant = plantBoundaryZones.length > 0
        ? plantBoundaryZones.some(zone => isPointInPolygon(currentPoint, zone.coordinates))
        : true; // Default to true if not boundary zone is set up

      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format

      // B. Auto Check-in/Check-out
      if (plantBoundaryZones.length > 0) {
        if (isCurrentlyInsidePlant && !wasInsidePlantRef.current) {
          // Entered plant boundary -> Auto check-in
          const { data: attendanceRecord, error: attError } = await supabase
            .from('attendance')
            .select('*')
            .eq('trainee_id', userId)
            .eq('date', todayStr)
            .maybeSingle();

          if (!attendanceRecord) {
            // First time entering plant today -> check-in
            const now = new Date();
            const checkInTime = now.toISOString();

            // 1. Fetch user's profile shift_code
            let shiftCode = 'A';
            try {
              const { data: pData } = await supabase
                .from('profiles')
                .select('shift_code')
                .eq('id', userId)
                .single();
              if (pData?.shift_code) shiftCode = pData.shift_code;
            } catch (err) {
              console.error('Error fetching shift_code for late detection:', err);
            }

            // 2. Fetch shift details from shifts table
            let startTimeStr = '06:00:00';
            try {
              const { data: sData } = await supabase
                .from('shifts')
                .select('start_time')
                .eq('shift_code', shiftCode)
                .single();
              if (sData?.start_time) startTimeStr = sData.start_time;
            } catch (err) {
              console.error('Error fetching shift start_time:', err);
            }

            // 3. Define "late" using circular clock logic
            const [sHour, sMin, sSec] = startTimeStr.split(':').map(Number);
            const shiftStartSeconds = sHour * 3600 + sMin * 60 + sSec;
            const checkInSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

            let diff = checkInSeconds - shiftStartSeconds;
            if (diff < -43200) {
              diff += 86400; // check-in after midnight for Shift C
            } else if (diff > 43200) {
              diff -= 86400; // checked in early for next shift
            }

            const isLate = diff > 900; // 15 minutes grace period (900 seconds)
            const status = isLate ? 'late' : 'present';

            const { error: insErr } = await supabase
              .from('attendance')
              .insert({
                trainee_id: userId,
                date: todayStr,
                check_in: checkInTime,
                status: status,
              });

            if (!insErr) {
              toast.success(`Auto Check-in: Plant entered at ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Status: ${status.toUpperCase()}`);
            }
          }
          wasInsidePlantRef.current = true;
        } else if (!isCurrentlyInsidePlant && wasInsidePlantRef.current) {
          // Exited plant boundary -> Auto check-out
          const { data: attendanceRecord } = await supabase
            .from('attendance')
            .select('*')
            .eq('trainee_id', userId)
            .eq('date', todayStr)
            .maybeSingle();

          const now = new Date();

          if (attendanceRecord && !attendanceRecord.check_out) {
            await supabase
              .from('attendance')
              .update({
                check_out: now.toISOString(),
              })
              .eq('id', attendanceRecord.id);

            toast.success(`Auto Check-out: Plant exited at ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
          }

          // Trigger a low severity geofence breach alert for exiting plant boundary
          const plantBoundaryZone = plantBoundaryZones[0];
          await supabase
            .from('alerts')
            .insert({
              trainee_id: userId,
              alert_type: 'geofence_breach',
              latitude,
              longitude,
              zone_id: plantBoundaryZone?.id || null,
              message: `Geofence Breach: Trainee exited plant boundary limit "${plantBoundaryZone?.zone_name || 'Plant Boundary'}" (left plant early)`,
              severity: 'low',
              resolved: false,
            });

          wasInsidePlantRef.current = false;
        }
      }

      // C. Scan for active Geofence Breaches (Restricted or Permitted)
      const breaches = checkGeofenceBreaches(currentPoint, zones);
      
      for (const zone of breaches) {
        // Look for existing unresolved alerts for this zone
        const { data: existingAlert } = await supabase
          .from('alerts')
          .select('id')
          .eq('trainee_id', userId)
          .eq('zone_id', zone.id)
          .eq('resolved', false)
          .maybeSingle();

        if (!existingAlert) {
          // Dispatch a new alert
          const message = zone.zone_type === 'restricted'
            ? `Safety Breach: Trainee entered restricted area "${zone.zone_name}"`
            : `Geofence Breach: Trainee stepped outside permitted area "${zone.zone_name}"`;

          const severity = zone.zone_type === 'restricted' ? 'high' : 'medium';

          const { error: alertErr } = await supabase
            .from('alerts')
            .insert({
              trainee_id: userId,
              alert_type: 'geofence_breach',
              latitude,
              longitude,
              zone_id: zone.id,
              message,
              severity,
              resolved: false,
            });

          if (!alertErr) {
            toast.error(`Warning: Geofence breach in ${zone.zone_name}! Admin notified.`, {
              duration: 6000,
            });
          }
        }
      }

    } catch (err) {
      console.error('Error during location update processing:', err.message);
    }
  };

  const startTracking = (userId) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      toast.error('Location tracking is not supported by this browser.');
      return;
    }

    setIsSharing(true);

    // Initial positioning check
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleLocationUpdate(position, userId);
      },
      (err) => {
        console.warn('Initial geolocation check failed:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        handleLocationUpdate(position, userId);
      },
      (err) => {
        let msg = 'Failed to watch GPS position.';
        if (err.code === 1) {
          msg = 'GPS permission denied. Please allow location access in your browser settings.';
        }
        setError(msg);
        setIsSharing(false);
        toast.error(msg, { duration: 5000 });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
    setCoords(null);
    setAccuracy(null);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isSharing,
    coords,
    error,
    accuracy,
    startTracking,
    stopTracking,
  };
}
