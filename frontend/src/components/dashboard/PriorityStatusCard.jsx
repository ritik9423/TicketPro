import React, { useState, useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';

export const PriorityStatusCard = ({ stats = {}, tickets = [], className = '' }) => {
  const [activeTab, setActiveTab] = useState('status'); // default to 'status' matching req5_img1.png

  // Extract counts from stats or calculate from tickets list
  const metrics = useMemo(() => {
    const list = tickets && tickets.length > 0 ? tickets : (stats?.allTickets || stats?.recentTickets || []);
    
    let high = stats?.highPriority || 0;
    let med = stats?.mediumPriority || 0;
    let low = stats?.lowPriority || 0;

    let open = stats?.openTickets || 0;
    let inProg = stats?.inProgressTickets || 0;
    let closed = stats?.resolvedTickets || 0;
    let pending = 0;

    if (list.length > 0) {
      high = list.filter(t => ['HIGH', 'CRITICAL', 'URGENT'].includes((t.priority || '').toUpperCase())).length;
      med = list.filter(t => (t.priority || '').toUpperCase() === 'MEDIUM').length;
      low = list.filter(t => ['LOW', '', 'NORMAL', 'STANDARD'].includes((t.priority || '').toUpperCase())).length;

      open = list.filter(t => ['OPEN', 'NEW'].includes((t.status || '').toUpperCase())).length;
      inProg = list.filter(t => (t.status || '').toUpperCase() === 'IN_PROGRESS').length;
      closed = list.filter(t => ['RESOLVED', 'CLOSED'].includes((t.status || '').toUpperCase())).length;
      pending = list.filter(t => ['PENDING', 'WAITING', 'ON_HOLD', 'HOLD'].includes((t.status || '').toUpperCase())).length;
    }

    const totalTickets = stats?.totalTickets || (list.length > 0 ? list.length : 0);
    const totalStatus = open + inProg + closed + pending || totalTickets || 1;
    const totalPriority = high + med + low || totalTickets || 1;

    return {
      high,
      med,
      low,
      totalPriority,
      open,
      inProg,
      closed,
      pending,
      totalStatus,
      totalTickets
    };
  }, [stats, tickets]);

  // Concentric Rings Configuration
  // Center is at (100, 100), viewBox="0 0 200 200"
  // 4 Concentric Radii matching Image 2 zoom-in:
  // Ring 1 (Outer, Orange): r = 82, strokeWidth = 9
  // Ring 2 (Blue): r = 64, strokeWidth = 9
  // Ring 3 (Yellow): r = 46, strokeWidth = 9
  // Ring 4 (Inner, Purple): r = 28, strokeWidth = 9
  const rings = useMemo(() => {
    if (activeTab === 'status') {
      const total = metrics.totalStatus || 1;
      
      const closedPct = metrics.closed / total;
      const inProgPct = metrics.inProg / total;
      const openPct = metrics.open / total;
      const pendingPct = metrics.pending / total;

      const c1 = 2 * Math.PI * 82; // 515.22 (Outer)
      const c2 = 2 * Math.PI * 64; // 402.12
      const c3 = 2 * Math.PI * 46; // 289.03
      const c4 = 2 * Math.PI * 28; // 175.93 (Inner)

      return [
        {
          key: 'closed',
          label: 'Closed',
          count: metrics.closed,
          pct: Math.round(closedPct * 100),
          radius: 82,
          strokeWidth: 9.5,
          circumference: c1,
          dash: Math.max(c1 * (closedPct || 0.03), 12),
          color: '#F48353', // Warm Coral Orange (Outer Ring)
          trackColor: '#FFF2EB',
          bgDot: 'bg-[#F48353]',
          textColor: 'text-slate-900',
        },
        {
          key: 'inProg',
          label: 'In Progress',
          count: metrics.inProg,
          pct: Math.round(inProgPct * 100),
          radius: 64,
          strokeWidth: 9.5,
          circumference: c2,
          dash: Math.max(c2 * (inProgPct || 0.03), 12),
          color: '#4298FF', // Azure Blue (Ring 2)
          trackColor: '#EFF6FF',
          bgDot: 'bg-[#4298FF]',
          textColor: 'text-slate-900',
        },
        {
          key: 'open',
          label: 'Open',
          count: metrics.open,
          pct: Math.round(openPct * 100),
          radius: 46,
          strokeWidth: 9.5,
          circumference: c3,
          dash: Math.max(c3 * (openPct || 0.03), 12),
          color: '#EAB308', // Warm Gold/Yellow (Ring 3)
          trackColor: '#FEFCE8',
          bgDot: 'bg-[#EAB308]',
          textColor: 'text-slate-900',
        },
        {
          key: 'pending',
          label: 'Pending',
          count: metrics.pending,
          pct: Math.round(pendingPct * 100),
          radius: 28,
          strokeWidth: 9.5,
          circumference: c4,
          dash: Math.max(c4 * (pendingPct || 0.03), 8),
          color: '#A855F7', // Iris Purple (Inner Ring 4)
          trackColor: '#FAF5FF',
          bgDot: 'bg-[#A855F7]',
          textColor: 'text-slate-900',
        }
      ];
    } else {
      // Priority Mode
      const total = metrics.totalPriority || 1;
      const hPct = metrics.high / total;
      const mPct = metrics.med / total;
      const lPct = metrics.low / total;

      const c1 = 2 * Math.PI * 82;
      const c2 = 2 * Math.PI * 64;
      const c3 = 2 * Math.PI * 46;

      return [
        {
          key: 'high',
          label: 'High / Urgent',
          count: metrics.high,
          pct: Math.round(hPct * 100),
          radius: 82,
          strokeWidth: 9.5,
          circumference: c1,
          dash: Math.max(c1 * (hPct || 0.03), 12),
          color: '#F48353',
          trackColor: '#FFF2EB',
          bgDot: 'bg-[#F48353]',
          textColor: 'text-slate-900',
        },
        {
          key: 'med',
          label: 'Medium Priority',
          count: metrics.med,
          pct: Math.round(mPct * 100),
          radius: 64,
          strokeWidth: 9.5,
          circumference: c2,
          dash: Math.max(c2 * (mPct || 0.03), 12),
          color: '#EAB308',
          trackColor: '#FEFCE8',
          bgDot: 'bg-[#EAB308]',
          textColor: 'text-slate-900',
        },
        {
          key: 'low',
          label: 'Low / Standard',
          count: metrics.low,
          pct: Math.round(lPct * 100),
          radius: 46,
          strokeWidth: 9.5,
          circumference: c3,
          dash: Math.max(c3 * (lPct || 0.03), 12),
          color: '#4298FF',
          trackColor: '#EFF6FF',
          bgDot: 'bg-[#4298FF]',
          textColor: 'text-slate-900',
        }
      ];
    }
  }, [activeTab, metrics]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col justify-between ${className}`}>
      
      {/* Top Header matching req5_img1.png ("Tickets By Status" + 3 Dots / Tab switcher) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
            {activeTab === 'status' ? 'Tickets By Status' : 'Tickets By Priority'}
          </h3>
        </div>

        {/* Tab switcher + Options Menu */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Status
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('priority')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                activeTab === 'priority'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Priority
            </button>
          </div>

          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Body: Multi-Ring Concentric Radial Bar on Left, Stats List on Right */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center py-4">
        
        {/* Left Side: Concentric Multi-Ring Radial Progress Chart (Matching req5_img2.png) */}
        <div className="sm:col-span-5 flex justify-center items-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
              {rings.map((ring) => (
                <React.Fragment key={`ring-${ring.key}`}>
                  {/* Subtle Background Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r={ring.radius}
                    stroke={ring.trackColor}
                    strokeWidth={ring.strokeWidth}
                    fill="none"
                  />
                  {/* Progress Arc with Rounded Ends */}
                  <circle
                    cx="100"
                    cy="100"
                    r={ring.radius}
                    stroke={ring.color}
                    strokeWidth={ring.strokeWidth}
                    fill="none"
                    strokeDasharray={`${ring.dash} ${ring.circumference}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </React.Fragment>
              ))}
            </svg>

            {/* Inner Center Clean Dot */}
            <div className="absolute h-6 w-6 rounded-full bg-slate-50/80 border border-slate-200/60 flex items-center justify-center pointer-events-none">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            </div>
          </div>
        </div>

        {/* Right Side: Total Tickets KPI + Exact Rows from req5_img1.png */}
        <div className="sm:col-span-7 space-y-3">
          
          {/* Top Total Counter matching req5_img1.png ("Total 968") */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {metrics.totalTickets}
            </span>
          </div>

          {/* Metric Rows with Dot, Label, and Count/Percentage */}
          <div className="space-y-2">
            {rings.map((ring) => (
              <div
                key={ring.key}
                className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className={`h-3 w-3 rounded-full ${ring.bgDot} shrink-0 shadow-2xs`}></span>
                  <span className="text-xs font-bold text-slate-700 truncate">
                    {ring.label}
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs font-black text-slate-900">
                    {ring.count}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    ({ring.pct}%)
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Bottom Cross-Summary: Always shows both lifecycle & priority triage */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
        <span className="text-slate-400 font-medium">
          {activeTab === 'status' ? 'Priority Triage:' : 'Lifecycle Status:'}
        </span>

        {activeTab === 'status' ? (
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-[#F48353]"></span>
              <span>High: <strong>{metrics.high}</strong></span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-[#EAB308]"></span>
              <span>Med: <strong>{metrics.med}</strong></span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-[#4298FF]"></span>
              <span>Low: <strong>{metrics.low}</strong></span>
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-[#F48353]"></span>
              <span>Closed: <strong>{metrics.closed}</strong></span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-[#4298FF]"></span>
              <span>In Prog: <strong>{metrics.inProg}</strong></span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-[#EAB308]"></span>
              <span>Open: <strong>{metrics.open}</strong></span>
            </span>
          </div>
        )}
      </div>

    </div>
  );
};

export default PriorityStatusCard;
