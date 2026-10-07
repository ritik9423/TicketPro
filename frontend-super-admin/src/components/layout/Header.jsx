import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationPopover from './NotificationPopover';
import { LogOut, User, Menu, X, ShieldCheck, Ticket } from 'lucide-react';

const Header = ({ isMobileOpen, onToggleMobileMenu, onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleToggle = onToggleMobileMenu || onOpenMobileMenu;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs select-none transition-all">
      <div className="flex h-16 w-full items-center justify-between px-3 sm:px-6">
        
        {/* Left Side: Mobile Menu Button + TicketPro Brand Header */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-left min-w-0">
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden transition-colors cursor-pointer shrink-0 active:scale-95"
            title={isMobileOpen ? "Close Menu" : "Open Menu"}
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* TicketPro Brand Logo */}
          <div 
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer group shrink-0 py-0.5"
            title="TicketPro - Smart Ticketing • Better Support"
          >
            {/* Outstanding 3D Glassmorphic TicketPro Brand Emblem */}
            <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-300">
              <svg 
                viewBox="0 0 48 48" 
                className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 drop-shadow-[0_4px_12px_rgba(2,132,199,0.38)]" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="tpSaHdrBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d2ff" />
                    <stop offset="45%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="tpSaHdrSpecGloss" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="tpSaHdrBorderShine" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
                  </linearGradient>
                </defs>

                {/* Rich 3D Gradient Base Orb */}
                <circle cx="24" cy="24" r="22" fill="url(#tpSaHdrBrandGrad)" />
                
                {/* Specular 3D Glass Highlight Arc */}
                <ellipse cx="24" cy="14" rx="15" ry="8" fill="url(#tpSaHdrSpecGloss)" opacity="0.4" />
                
                {/* Crisp Inner Glass Ring */}
                <circle cx="24" cy="24" r="21" stroke="url(#tpSaHdrBorderShine)" strokeWidth="1.5" />

                {/* Ultra-Crisp Bespoke Ticket Emblem */}
                <g filter="drop-shadow(0 2px 4px rgba(12, 23, 47, 0.3))">
                  {/* Symmetrical Notched Ticket Body */}
                  <path 
                    d="M13 18.5 C13 16.57 14.57 15 16.5 15 H31.5 C33.43 15 35 16.57 35 18.5 V21 C33.34 21 32 22.34 32 24 C32 25.66 33.34 27 35 27 V29.5 C35 31.43 33.43 33 31.5 33 H16.5 C14.57 33 13 31.43 13 29.5 V27 C14.66 27 16 25.66 16 24 C16 22.34 14.66 21 13 21 Z" 
                    fill="none" 
                    stroke="#ffffff" 
                    strokeWidth="2.5" 
                    strokeLinejoin="round" 
                    strokeLinecap="round"
                  />
                  {/* Perforated Center Fold Line */}
                  <line x1="24" y1="18" x2="24" y2="30" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.5 3" />
                  {/* Ticket Accent Nodes */}
                  <circle cx="18.5" cy="24" r="1.4" fill="#ffffff" />
                  <circle cx="29.5" cy="24" r="1.4" fill="#ffffff" />
                </g>
              </svg>
            </div>

            {/* Brand Typography & Tagline Lockup (Exact match to brand design) */}
            <div className="w-fit flex flex-col items-stretch select-none">
              <div className="text-xl sm:text-2xl md:text-[25px] font-black tracking-tight leading-none text-center">
                <span className="text-[#050e24]">Ticket</span>
                <span className="bg-gradient-to-r from-[#1d68f0] via-[#0284c7] to-[#00b4d8] bg-clip-text text-transparent">Pro</span>
              </div>

              {/* Tagline Lockup: Tight gap right under TicketPro without blank void */}
              <div className="w-full mt-[2px] sm:mt-1 flex flex-col items-stretch">
                <div className="w-full flex items-center justify-between gap-1 sm:gap-1.5 text-[#0072ea] leading-none">
                  <span className="h-[2px] sm:h-[2.5px] flex-1 bg-[#0072ea] rounded-full min-w-[6px]" />
                  <span className="text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black tracking-[0.16em] sm:tracking-[0.18em] uppercase whitespace-nowrap shrink-0">
                    SMART TICKETING
                  </span>
                  <span className="h-[2px] sm:h-[2.5px] flex-1 bg-[#0072ea] rounded-full min-w-[6px]" />
                </div>
                <div className="w-full text-center text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black tracking-[0.22em] sm:tracking-[0.24em] text-[#0072ea] uppercase whitespace-nowrap leading-none mt-[2px]">
                  BETTER SUPPORT
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Notifications & Super Admin Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-3.5 shrink-0">
          
          {/* Interactive Multi-Tenant Notifications Popover */}
          <NotificationPopover />

          {/* User Info & Profile Avatar - clickable on all screens to reach /profile */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 border-l border-slate-200/80 pl-2 sm:pl-3.5">
            <div 
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-2 cursor-pointer p-1 rounded-2xl hover:bg-slate-50 transition-colors group"
              title="View Super Admin Profile"
            >
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#06b6d4] via-[#2563eb] to-[#4f46e5] font-black text-white uppercase text-xs shadow-xs shrink-0 ring-2 ring-cyan-100 group-hover:ring-cyan-300 transition-all">
                {user?.name ? user.name.charAt(0) : <User className="h-4 w-4" />}
              </div>
              
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                  {user?.name || 'Super Admin'}
                </p>
                <p className="text-[9px] font-extrabold text-[#0891b2] uppercase tracking-wider mt-0.5">
                  Platform Root
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              aria-label="Sign out of Super Admin"
              className="rounded-xl p-1.5 sm:p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer shrink-0 active:scale-95"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
