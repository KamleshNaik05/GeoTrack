import React from 'react';

/**
 * Renders the custom status/alert badge pill with a colored leading circle.
 * Valid statuses: active, present, offline, absent, sos, breach, geofence_breach, late.
 */
export default function AlertBadge({ status }) {
  const normalized = (status || '').toLowerCase();
  
  let classes = 'bg-gray-100 text-gray-600';
  let dotClass = 'bg-gray-400';
  let label = status;
  let animateDot = false;

  switch (normalized) {
    case 'active':
    case 'present':
      classes = 'bg-green-50 text-green-700';
      dotClass = 'bg-green-500';
      label = normalized === 'active' ? 'Active' : 'Present';
      break;
    case 'offline':
    case 'absent':
      classes = 'bg-gray-100 text-gray-600';
      dotClass = 'bg-gray-400';
      label = normalized === 'offline' ? 'Offline' : 'Absent';
      break;
    case 'sos':
      classes = 'bg-red-50 text-red-700 border border-red-100';
      dotClass = 'bg-red-500';
      label = 'SOS';
      animateDot = true;
      break;
    case 'breach':
    case 'geofence_breach':
      classes = 'bg-orange-50 text-orange-700';
      dotClass = 'bg-orange-500';
      label = 'Breach';
      break;
    case 'late':
      classes = 'bg-yellow-50 text-yellow-700';
      dotClass = 'bg-yellow-500';
      label = 'Late';
      break;
    default:
      if (normalized.includes('pending') || normalized.includes('false') || normalized === 'unresolved') {
        classes = 'bg-red-50 text-red-700';
        dotClass = 'bg-red-500';
        label = 'Pending';
      } else if (normalized.includes('resolved') || normalized.includes('true')) {
        classes = 'bg-green-50 text-green-700';
        dotClass = 'bg-green-500';
        label = 'Resolved';
      }
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass} ${animateDot ? 'pulse-dot' : ''}`}></span>
      <span className="font-semibold">{label}</span>
    </span>
  );
}
