import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';

export function Logo({ inverted = false }) {
  return (
    <Link to="/" className="flex items-center gap-3 group">
      <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-600 shadow-[0_0_20px_-4px] shadow-cyan-500/60 group-hover:scale-105 transition-transform">
        <Ticket className="h-5 w-5 text-white" />
      </span>
      <span className="leading-none select-none">
        <span
          className={`block text-xl sm:text-2xl font-black tracking-tight ${inverted ? 'text-white' : 'text-slate-900'}`}
        >
          Ticket
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Pro</span>
        </span>
        <span
          className={`mt-1 block font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.18em] ${inverted ? 'text-cyan-300' : 'text-slate-500'}`}
        >
          Smart ticketing · better support
        </span>
      </span>
    </Link>
  );
}

export default Logo;
