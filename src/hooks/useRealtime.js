import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

/**
 * Uses Web Audio API to play localized sound alarms.
 * @param {string} type - 'sos' (double high-pitch alarm) or 'warning' (short warning tone)
 */
export function playAlertSound(type = 'sos') {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (type === 'sos') {
      // Two-tone urgent siren
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // High beep
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, audioCtx.currentTime); // Low harmonic
      
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      
      osc1.start();
      osc2.start();

      // Pulse the siren
      setTimeout(() => {
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        setTimeout(() => {
          gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
          setTimeout(() => {
            osc1.stop();
            osc2.stop();
            audioCtx.close();
          }, 200);
        }, 100);
      }, 200);

    } else {
      // Standard notification alert beep
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 150);
    }
  } catch (err) {
    console.warn('Web Audio API playback blocked or unsupported:', err.message);
  }
}

/**
 * Hook to listen to Supabase realtime channels for locations and alerts.
 */
export function useRealtime(onLocationChange, onAlertInsert) {
  useEffect(() => {
    // 1. Subscribe to locations updates
    const locationChannel = supabase
      .channel('realtime-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations' },
        (payload) => {
          if (onLocationChange) {
            onLocationChange(payload);
          }
        }
      )
      .subscribe();

    // 2. Subscribe to alerts insertion
    const alertChannel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        async (payload) => {
          const newAlert = payload.new;
          
          // Fetch the trainee name in the background
          let traineeName = 'Trainee';
          try {
            const { data } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newAlert.trainee_id)
              .single();
            if (data?.full_name) {
              traineeName = data.full_name;
            }
          } catch (e) {
            console.error('Failed to query profile for realtime alert:', e.message);
          }

          // Trigger distinct sound + custom styled toast
          if (newAlert.alert_type === 'SOS') {
            playAlertSound('sos');
            toast.error(
              `🚨 EMERGENCY SOS: Trainee ${traineeName} has triggered distress!`,
              {
                duration: 9000,
                icon: '🚨',
                style: {
                  border: '1px solid #EF4444',
                  padding: '16px',
                  color: '#B91C1C',
                  background: '#FEF2F2',
                },
              }
            );
          } else {
            playAlertSound('warning');
            toast(
              `⚠️ GEOFENCE BREACH: ${traineeName} - ${newAlert.message}`,
              {
                duration: 6500,
                icon: '⚠️',
                style: {
                  border: '1px solid #F59E0B',
                  padding: '16px',
                  color: '#B45309',
                  background: '#FFFBEB',
                },
              }
            );
          }

          if (onAlertInsert) {
            onAlertInsert(newAlert);
          }
        }
      )
      .subscribe();

    // Cleanup channels on component destruction
    return () => {
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(alertChannel);
    };
  }, [onLocationChange, onAlertInsert]);
}
