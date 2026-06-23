import React from 'react';

/**
 * Renders a small badge pill for an alert's severity level.
 * Low: bg-blue-50 text-blue-700 with blue-400 dot
 * Medium: bg-yellow-50 text-yellow-700 with yellow-500 dot
 * High: bg-orange-50 text-orange-700 with orange-500 dot
 * Critical: bg-red-50 text-red-700 with red-600 dot + pulsing dot animation
 */
export default function SeverityBadge({ severity }) {
  const normalized = (severity || 'medium').toLowerCase();

  let classes = 'bg-yellow-50 text-yellow-700';
  let dotColor = 'bg-yellow-500';
  let label = 'Medium';
  let isCritical = false;

  switch (normalized) {
    case 'low':
      classes = 'bg-blue-50 text-blue-700';
      dotColor = 'bg-blue-400';
      label = 'Low';
      break;
    case 'medium':
      classes = 'bg-yellow-50 text-yellow-700';
      dotColor = 'bg-yellow-500';
      label = 'Medium';
      break;
    case 'high':
      classes = 'bg-orange-50 text-orange-700';
      dotColor = 'bg-orange-500';
      label = 'High';
      break;
    case 'critical':
      classes = 'bg-red-50 text-red-700';
      dotColor = 'bg-red-600';
      label = 'Critical';
      isCritical = true;
      break;
    default:
      break;
  }

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 ${classes}`}>
      <span className="relative flex h-1.5 w-1.5">
        {isCritical && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`}></span>
      </span>
      <span className="font-semibold">{label}</span>
    </span>
  );
}
