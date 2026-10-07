import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

export const TicketTrends = ({ tickets = [], className = '' }) => {
  const [timeRange, setTimeRange] = useState('Weekly');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Derive current month name and year for the center header (e.g. "September 2026")
  const currentPeriodName = useMemo(() => {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();
    if (timeRange === 'Weekly') return `This Week • ${month} ${year}`;
    if (timeRange === 'Monthly') return `${month} ${year}`;
    return `${year} Annual Overview`;
  }, [timeRange]);

  // Safely parse date from various formats
  const parseTicketDate = (t) => {
    const raw = t.createdAt || t.created_at || t.creationDate || t.date;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  // Aggregate tickets for both Open/Created and Closed/Resolved series using REAL data
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
      // Default: Weekly (Mon - Sun for the current week)
      lbls = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      opens = [0, 0, 0, 0, 0, 0, 0];
      closeds = [0, 0, 0, 0, 0, 0, 0];

      // Calculate start and end of current week (Monday 00:00:00 to Sunday 23:59:59)
      const currentDay = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
      const distToMon = (currentDay + 6) % 7; // Mon=0, Tue=1 ... Sun=6
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
          // If ticket has no valid timestamp, fall back to today's column so real data is never lost
          const todayIdx = (now.getDay() + 6) % 7;
          if (isClosed) {
            closeds[todayIdx]++;
          } else {
            opens[todayIdx]++;
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

  // Coordinate Calculations & SVG Smoothing
  const { openPoints, closedPoints, openPath, closedPath, openArea, closedArea, yTicks, maxVal } = useMemo(() => {
    const rawMax = Math.max(...openData, ...closedData, 5);
    const max = Math.max(5, Math.ceil(rawMax / 5) * 5);

    const chartW = 540;
    const chartH = 150;
    const padL = 45;
    const padT = 25;
    const innerH = chartH - padT;

    const stepX = chartW / (labels.length - 1 || 1);

    const oPts = openData.map((val, i) => ({
      x: padL + i * stepX,
      y: padT + (innerH - (val / max) * innerH),
      val,
      label: labels[i]
    }));

    const cPts = closedData.map((val, i) => ({
      x: padL + i * stepX,
      y: padT + (innerH - (val / max) * innerH),
      val,
      label: labels[i]
    }));

    // Cubic spline smoothing
    const getSplinePath = (pts) => {
      if (!pts || pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
      let d = `M ${pts[0].x},${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
      }
      return d;
    };

    const oPath = getSplinePath(oPts);
    const cPath = getSplinePath(cPts);

    const baseLineY = padT + innerH;
    const oArea = oPts.length > 0
      ? `${oPath} L ${oPts[oPts.length - 1].x},${baseLineY} L ${oPts[0].x},${baseLineY} Z`
      : '';
    const cArea = cPts.length > 0
      ? `${cPath} L ${cPts[cPts.length - 1].x},${baseLineY} L ${cPts[0].x},${baseLineY} Z`
      : '';

    // Generate equidistant Y ticks
    const ticks = [
      { val: max, y: padT },
      { val: Math.round(max * 0.66), y: padT + innerH * 0.33 },
      { val: Math.round(max * 0.33), y: padT + innerH * 0.66 },
      { val: 0, y: baseLineY }
    ];

    return {
      openPoints: oPts,
      closedPoints: cPts,
      openPath: oPath,
      closedPath: cPath,
      openArea: oArea,
      closedArea: cArea,
      yTicks: ticks,
      maxVal: max
    };
  }, [labels, openData, closedData]);

  const hasAnyActivity = totalOpen > 0 || totalClosed > 0;

  return (
    <div className={`bg-card rounded-2xl border border-border/70 shadow-xs p-6 space-y-4 ${className}`}>
      {/* Top Header with Title and Range Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center space-x-2">
            <span>Ticket Trends</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visual trends and request velocity based on real ticket timestamps
          </p>
        </div>

        {/* Time Selector Pills */}
        <div className="flex items-center space-x-1 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
          {['Weekly', 'Monthly', 'Yearly'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTimeRange(tab)}
              className={`px-3.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === tab
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Center Sub-header: Current Month/Period & Dynamic KPI Badges */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 px-1">
        <div className="text-sm font-semibold text-foreground tracking-tight">
          {currentPeriodName}
        </div>

        {/* Dynamic Metric Pills - 100% Real Live Counts */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            <span className="h-2.5 w-2.5 rounded-full bg-[#D67D53] shadow-xs"></span>
            <span className="font-medium text-muted-foreground">Open Tickets:</span>
            <span className="font-bold text-[#D67D53]">{totalOpen}</span>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] shadow-xs"></span>
            <span className="font-medium text-muted-foreground">Closed Tickets:</span>
            <span className="font-bold text-[#10B981]">{totalClosed}</span>
          </div>
        </div>
      </div>

      {/* SVG Multi-Line Chart with Dual Smooth Gradients */}
      <div className="pt-2 relative">
        <svg
          className="w-full h-52 overflow-visible select-none"
          viewBox="0 0 620 185"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Teal Gradient for Closed Tickets */}
            <linearGradient id="tealGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>

            {/* Warm Terracotta / Orange Gradient for Open Tickets */}
            <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#D67D53" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#D67D53" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Reference Grid Lines & Y-Axis Labels */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1="45"
                y1={t.y}
                x2="595"
                y2={t.y}
                stroke="#F1F5F9"
                strokeWidth="1"
                strokeDasharray={t.val === 0 ? '0' : '4 4'}
              />
              <text
                x="35"
                y={t.y + 3.5}
                textAnchor="end"
                className="text-[10px] font-semibold fill-muted-foreground select-none"
              >
                {t.val}
              </text>
            </g>
          ))}

          {/* Area Fills */}
          {closedArea && <path d={closedArea} fill="url(#tealGrad)" />}
          {openArea && <path d={openArea} fill="url(#orangeGrad)" />}

          {/* Smooth Stroke Curves */}
          {closedPath && (
            <path
              d={closedPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {openPath && (
            <path
              d={openPath}
              fill="none"
              stroke="#D67D53"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover Crosshair Vertical Line */}
          {hoveredIndex !== null && openPoints[hoveredIndex] && (
            <line
              x1={openPoints[hoveredIndex].x}
              y1="25"
              x2={openPoints[hoveredIndex].x}
              y2="150"
              stroke="#94A3B8"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
          )}

          {/* Interactive Data Points & Bottom X-Axis Labels */}
          {openPoints.map((pt, idx) => {
            const cpt = closedPoints[idx];
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
              >
                {/* Hit area */}
                <rect
                  x={pt.x - 20}
                  y="20"
                  width="40"
                  height="145"
                  fill="transparent"
                />

                {/* Closed Ticket Dot (Teal) */}
                <circle
                  cx={cpt.x}
                  cy={cpt.y}
                  r={isHovered ? 5.5 : 4}
                  fill="#FFFFFF"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  className="transition-all duration-150"
                />

                {/* Open Ticket Dot (Orange) */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 4}
                  fill="#FFFFFF"
                  stroke="#D67D53"
                  strokeWidth="2.5"
                  className="transition-all duration-150"
                />

                {/* X-Axis Day/Label */}
                <text
                  x={pt.x}
                  y="172"
                  textAnchor="middle"
                  className={`text-[11px] select-none transition-colors ${
                    isHovered
                      ? 'font-bold fill-foreground'
                      : 'font-medium fill-muted-foreground'
                  }`}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip when hovering over a point */}
        {hoveredIndex !== null && openPoints[hoveredIndex] && (
          <div
            className="absolute -top-1 bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-lg text-xs pointer-events-none transform -translate-x-1/2 z-20 transition-all duration-150 backdrop-blur-xs"
            style={{
              left: `${(openPoints[hoveredIndex].x / 620) * 100}%`
            }}
          >
            <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-[11px] text-slate-300">
              {openPoints[hoveredIndex].label}
            </div>
            <div className="flex items-center space-x-2 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#D67D53]"></span>
              <span className="text-slate-300">Open:</span>
              <span className="font-bold text-white">{openPoints[hoveredIndex].val}</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] mt-0.5">
              <span className="h-2 w-2 rounded-full bg-[#10B981] border border-teal-300"></span>
              <span className="text-slate-300">Closed:</span>
              <span className="font-bold text-white">{closedPoints[hoveredIndex].val}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Legends */}
      <div className="flex items-center justify-center space-x-8 pt-3 border-t border-border/60 text-xs font-semibold text-muted-foreground">
        <div className="flex items-center space-x-2">
          <span className="h-3 w-3 rounded-full bg-[#D67D53] shadow-xs inline-block"></span>
          <span>Open Tickets</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="h-3 w-3 rounded-full bg-[#10B981] shadow-xs inline-block"></span>
          <span>Closed Tickets</span>
        </div>
      </div>
    </div>
  );
};

export default TicketTrends;
