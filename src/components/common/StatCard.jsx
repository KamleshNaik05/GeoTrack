import React from 'react';

/**
 * Metric card for dashboards.
 * @param {string} label - Small uppercase title
 * @param {string|number} value - Main number
 * @param {React.Component} icon - Lucide icon class
 * @param {string} color - Semantic color name for icon wrapper
 * @param {string} trend - Detail info shown at the bottom
 */
export default function StatCard({ label, value, icon: Icon, color = 'navy', trend }) {
  const colorBgs = {
    navy: 'bg-primary-50 text-primary-500',
    teal: 'bg-accent-50 text-accent-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
  };

  const currentBg = colorBgs[color] || colorBgs.navy;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm flex flex-col justify-between h-[100px] transition-colors duration-150 hover:border-gray-300">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${currentBg}`}>
            <Icon size={20} className="stroke-[2.5]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate block">{label}</span>
          <span className="text-xl sm:text-2xl font-bold text-primary-500 truncate block mt-0.5">{value}</span>
        </div>
      </div>
      {trend && (
        <div className="text-[10px] text-gray-500 truncate mt-1">
          {trend}
        </div>
      )}
    </div>
  );
}
