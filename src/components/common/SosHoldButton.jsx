import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { ShieldAlert } from 'lucide-react';

export default function SosHoldButton({ isMobileFAB = false }) {
  const { profile, coords, isSharing } = useAuth();
  const isTracking = !!isSharing;
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isHolding, setIsHolding] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  const HOLD_DURATION = 3000; // 3 seconds in ms

  const handleStart = (e) => {
    // Prevent default context menus on mobile
    if (e.cancelable) e.preventDefault();
    if (!isTracking) return; // ← block SOS if GPS off
    if (isTriggered) return;

    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(pct);

      if (elapsed >= HOLD_DURATION) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        handleTrigger();
      }
    }, 50); // check every 50ms
  };

  const handleEnd = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
    if (!isTriggered) {
      setProgress(0);
    }
  };

  const handleTrigger = async () => {
    setIsTriggered(true);
    setProgress(100);

    // Play visual feedback
    let lat = coords?.lat;
    let lng = coords?.lng;

    const insertSos = async (latitude, longitude) => {
      try {
        const { error } = await supabase.from('alerts').insert({
          trainee_id: profile.id,
          alert_type: 'SOS',
          severity: 'critical',
          latitude,
          longitude,
          message: 'Emergency SOS triggered by trainee.',
          resolved: false,
        });

        if (error) throw error;
        toast.success('SOS Alert Sent. Help is on the way.', {
          duration: 6000,
          icon: '🚨',
          style: {
            background: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FCA5A5',
            fontWeight: 'bold',
          },
        });
      } catch (err) {
        toast.error('Failed to send SOS alert: ' + err.message);
      }
    };

    if (!lat || !lng) {
      // Fetch coordinates on the fly if sharing was OFF
      const toastId = toast.loading('Locating GPS position for emergency SOS...');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          toast.dismiss(toastId);
          await insertSos(position.coords.latitude, position.coords.longitude);
        },
        async (err) => {
          toast.dismiss(toastId);
          toast.error('Location services unavailable. Sending SOS without coordinates.');
          await insertSos(null, null);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      await insertSos(lat, lng);
    }

    // Reset after 3 seconds
    setTimeout(() => {
      setIsTriggered(false);
      setProgress(0);
      setIsHolding(false);
    }, 3000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // SVG parameters
  const radius = isMobileFAB ? 24 : 52;
  const strokeWidth = isMobileFAB ? 3 : 5;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (isMobileFAB) {
    // Mobile Floating Action Button (FAB)
    return (
      <div 
        className="fixed bottom-20 right-5 md:hidden z-[99]"
        style={{ touchAction: 'none' }}
      >
        <button
          onPointerDown={handleStart}
          onPointerUp={handleEnd}
          onPointerLeave={handleEnd}
          disabled={!isTracking}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg relative transition-all duration-150 active:scale-95 select-none focus:outline-none
            ${!isTracking
              ? 'bg-gray-300 opacity-50 cursor-not-allowed text-gray-500'
              : isTriggered 
              ? 'bg-green-600 text-white' 
              : isHolding 
              ? 'bg-red-700 text-white' 
              : 'bg-red-650 text-white hover:bg-red-700 bg-red-600 before:content-[\'\'] before:absolute before:inset-0 before:rounded-full before:bg-red-600 before:animate-ping before:opacity-30'
            }
          `}
        >
          {/* SVG Progress Circle */}
          <svg
            className="absolute transform -rotate-90 pointer-events-none"
            width="56"
            height="56"
          >
            <circle
              stroke={!isTracking ? '#D1D5DB' : 'white'}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              r={normalizedRadius}
              cx="28"
              cy="28"
            />
          </svg>

          {/* Icon/Symbol */}
          <span className="text-white text-lg relative z-10 select-none pointer-events-none font-bold">
            {!isTracking ? '🚨' : isTriggered ? '✓' : isHolding ? `${Math.ceil((3000 - (progress/100)*3000)/1000)}s` : '🚨'}
          </span>
        </button>
      </div>
    );
  }

  // Dashboard Card version
  return (
    <div className="flex flex-col items-center justify-center p-4 h-full select-none">
      <div 
        className="relative flex items-center justify-center w-[130px] h-[130px]"
        style={{ touchAction: 'none' }}
      >
        <button
          onPointerDown={handleStart}
          onPointerUp={handleEnd}
          onPointerLeave={handleEnd}
          disabled={!isTracking}
          className={`w-[110px] h-[110px] rounded-full flex flex-col items-center justify-center shadow-md relative z-10 transition-colors duration-150 select-none active:scale-95 focus:outline-none
            ${!isTracking
              ? 'bg-gray-300 opacity-50 cursor-not-allowed text-gray-500'
              : isTriggered 
              ? 'bg-green-600 text-white' 
              : isHolding 
              ? 'bg-red-700 text-white' 
              : 'bg-red-650 text-white hover:bg-red-700 bg-red-600'
            }
          `}
        >
          {isTriggered ? (
            <span className="text-3xl font-bold">✓</span>
          ) : isHolding ? (
            <div className="text-center">
              <span className="text-2xl font-bold block">{Math.ceil((3000 - (progress/100)*3000)/1000)}s</span>
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">Hold</span>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center gap-1">
              <ShieldAlert size={26} className={isTracking ? "pulse-dot" : ""} />
              <span className="text-sm font-extrabold uppercase tracking-wider">SEND SOS</span>
            </div>
          )}
        </button>

        {/* SVG hold circular track indicator */}
        <svg
          className="absolute transform -rotate-90 pointer-events-none z-20"
          width="130"
          height="130"
        >
          <circle
            stroke={!isTracking ? '#D1D5DB' : isTriggered ? '#10B981' : '#EF4444'}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: isHolding ? 'none' : 'stroke-dashoffset 0.1s ease-out' }}
            r={normalizedRadius}
            cx="65"
            cy="65"
          />
        </svg>
      </div>

      <span className="text-xs text-red-500 font-semibold mt-4">
        {!isTracking ? 'Enable GPS to activate SOS' : isTriggered ? 'SOS Dispatched' : 'Hold for 3 seconds to trigger'}
      </span>

      {!isTracking && (
        <p className="text-xs text-center text-gray-400 mt-2">
          Turn on Location Sharing to enable SOS
        </p>
      )}
    </div>
  );
}
