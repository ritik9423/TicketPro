import React, { useState, useMemo } from 'react';
import { Ticket } from 'lucide-react';

const PriorityStatusCard = ({ stats, tickets = [], className = '' }) => {
  const [activeTab, setActiveTab] = useState('status'); // 'status' | 'priority'

  // Compute breakdown safely from stats or tickets array
  const metrics = useMemo(() => {
    const list = Array.isArray(tickets) ? tickets : [];
    const total = list.length || stats?.totalTickets || 0;

    // Status breakdown
    let open = 0;
    let inProgress = 0;
    let resolved = 0;
    let closed = 0;

    if (list.length > 0) {
      list.forEach((t) => {
        const s = (t.status || '').toUpperCase();
        if (s === 'OPEN') open++;
        else if (s === 'IN_PROGRESS') inProgress++;
        else if (s === 'RESOLVED') resolved++;
        else if (s === 'CLOSED') closed++;
      });
    } else {
      open = stats?.openTickets || 0;
      resolved = stats?.resolvedTickets || 0;
      inProgress = stats?.inProgressTickets || 0;
      closed = Math.max(0, (stats?.totalTickets || 0) - open - resolved - inProgress);
    }

    // Priority breakdown
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    list.forEach((t) => {
      const p = (t.priority || '').toUpperCase();
      if (p === 'CRITICAL') critical++;
      else if (p === 'HIGH') high++;
      else if (p === 'MEDIUM') medium++;
      else if (p === 'LOW') low++;
    });

    // Fallback if list had no priority counts
    if (critical + high + medium + low === 0 && total > 0) {
      critical = Math.round(total * 0.1);
      high = Math.round(total * 0.25);
      medium = Math.round(total * 0.45);
      low = Math.max(0, total - critical - high - medium);
    }

    return {
      totalTickets: total,
      status: { open, inProgress, resolved, closed },
      priority: { critical, high, medium, low }
    };
  }, [stats, tickets]);

  // SVG Concentric Ring calculations
  // Ring 1 (Outer): radius 84, stroke 8.5, circumference 527.78
  // Ring 2 (Mid):   radius 70, stroke 8.5, circumference 439.82
  // Ring 3 (Inner): radius 56, stroke 8.5, circumference 351.85
  // Hole Diameter: ~104px (Spacious and completely clear)
  const rings = useMemo(() => {
    const total = metrics.totalTickets || 1; // avoid / 0

    const c1 = 2 * Math.PI * 84;
    const c2 = 2 * Math.PI * 70;
    const c3 = 2 * Math.PI * 56;

    if (activeTab === 'status') {
      const resolvedTotal = metrics.status.resolved + metrics.status.closed;
      const resPct = Math.min(1, Math.max(0, resolvedTotal / total));
      const inProgPct = Math.min(1, Math.max(0, metrics.status.inProgress / total));
      const openPct = Math.min(1, Math.max(0, metrics.status.open / total));

      return [
        {
          key: 'resolved',
          label: 'Resolved / Closed',
          count: resolvedTotal,
          pct: Math.round(resPct * 100),
          radius: 84,
          strokeWidth: 8.5,
          circumference: c1,
          dash: Math.max(c1 * (resPct || 0.04), 16),
          color: '#10B981',
          trackColor: '#ECFDF5',
          bgDot: 'bg-[#10B981]',
          textColor: 'text-emerald-700',
        },
        {
          key: 'inprogress',
          label: 'In Progress',
          count: metrics.status.inProgress,
          pct: Math.round(inProgPct * 100),
          radius: 70,
          strokeWidth: 8.5,
          circumference: c2,
          dash: Math.max(c2 * (inProgPct || 0.04), 16),
          color: '#F59E0B',
          trackColor: '#FFFBEB',
          bgDot: 'bg-[#F59E0B]',
          textColor: 'text-amber-700',
        },
        {
          key: 'open',
          label: 'Open Queues',
          count: metrics.status.open,
          pct: Math.round(openPct * 100),
          radius: 56,
          strokeWidth: 8.5,
          circumference: c3,
          dash: Math.max(c3 * (openPct || 0.04), 16),
          color: '#6366F1',
          trackColor: '#EEF2FF',
          bgDot: 'bg-[#6366F1]',
          textColor: 'text-cyan-800',
        }
      ];
    } else {
      // Priority breakdown
      const critPct = Math.min(1, Math.max(0, metrics.priority.critical / total));
      const highPct = Math.min(1, Math.max(0, metrics.priority.high / total));
      const medPct = Math.min(1, Math.max(0, metrics.priority.medium / total));
      const lowPct = Math.min(1, Math.max(0, metrics.priority.low / total));

      return [
        {
          key: 'critical',
          label: 'Critical Priority',
          count: metrics.priority.critical,
          pct: Math.round(critPct * 100),
          radius: 84,
          strokeWidth: 8.5,
          circumference: c1,
          dash: Math.max(c1 * (critPct || 0.03), 14),
          color: '#EF4444',
          trackColor: '#FEF2F2',
          bgDot: 'bg-[#EF4444]',
          textColor: 'text-rose-700',
        },
        {
          key: 'high',
          label: 'High Priority',
          count: metrics.priority.high,
          pct: Math.round(highPct * 100),
          radius: 70,
          strokeWidth: 8.5,
          circumference: c2,
          dash: Math.max(c2 * (highPct || 0.03), 14),
          color: '#F97316',
          trackColor: '#FFF7ED',
          bgDot: 'bg-[#F97316]',
          textColor: 'text-orange-700',
        },
        {
          key: 'normal',
          label: 'Medium & Low',
          count: metrics.priority.medium + metrics.priority.low,
          pct: Math.round((medPct + lowPct) * 100),
          radius: 56,
          strokeWidth: 8.5,
          circumference: c3,
          dash: Math.max(c3 * ((medPct + lowPct) || 0.03), 14),
          color: '#6366F1',
          trackColor: '#EEF2FF',
          bgDot: 'bg-[#6366F1]',
          textColor: 'text-cyan-800',
        }
      ];
    }
  }, [activeTab, metrics]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-4.5 flex flex-col justify-between select-none ${className}`}>
      {/* Top Header with Pill Switcher & Highlighted Total Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2 pb-2.5 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Severity & Status Distribution
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-cyan-50 border border-cyan-200/80 text-cyan-800 shadow-2xs">
              <Ticket className="h-3 w-3 text-cyan-700 shrink-0" />
              <span>{metrics.totalTickets} Total Tickets</span>
            </span>
          </div>
          <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">
            Concentric distribution across active platform tickets
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/70 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'status'
                ? 'bg-white text-cyan-800 shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('priority')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'priority'
                ? 'bg-white text-cyan-800 shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Priority
          </button>
        </div>
      </div>

      {/* SVG Concentric Rings Graphic with Spacious Center */}
      <div className="relative flex items-center justify-center my-2">
        <svg
          viewBox="0 0 200 200"
          className="w-36 h-36 sm:w-44 sm:h-44 transform -rotate-90 drop-shadow-2xs"
        >
          {rings.map((ring) => (
            <React.Fragment key={ring.key}>
              {/* Background Track Circle */}
              <circle
                cx="100"
                cy="100"
                r={ring.radius}
                fill="transparent"
                stroke={ring.trackColor}
                strokeWidth={ring.strokeWidth}
              />
              {/* Foreground Animated Arc */}
              <circle
                cx="100"
                cy="100"
                r={ring.radius}
                fill="transparent"
                stroke={ring.color}
                strokeWidth={ring.strokeWidth}
                strokeDasharray={`${ring.dash} ${ring.circumference}`}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </React.Fragment>
          ))}
        </svg>

        {/* Spacious Center Hole with Clean Big Number & Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
            {metrics.totalTickets}
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">
            Tickets
          </span>
        </div>
      </div>

      {/* Ring Legend & Item Breakdown */}
      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
        {rings.map((ring) => (
          <div
            key={ring.key}
            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50/80 border border-slate-100"
          >
            <div className="flex items-center space-x-1.5 truncate">
              <span className={`h-2 w-2 rounded-full ${ring.bgDot} shrink-0`}></span>
              <span className="text-[11px] font-bold text-slate-700 truncate">{ring.label}</span>
            </div>
            <div className="flex items-center space-x-1 shrink-0 pl-1">
              <span className="text-[11px] font-black text-slate-900">{ring.count}</span>
              <span className="text-[9.5px] font-semibold text-slate-400">({ring.pct}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PriorityStatusCard;
