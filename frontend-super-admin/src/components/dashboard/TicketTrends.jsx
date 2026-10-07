import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

export const TicketTrends = ({ tickets = [], className = '' }) => {
  const [timeRange, setTimeRange] = useState('Weekly');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Derive current month name and year for the center header
  const currentPeriodName = useMemo(() => {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();
    if (timeRange === 'Weekly') return `This Week • ${month} ${year}`;
    if (timeRange === 'Monthly') return `${month} ${year}`;
    return `${year} Annual Overview`;
  }, [timeRange]);

  const parseTicketDate = (t) => {
    const raw = t.createdAt || t.created_at || t.creationDate || t.date;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const { labels, openData, closedData, totalOpen, totalClosed } = useMemo(() => {
    let lbls = [];
    let opens = [];
    let closeds = [];

    const now = new Date();

    if (timeRange === 'Monthly') {
      lbls = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      opens = [0, 0, 0, 0];
      closeds = [0, 0, 0, 0];

      tickets.forEach(t => {
        const d = parseTicketDate(t);
        const isClosed = (t.status || '').toUpperCase() === 'RESOLVED' || (t.status || '').toUpperCase() === 'CLOSED';

        if (d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          const dom = d.getDate();
          const wIdx = Math.min(3, Math.floor((dom - 1) / 7));
          if (isClosed) {
            closeds[wIdx]++;
          } else {
            opens[wIdx]++;
          }
        }
      });
    } else if (timeRange === 'Yearly') {
      lbls = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      opens = Array(12).fill(0);
      closeds = Array(12).fill(0);

      tickets.forEach(t => {
        const d = parseTicketDate(t);
        const isClosed = (t.status || '').toUpperCase() === 'RESOLVED' || (t.status || '').toUpperCase() === 'CLOSED';

        if (d && d.getFullYear() === now.getFullYear()) {
          const m = d.getMonth();
          if (isClosed) {
            closeds[m]++;
          } else {
            opens[m]++;
          }
        }
      });
    } else {
      // Default: Weekly (Mon - Sun)
      lbls = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      opens = [0, 0, 0, 0, 0, 0, 0];
      closeds = [0, 0, 0, 0, 0, 0, 0];

      const currentDay = now.getDay();
      const distToMon = (currentDay + 6) % 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - distToMon);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      tickets.forEach(t => {
        const d = parseTicketDate(t);
        const isClosed = (t.status || '').toUpperCase() === 'RESOLVED' || (t.status || '').toUpperCase() === 'CLOSED';

        if (d && d >= startOfWeek && d <= endOfWeek) {
          const dayIdx = (d.getDay() + 6) % 7;
          if (isClosed) {
            closeds[dayIdx]++;
          } else {
            opens[dayIdx]++;
          }
        } else if (!d && tickets.length > 0) {
          const dayIdx = (now.getDay() + 6) % 7;
          if (isClosed) {
            closeds[dayIdx]++;
          } else {
            opens[dayIdx]++;
          }
        }
      });
    }

    const tOpen = opens.reduce((a, b) => a + b, 0);
    const tClosed = closeds.reduce((a, b) => a + b, 0);

    return {
      labels: lbls,
      openData: opens,
      closedData: closeds,
      totalOpen: tOpen,
      totalClosed: tClosed
    };
  }, [tickets, timeRange]);

  const maxVal = Math.max(...openData, ...closedData, 10);
  const chartHeight = 160;
  const chartWidth = 560;
  const paddingX = 35;
  const paddingY = 25;

  const pointsOpen = useMemo(() => {
    const step = (chartWidth - paddingX * 2) / (labels.length - 1 || 1);
    return openData.map((val, i) => {
      const x = paddingX + i * step;
      const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - paddingY * 2);
      return { x, y, val, label: labels[i] };
    });
  }, [openData, maxVal, labels]);

  const pointsClosed = useMemo(() => {
    const step = (chartWidth - paddingX * 2) / (labels.length - 1 || 1);
    return closedData.map((val, i) => {
      const x = paddingX + i * step;
      const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - paddingY * 2);
      return { x, y, val, label: labels[i] };
    });
  }, [closedData, maxVal, labels]);

  // Generate smooth SVG curve path
  const buildSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const pathOpen = useMemo(() => buildSmoothPath(pointsOpen), [pointsOpen]);
  const pathClosed = useMemo(() => buildSmoothPath(pointsClosed), [pointsClosed]);

  const areaOpen = useMemo(() => {
    if (pointsOpen.length === 0) return '';
    const first = pointsOpen[0];
    const last = pointsOpen[pointsOpen.length - 1];
    return `${pathOpen} L ${last.x} ${chartHeight - paddingY} L ${first.x} ${chartHeight - paddingY} Z`;
  }, [pathOpen, pointsOpen]);

  const areaClosed = useMemo(() => {
    if (pointsClosed.length === 0) return '';
    const first = pointsClosed[0];
    const last = pointsClosed[pointsClosed.length - 1];
    return `${pathClosed} L ${last.x} ${chartHeight - paddingY} L ${first.x} ${chartHeight - paddingY} Z`;
  }, [pathClosed, pointsClosed]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-4.5 flex flex-col justify-between select-none ${className}`}>
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Global Ticket Velocity Trends
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {currentPeriodName}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Real-time multi-tenant incoming volume vs resolution rates
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70 self-start sm:self-auto">
          {['Weekly', 'Monthly', 'Yearly'].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === range
                  ? 'bg-white text-indigo-700 shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Legend & Summary Counters */}
      <div className="flex items-center space-x-6 mb-2">
        <div className="flex items-center space-x-2">
          <span className="h-3 w-3 rounded-full bg-[#6366f1]"></span>
          <span className="text-xs font-bold text-slate-600">Open Tickets:</span>
          <span className="text-xs font-black text-slate-900">{totalOpen}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="h-3 w-3 rounded-full bg-[#10b981]"></span>
          <span className="text-xs font-bold text-slate-600">Closed Tickets:</span>
          <span className="text-xs font-black text-slate-900">{totalClosed}</span>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-36 sm:h-40 overflow-visible"
        >
          <defs>
            <linearGradient id="gradOpenSuper" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gradClosedSuper" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid horizontal dashed guidelines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = paddingY + ratio * (chartHeight - paddingY * 2);
            return (
              <line
                key={ratio}
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fills */}
          <path d={areaOpen} fill="url(#gradOpenSuper)" />
          <path d={areaClosed} fill="url(#gradClosedSuper)" />

          {/* Smooth Lines */}
          <path
            d={pathOpen}
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d={pathClosed}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Interactive Data Dots & Hover Hit-boxes */}
          {pointsOpen.map((pt, i) => (
            <g key={`dot-open-${i}`} className="cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === i ? 6 : 4}
                fill="#ffffff"
                stroke="#6366f1"
                strokeWidth="3"
                className="transition-all"
              />
            </g>
          ))}

          {pointsClosed.map((pt, i) => (
            <g key={`dot-closed-${i}`} className="cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === i ? 6 : 4}
                fill="#ffffff"
                stroke="#10b981"
                strokeWidth="3"
                className="transition-all"
              />
            </g>
          ))}

          {/* X Axis Labels */}
          {pointsOpen.map((pt, i) => (
            <text
              key={`label-${i}`}
              x={pt.x}
              y={chartHeight - 4}
              textAnchor="middle"
              className="text-[10px] font-bold fill-slate-400"
            >
              {pt.label}
            </text>
          ))}
        </svg>
      </div>

    </div>
  );
};

export default TicketTrends;
