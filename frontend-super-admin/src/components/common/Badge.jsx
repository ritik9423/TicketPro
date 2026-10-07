import React from 'react';

const Badge = ({ children, variant = 'gray' }) => {
  const variants = {
    // Priority Badges
    low: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
    medium: 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20',
    high: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
    critical: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
    
    // Status Badges
    open: 'bg-blue-50 text-blue-700 border border-blue-200',
    in_progress: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    on_hold: 'bg-amber-50 text-amber-800 border border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    closed: 'bg-gray-100 text-gray-700 border border-gray-200',
    reopened: 'bg-purple-50 text-purple-700 border border-purple-200',

    // Generic
    active: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/10',
    inactive: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10',
    pending: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/10',
    suspended: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10',
    gray: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10',
  };

  const key = variant.toLowerCase().replace(' ', '_');
  const classes = variants[key] || variants.gray;

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {children}
    </span>
  );
};

export default Badge;
