import React from 'react';

export default function LoadingSpinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4'
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-primary-500 border-t-transparent ${sizeClasses[size]}`}></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-10 bg-gray-200 rounded-md w-full"></div>
      {/* Body Rows Skeleton */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 py-2 border-b border-gray-100">
          {[...Array(cols)].map((_, j) => (
            <div 
              key={j} 
              className={`h-5 bg-gray-150 rounded ${
                j === 0 ? 'w-1/4' : j === 1 ? 'w-1/6' : 'flex-1'
              }`}
              style={{ backgroundColor: '#E2E8F0' }}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        <div className="h-6 w-6 bg-gray-200 rounded-md"></div>
      </div>
      <div className="h-7 bg-gray-300 rounded w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center animate-pulse border border-gray-200 rounded-lg">
      <div className="text-center space-y-2">
        <div className="text-gray-400 font-medium text-sm">Loading map...</div>
        <div className="w-24 h-1 bg-gray-200 mx-auto rounded overflow-hidden">
          <div className="h-full bg-primary-500 animate-infinite-loading w-1/2"></div>
        </div>
      </div>
    </div>
  );
}
