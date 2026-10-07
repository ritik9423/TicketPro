import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Battery,
  Bell,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Flame,
  Globe,
  Headphones,
  Layers,
  Lock,
  LogIn,
  Mail,
  Menu,
  MessageSquare,
  Plus,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  Truck,
  Users,
  Wifi,
  Workflow,
  X,
  Zap
} from 'lucide-react';

/* ==========================================================================
   STATIC DATA (30 ENTERPRISE COMPANIES & SYSTEM CAPABILITIES)
   ========================================================================== */

const ENTERPRISE_COMPANIES = [
  { name: 'IOCL', sub: 'Indian Oil', bg: '#ff7300', letter: 'IOCL', type: 'badge' },
  { name: 'Reliance', sub: 'Industries Ltd', bg: '#ac8e3c', letter: 'R', type: 'letter' },
  { name: 'Tata Motors', sub: 'Automotive', text: 'TATA', textSub: 'MOTORS', type: 'text' },
  { name: 'HDFC Bank', sub: 'Banking & Finance', type: 'hdfc' },
  { name: 'Adani Group', sub: 'Infrastructure', text: 'adani', textSub: 'Group', type: 'adani' },
  { name: 'Infosys', sub: 'IT Services', bg: '#007cc3', letter: 'INFY', type: 'badge' },
  { name: 'TCS', sub: 'Consultancy', bg: '#1c3e80', letter: 'TCS', type: 'badge' },
  { name: 'Wipro', sub: 'Technologies', bg: '#292562', letter: 'W', type: 'letter' },
  { name: 'ICICI Bank', sub: 'Financial', bg: '#f37023', letter: 'ICICI', type: 'badge' },
  { name: 'Airtel', sub: 'Telecom', bg: '#e40000', letter: 'airtel', type: 'badge' },
  { name: 'SBI', sub: 'State Bank', bg: '#00a4e4', letter: 'SBI', type: 'badge' },
  { name: 'Axis Bank', sub: 'Banking', bg: '#97144d', letter: 'AXIS', type: 'badge' },
  { name: 'Mahindra', sub: 'Rise', bg: '#e31837', letter: 'M&M', type: 'badge' },
  { name: 'L&T', sub: 'Construction', bg: '#005a9c', letter: 'L&T', type: 'badge' },
  { name: 'Maruti Suzuki', sub: 'Automotive', bg: '#10317e', letter: 'MS', type: 'badge' },
  { name: 'HCL Tech', sub: 'Software', bg: '#0054a6', letter: 'HCL', type: 'badge' },
  { name: 'Tech Mahindra', sub: 'Digital Solutions', bg: '#d41e2a', letter: 'TM', type: 'badge' },
  { name: 'ITC Limited', sub: 'Conglomerate', bg: '#004b87', letter: 'ITC', type: 'badge' },
  { name: 'Bajaj Finserv', sub: 'Financial Services', bg: '#00539f', letter: 'BAJAJ', type: 'badge' },
  { name: 'Sun Pharma', sub: 'Healthcare', bg: '#f26522', letter: 'SUN', type: 'badge' },
  { name: 'Dr. Reddy\'s', sub: 'Pharmaceuticals', bg: '#602b84', letter: 'DRL', type: 'badge' },
  { name: 'Hindalco', sub: 'Metals & Mining', bg: '#ed1c24', letter: 'HAL', type: 'badge' },
  { name: 'UltraTech', sub: 'Cement Ltd', bg: '#ffc20e', letter: 'UTC', type: 'badge' },
  { name: 'Asian Paints', sub: 'Paints & Decor', bg: '#e52421', letter: 'AP', type: 'badge' },
  { name: 'Titan Company', sub: 'Watches & Jewellery', bg: '#111111', letter: 'TITAN', type: 'badge' },
  { name: 'Zomato', sub: 'Food Ordering', bg: '#cb202d', letter: 'zomato', type: 'badge' },
  { name: 'Swiggy', sub: 'Instamart & Food', bg: '#fc8019', letter: 'swiggy', type: 'badge' },
  { name: 'Paytm', sub: 'Fintech Payments', bg: '#00baf2', letter: 'paytm', type: 'badge' },
  { name: 'Flipkart', sub: 'E-Commerce Marketplace', bg: '#2874f0', letter: 'FK', type: 'badge' },
  { name: 'MakeMyTrip', sub: 'Travel & Bookings', bg: '#eb2026', letter: 'MMT', type: 'badge' }
];

const CAPABILITIES = [
  {
    icon: Building2,
    badge: 'Core Engine',
    title: 'Multi-Tenant Architecture',
    desc: 'Complete data isolation per company with custom subdomain, branding and dedicated database segregation.',
    perks: ['Isolated Company Databases', 'White-label Custom Branding'],
    gradient: 'from-[#06b6d4] to-[#0284c7]',
    accentText: 'text-cyan-600',
    bgBadge: 'bg-cyan-50 border-cyan-200 text-cyan-700'
  },
  {
    icon: ShieldCheck,
    badge: 'Governance',
    title: '5-Tier Granular RBAC',
    desc: 'Strict role permissions across Super Admin, Company Admin, Manager, Agent, and Customer portals.',
    perks: ['JWT Scoped Token Security', 'Route-Level Permission Guards'],
    gradient: 'from-[#2563eb] to-[#4f46e5]',
    accentText: 'text-blue-600',
    bgBadge: 'bg-blue-50 border-blue-200 text-blue-700'
  },
  {
    icon: Users,
    badge: 'Routing',
    title: 'Department Management',
    desc: 'Group agents into specialized teams (IT, HR, Billing, Facilities) with department leads and queues.',
    perks: ['Specialized Team Queues', 'Team Lead Escalation Paths'],
    gradient: 'from-[#4f46e5] to-[#7c3aed]',
    accentText: 'text-indigo-600',
    bgBadge: 'bg-indigo-50 border-indigo-200 text-indigo-700'
  },
  {
    icon: FileText,
    badge: 'Form Studio',
    title: 'Dynamic Form Builder',
    desc: 'Create custom intake forms with dynamic fields, selects, validations, and live mobile preview.',
    perks: ['Dynamic Field Validation', 'Instant Live Form Preview'],
    gradient: 'from-[#0ea5e9] to-[#06b6d4]',
    accentText: 'text-sky-600',
    bgBadge: 'bg-sky-50 border-sky-200 text-sky-700'
  },
  {
    icon: Clock,
    badge: 'SLA Engine',
    title: 'Configurable SLA Policies',
    desc: 'Set target response & resolution hours by priority (Urgent, High, Medium, Low) with automated alerts.',
    perks: ['Real-time Countdown Timers', 'Automated Breach Warnings'],
    gradient: 'from-[#f43f5e] to-[#e11d48]',
    accentText: 'text-rose-600',
    bgBadge: 'bg-rose-50 border-rose-200 text-rose-700'
  },
  {
    icon: BookOpen,
    badge: 'Deflection',
    title: 'Self-Service Knowledge Base',
    desc: 'Deflect repetitive queries with searchable articles, step-by-step guides, FAQs, and categories.',
    perks: ['Instant Category Search', 'High Ticket Deflection Rate'],
    gradient: 'from-[#0d9488] to-[#059669]',
    accentText: 'text-teal-600',
    bgBadge: 'bg-teal-50 border-teal-200 text-teal-700'
  },
  {
    icon: Bell,
    badge: 'Broadcasts',
    title: 'Broadcast Announcements',
    desc: 'Publish critical company-wide operational alerts, system maintenance notices, and priority banners.',
    perks: ['Priority Notice Banners', 'Targeted Audience Filters'],
    gradient: 'from-[#06b6d4] to-[#3b82f6]',
    accentText: 'text-cyan-600',
    bgBadge: 'bg-cyan-50 border-cyan-200 text-cyan-700'
  },
  {
    icon: BarChart3,
    badge: 'Analytics',
    title: 'Executive Reports & CSAT',
    desc: 'Track resolution metrics, SLA compliance rates, agent leaderboards, and export CSV/PDF audits.',
    perks: ['First-Contact Resolution Metrics', 'Exportable CSV & PDF Audits'],
    gradient: 'from-[#0284c7] to-[#1d4ed8]',
    accentText: 'text-blue-600',
    bgBadge: 'bg-sky-50 border-sky-200 text-sky-700'
  }
];

/* ==========================================================================
   3D GLASSMORPHIC BRAND EMBLEM COMPONENT
   ========================================================================== */

const TicketProEmblem = memo(({
  sizeClass = 'h-10 w-10 sm:h-11 sm:w-11',
  glow = true
}) => (
  <div className={`relative shrink-0 ${glow ? 'drop-shadow-[0_6px_16px_rgba(2,132,199,0.42)]' : ''}`}>
    <svg viewBox="0 0 48 48" className={sizeClass} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tpBrandBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d2ff" />
          <stop offset="48%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="tpBrandShine" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="tpBrandBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {/* 3D Orb Background */}
      <circle cx="24" cy="24" r="22" fill="url(#tpBrandBaseGrad)" />
      {/* Specular 3D Reflection */}
      <ellipse cx="24" cy="14" rx="14" ry="7.5" fill="url(#tpBrandShine)" opacity="0.45" />
      {/* Glossy Perimeter Rim */}
      <circle cx="24" cy="24" r="21" stroke="url(#tpBrandBorder)" strokeWidth="1.5" />
      {/* Emblem Ticket Icon */}
      <g filter="drop-shadow(0 2px 4px rgba(15,23,42,0.35))">
        <path
          d="M13 18.5 C13 16.57 14.57 15 16.5 15 H31.5 C33.43 15 35 16.57 35 18.5 V21 C33.34 21 32 22.34 32 24 C32 25.66 33.34 27 35 27 V29.5 C35 31.43 33.43 33 31.5 33 H16.5 C14.57 33 13 31.43 13 29.5 V27 C14.66 27 16 25.66 16 24 C16 22.34 14.66 21 13 21 Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line x1="24" y1="18" x2="24" y2="30" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.5 3" />
        <circle cx="18.5" cy="24" r="1.4" fill="#ffffff" />
        <circle cx="29.5" cy="24" r="1.4" fill="#ffffff" />
      </g>
    </svg>
  </div>
));

/* ==========================================================================
   MAIN REFINED & HIGH-CONVERTING LANDING PAGE
   ========================================================================== */

export const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Quick ticket creation preview state
  const [quickTicketType, setQuickTicketType] = useState('Technical Issue');
  const [quickPriority, setQuickPriority] = useState('High');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickTicketCreated, setQuickTicketCreated] = useState(false);

  // Active simulated tickets list in the sandbox
  const [activeSandboxTicket, setActiveSandboxTicket] = useState({
    id: '#TP-2048',
    title: 'High-priority database connection pool latency & failover',
    category: 'Technical Issue',
    priority: 'High',
    assignee: 'Ritik Kumar',
    slaTime: '02h 34m',
    status: 'In Progress'
  });

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const handleQuickTicketSubmit = (e) => {
    e.preventDefault();
    if (!quickDesc.trim()) return;

    const newTicket = {
      id: `#TP-${Math.floor(1000 + Math.random() * 9000)}`,
      title: quickDesc.trim(),
      category: quickTicketType,
      priority: quickPriority,
      assignee: 'AI Auto-Routed',
      slaTime: quickPriority === 'High' ? '01h 45m' : quickPriority === 'Medium' ? '04h 00m' : '08h 00m',
      status: 'In Progress'
    };

    setActiveSandboxTicket(newTicket);
    setQuickTicketCreated(true);
    setTimeout(() => setQuickTicketCreated(false), 3500);
    setQuickDesc('');
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setTimeout(() => setNewsletterSubscribed(false), 4000);
      setNewsletterEmail('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between relative overflow-x-hidden">
      {/* Modern High-Performance CSS Animations */}
      <style>{`
        @keyframes tpMarqueeInfinite {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-smooth {
          animation: tpMarqueeInfinite 75s linear infinite;
        }
        .animate-marquee-smooth:hover {
          animation-play-state: paused;
        }
        @keyframes auraFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-16px) scale(1.05); }
        }
        .animate-aura-1 {
          animation: auraFloat 9s ease-in-out infinite;
        }
        .animate-aura-2 {
          animation: auraFloat 12s ease-in-out infinite reverse;
        }
      `}</style>

      {/* Floating Ambient Aurora Flares */}
      <div className="absolute -top-16 left-1/4 w-[360px] sm:w-[540px] h-[360px] sm:h-[540px] bg-gradient-to-tr from-cyan-400/20 via-blue-500/15 to-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-aura-1" />
      <div className="absolute top-1/3 right-4 w-[280px] sm:w-[460px] h-[280px] sm:h-[460px] bg-gradient-to-br from-indigo-500/15 via-sky-400/15 to-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-aura-2" />
      <div className="absolute bottom-1/4 left-6 w-[260px] sm:w-[420px] h-[260px] sm:h-[420px] bg-gradient-to-tr from-teal-400/10 via-cyan-400/10 to-transparent rounded-full blur-3xl pointer-events-none animate-aura-1" />

      {/* ========================================================================= */}
      {/* 1. STICKY HEADER NAVBAR                                                   */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand & Nav */}
          <div className="flex items-center space-x-4 sm:space-x-6 lg:space-x-10 shrink-0">
            <div
              className="flex items-center space-x-2 sm:space-x-2.5 md:space-x-3 cursor-pointer group shrink-0"
              onClick={() => navigate('/')}
            >
              <TicketProEmblem sizeClass="h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11" />

              <div className="w-fit flex flex-col items-stretch select-none">
                <div className="text-lg sm:text-2xl md:text-[25px] font-black tracking-tight leading-none text-center">
                  <span className="text-[#050e24]">Ticket</span>
                  <span className="bg-gradient-to-r from-[#1d68f0] via-[#0284c7] to-[#00b4d8] bg-clip-text text-transparent">
                    Pro
                  </span>
                </div>
                <div className="w-full mt-[2px] sm:mt-1 flex flex-col items-stretch">
                  <div className="w-full flex items-center justify-between gap-1 sm:gap-1.5 text-[#0072ea] leading-none">
                    <span className="h-[2px] sm:h-[2.5px] flex-1 bg-[#0072ea] rounded-full min-w-[5px] sm:min-w-[6px]" />
                    <span className="text-[6px] sm:text-[7.5px] md:text-[8px] font-black tracking-[0.14em] sm:tracking-[0.18em] uppercase whitespace-nowrap shrink-0">
                      SMART TICKETING
                    </span>
                    <span className="h-[2px] sm:h-[2.5px] flex-1 bg-[#0072ea] rounded-full min-w-[5px] sm:min-w-[6px]" />
                  </div>
                  <div className="w-full text-center text-[6px] sm:text-[7.5px] md:text-[8px] font-black tracking-[0.20em] sm:tracking-[0.24em] text-[#0072ea] uppercase whitespace-nowrap leading-none mt-[1.5px] sm:mt-[2px]">
                    BETTER SUPPORT
                  </div>
                </div>
              </div>
            </div>

            <nav className="hidden lg:flex items-center space-x-7 text-xs font-extrabold text-slate-600">
              <a href="#overview" className="hover:text-cyan-600 transition-colors">Overview</a>
              <a href="#what-we-offer" className="hover:text-cyan-600 transition-colors">What We Offer</a>
              <a href="#key-features" className="hover:text-cyan-600 transition-colors">Key Features</a>
              <a href="#solutions" className="hover:text-cyan-600 transition-colors">Solutions</a>
              <a href="#about" className="hover:text-cyan-600 transition-colors">About</a>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex items-center px-3.5 sm:px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:text-cyan-700 hover:border-cyan-300 hover:bg-cyan-50/50 text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap"
            >
              Login
            </button>

            <button
              onClick={() => navigate('/onboard')}
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black transition-all shadow-md shadow-cyan-500/25 hover:shadow-cyan-500/40 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              Get Started
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer shrink-0"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden max-w-7xl mx-auto px-4 pb-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-4 space-y-2 animate-in fade-in zoom-in-95 duration-150">
              <a
                href="#overview"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700"
              >
                Overview
              </a>
              <a
                href="#what-we-offer"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700"
              >
                What We Offer
              </a>
              <a
                href="#key-features"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700"
              >
                Key Features
              </a>
              <a
                href="#solutions"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700"
              >
                Solutions
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700"
              >
                About
              </a>
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                  className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-800 hover:text-cyan-800 border border-slate-200 hover:border-cyan-200 text-xs font-bold text-center transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs active:scale-[0.98]"
                >
                  <LogIn className="h-4 w-4 text-cyan-600" />
                  <span>Login / Sign In to Workspace</span>
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/onboard'); }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] text-white text-xs font-black text-center shadow-md transition-all cursor-pointer active:scale-[0.98]"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-8 sm:pb-16 space-y-10 sm:space-y-12 relative z-10">

        {/* ========================================================================= */}
        {/* 2. HERO SECTION WITH GLOW & 4-PILL METRIC STRIP                           */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-2">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 text-[#0891b2] text-xs font-black border border-cyan-200/80 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#06b6d4]" />
              </span>
              <Sparkles className="h-3.5 w-3.5 text-[#0891b2]" />
              <span>#1 Multi-Tenant Enterprise Ticketing</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              One Platform.<br />
              <span className="bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#6366f1] bg-clip-text text-transparent">
                Every Company.
              </span><br />
              Happy Customers.
            </h1>

            <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-md leading-relaxed">
              Empower your business with an enterprise-grade, secure, multi-tenant ticketing platform with automated SLAs, dynamic category forms, and real-time live updates.
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
              <button
                onClick={() => navigate('/onboard')}
                className="px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black transition-all shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 cursor-pointer active:scale-95 hover:-translate-y-0.5"
              >
                Get Started for Free
              </button>

              <button
                onClick={() => navigate('/login')}
                className="px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl bg-white border border-slate-200 hover:border-cyan-300 text-slate-800 hover:text-cyan-700 hover:bg-cyan-50/40 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center space-x-2 hover:-translate-y-0.5"
              >
                <Radio className="h-3.5 w-3.5 text-cyan-600 animate-pulse" />
                <span>Launch Live Portal</span>
              </button>
            </div>

            {/* Exact Horizontal Divider Strip Design with Live Metrics */}
            <div className="pt-2 w-full">
              <div className="rounded-2xl bg-white p-2.5 sm:p-3 xl:p-3.5 shadow-md shadow-indigo-100/40 border border-indigo-100/80">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-indigo-100/90 items-center">
                  {/* 1: Faster Resolution */}
                  <div className="flex items-center space-x-2 px-2.5 py-1.5 group cursor-default">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 text-[#0891b2] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-[#06b6d4] group-hover:to-[#2563eb] group-hover:text-white transition-all shadow-2xs">
                      <Zap className="h-4 w-4 stroke-[2.3]" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="text-[11px] sm:text-xs font-black text-slate-900 block group-hover:text-cyan-600 transition-colors">68% Faster</span>
                      <span className="text-[10px] sm:text-xs font-black text-cyan-600 block">Resolution</span>
                    </div>
                  </div>

                  {/* 2: Higher First Fix Rate */}
                  <div className="flex items-center space-x-2 px-2.5 py-1.5 group cursor-default">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 text-[#0891b2] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-[#06b6d4] group-hover:to-[#2563eb] group-hover:text-white transition-all shadow-2xs">
                      <ShieldCheck className="h-4 w-4 stroke-[2.3]" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="text-[11px] sm:text-xs font-black text-slate-900 block group-hover:text-cyan-600 transition-colors">94.2% Higher</span>
                      <span className="text-[10px] sm:text-xs font-black text-cyan-600 block">First Fix Rate</span>
                    </div>
                  </div>

                  {/* 3: Happy Customers */}
                  <div className="flex items-center space-x-2 px-2.5 py-1.5 group cursor-default">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 text-[#0891b2] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-[#06b6d4] group-hover:to-[#2563eb] group-hover:text-white transition-all shadow-2xs">
                      <Users className="h-4 w-4 stroke-[2.3]" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="text-[11px] sm:text-xs font-black text-slate-900 block group-hover:text-cyan-600 transition-colors">4.9/5 CSAT</span>
                      <span className="text-[10px] sm:text-xs font-black text-cyan-600 block">Happy Clients</span>
                    </div>
                  </div>

                  {/* 4: Lower Service Costs */}
                  <div className="flex items-center space-x-2 px-2.5 py-1.5 group cursor-default">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 text-[#0891b2] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-[#06b6d4] group-hover:to-[#2563eb] group-hover:text-white transition-all shadow-2xs">
                      <TrendingUp className="h-4 w-4 stroke-[2.3]" />
                    </div>
                    <div className="text-left leading-tight min-w-0">
                      <span className="text-[11px] sm:text-xs font-black text-slate-900 block group-hover:text-cyan-600 transition-colors">40% Lower</span>
                      <span className="text-[10px] sm:text-xs font-black text-cyan-600 block">Service Costs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Visual (ORIGINAL MONITOR + PHONE OVERLAY + GLOW EFFECT) */}
          <div className="lg:col-span-6 relative flex items-center justify-center w-full mt-6 lg:mt-0 overflow-hidden sm:overflow-visible">
            <div className="relative w-full max-w-[480px] drop-shadow-[0_20px_35px_rgba(79,70,229,0.22)] group">

              {/* Monitor Chassis */}
              <div className="rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-[#1e1b4b] bg-[#1e1b4b] p-2 sm:p-2.5 shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]">

                {/* Screen Box */}
                <div className="rounded-xl sm:rounded-2xl bg-[#f8fafc] text-slate-800 text-[8px] sm:text-[9px] font-sans p-2.5 sm:p-3 space-y-2 sm:space-y-2.5 shadow-inner">

                  {/* Screen Header */}
                  <div className="flex items-center justify-between bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-lg bg-gradient-to-br from-[#06b6d4] to-[#4f46e5] text-white flex items-center justify-center font-black text-[8px] sm:text-[9px] shadow-xs">
                        T
                      </div>
                      <span className="font-black text-slate-900 text-[9px] sm:text-[10px]">TicketPro Portal</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="h-4 sm:h-5 w-20 sm:w-28 bg-slate-100 rounded-md flex items-center px-1.5 text-slate-600 text-[7px] sm:text-[7.5px]">
                        <Search className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-1 text-slate-400" />
                        <span className="truncate">Search tickets...</span>
                      </div>
                      <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-[7px] sm:text-[8px]">
                        A
                      </div>
                    </div>
                  </div>

                  {/* 4 Stat Cards */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                      <span className="text-[6.5px] sm:text-[7.5px] font-bold text-slate-600 block truncate">Total Tickets</span>
                      <span className="text-xs sm:text-sm font-black text-slate-900 block">1,248</span>
                      <span className="text-[5.5px] sm:text-[6.5px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded inline-block">+12.4%</span>
                    </div>

                    <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                      <span className="text-[6.5px] sm:text-[7.5px] font-bold text-slate-600 block truncate">Open</span>
                      <span className="text-xs sm:text-sm font-black text-[#4f46e5] block">42</span>
                      <span className="text-[5.5px] sm:text-[6.5px] font-bold text-indigo-800 bg-indigo-100 px-1 py-0.2 rounded inline-block">Active</span>
                    </div>

                    <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                      <span className="text-[6.5px] sm:text-[7.5px] font-bold text-slate-600 block truncate">In Progress</span>
                      <span className="text-xs sm:text-sm font-black text-amber-800 block">18</span>
                      <span className="text-[5.5px] sm:text-[6.5px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded inline-block">Assigned</span>
                    </div>

                    <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-2xs space-y-0.5">
                      <span className="text-[6.5px] sm:text-[7.5px] font-bold text-slate-600 block truncate">Resolved</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-800 block">1,188</span>
                      <span className="text-[5.5px] sm:text-[6.5px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded inline-block">95.2%</span>
                    </div>
                  </div>

                  {/* Analytics Area */}
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-8 bg-white p-2 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[7.5px] sm:text-[8.5px] font-black text-slate-900">Weekly Ticket Volume</span>
                        <span className="text-[6px] sm:text-[7px] font-bold text-cyan-800 bg-cyan-100 px-1 py-0.5 rounded">This Week</span>
                      </div>

                      <div className="flex items-end justify-between h-12 sm:h-16 pt-1 px-1">
                        <div className="flex flex-col items-center space-y-0.5 w-2.5 sm:w-3">
                          <div className="w-full bg-[#38bdf8] rounded-t h-6 sm:h-8" />
                          <span className="text-[5.5px] sm:text-[6.5px] font-bold text-slate-600">M</span>
                        </div>
                        <div className="flex flex-col items-center space-y-0.5 w-2.5 sm:w-3">
                          <div className="w-full bg-[#0284c7] rounded-t h-9 sm:h-11" />
                          <span className="text-[5.5px] sm:text-[6.5px] font-bold text-slate-600">T</span>
                        </div>
                        <div className="flex flex-col items-center space-y-0.5 w-2.5 sm:w-3">
                          <div className="w-full bg-[#2563eb] rounded-t h-11 sm:h-14" />
                          <span className="text-[5.5px] sm:text-[6.5px] font-bold text-slate-600">W</span>
                        </div>
                        <div className="flex flex-col items-center space-y-0.5 w-2.5 sm:w-3">
                          <div className="w-full bg-[#0ea5e9] rounded-t h-8 sm:h-10" />
                          <span className="text-[5.5px] sm:text-[6.5px] font-bold text-slate-600">T</span>
                        </div>
                        <div className="flex flex-col items-center space-y-0.5 w-2.5 sm:w-3">
                          <div className="w-full bg-[#4f46e5] rounded-t h-12 sm:h-15" />
                          <span className="text-[5.5px] sm:text-[6.5px] font-bold text-slate-600">F</span>
                        </div>
                        <div className="flex flex-col items-center space-y-0.5 w-2.5 sm:w-3">
                          <div className="w-full bg-[#a5b4fc] rounded-t h-4 sm:h-6" />
                          <span className="text-[5.5px] sm:text-[6.5px] font-bold text-slate-600">S</span>
                        </div>
                        <div className="flex flex-col items-center space-y-0.5 w-2.5 sm:w-3">
                          <div className="w-full bg-[#06b6d4] rounded-t h-10 sm:h-12" />
                          <span className="text-[5.5px] sm:text-[6.5px] font-bold text-slate-600">S</span>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-4 bg-white p-2 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                      <span className="text-[7.5px] sm:text-[8.5px] font-black text-slate-900">Priority Share</span>
                      <div className="flex items-center justify-center py-1">
                        <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-full border-3 sm:border-4 border-[#2563eb] border-t-rose-500 border-r-amber-400 flex items-center justify-center">
                          <span className="text-[6.5px] sm:text-[7.5px] font-black text-slate-800">100%</span>
                        </div>
                      </div>
                      <div className="space-y-0.5 text-[5.5px] sm:text-[6.5px] font-bold">
                        <div className="flex items-center justify-between text-rose-600"><span>High</span><span>20%</span></div>
                        <div className="flex items-center justify-between text-amber-600"><span>Med</span><span>50%</span></div>
                        <div className="flex items-center justify-between text-[#2563eb]"><span>Low</span><span>30%</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Ticket Rows */}
                  <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                    <span className="text-[7.5px] sm:text-[8px] font-black text-slate-900 block">Recent Support Tickets</span>
                    <div className="space-y-1 text-[6.5px] sm:text-[7.5px] font-semibold text-slate-700">
                      <div className="flex items-center justify-between p-1 rounded bg-slate-50 border border-slate-100">
                        <span className="font-bold text-[#4f46e5]">#TK-1042</span>
                        <span className="truncate max-w-[100px] sm:max-w-[120px] font-medium text-slate-900">Database Connection Timeout</span>
                        <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[5.5px] sm:text-[6.5px] font-bold">IN_PROGRESS</span>
                      </div>
                      <div className="flex items-center justify-between p-1 rounded bg-slate-50 border border-slate-100">
                        <span className="font-bold text-[#4f46e5]">#TK-1041</span>
                        <span className="truncate max-w-[100px] sm:max-w-[120px] font-medium text-slate-900">SSO Login Auth Loop Bug</span>
                        <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[5.5px] sm:text-[6.5px] font-bold">RESOLVED</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Stand */}
              <div className="w-16 sm:w-24 h-3 sm:h-4 bg-[#1e1b4b] mx-auto" />
              <div className="w-28 sm:w-44 h-1.5 bg-slate-500 mx-auto rounded-full shadow-lg" />

              {/* Phone overlay */}
              <div className="absolute right-0 sm:right-2 bottom-0 sm:bottom-2 w-28 sm:w-40 h-[190px] sm:h-[270px] rounded-[20px] sm:rounded-[26px] border-3 sm:border-4 border-slate-900 bg-slate-900 p-1.5 shadow-2xl z-30 flex flex-col justify-between overflow-hidden hover:scale-105 transition-transform duration-300">
                <div className="h-full w-full bg-white rounded-[16px] sm:rounded-[20px] p-2 text-slate-800 text-[7px] sm:text-[8px] flex flex-col justify-between shadow-inner relative overflow-hidden">
                  <div className="h-1.5 w-8 sm:w-12 bg-slate-900 rounded-full mx-auto mb-1 flex items-center justify-center">
                    <div className="h-1 w-1 rounded-full bg-slate-800" />
                  </div>

                  <div className="flex items-center justify-between text-[6px] sm:text-[7px] font-extrabold text-slate-900 px-1">
                    <span>09:41</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-[5px]">5G</span>
                      <Wifi className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-slate-700" />
                      <Battery className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-slate-900" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white p-1.5 sm:p-2 rounded-xl shadow-md space-y-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded bg-white/20 flex items-center justify-center font-black text-[5px] sm:text-[6px]">T</div>
                        <span className="font-black text-[7px] sm:text-[8px]">TicketPro Mobile</span>
                      </div>
                      <span className="text-[5px] sm:text-[6px] bg-emerald-400 text-slate-950 font-black px-1 py-0.2 rounded-full">Live</span>
                    </div>
                    <div className="flex justify-between items-center text-[5.5px] sm:text-[6.5px] font-semibold text-indigo-100 pt-0.5">
                      <span>Enterprise SLA</span>
                      <span className="text-emerald-300 font-bold">99.8%</span>
                    </div>
                  </div>

                  <div className="space-y-1 py-0.5">
                    <div className="bg-slate-50 p-1 sm:p-1.5 rounded-lg border border-slate-100 space-y-0.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#4f46e5] text-[6px] sm:text-[7px]">#IOCL-8042</span>
                        <span className="text-[5px] sm:text-[6px] font-bold text-amber-700 bg-amber-50 px-1 rounded">In Progress</span>
                      </div>
                      <p className="text-[6px] sm:text-[7px] font-bold text-slate-900 leading-tight truncate">Refinery Pipeline Telemetry</p>
                    </div>

                    <div className="bg-slate-50 p-1 sm:p-1.5 rounded-lg border border-slate-100 space-y-0.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#4f46e5] text-[6px] sm:text-[7px]">#IOCL-8041</span>
                        <span className="text-[5px] sm:text-[6px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">Resolved</span>
                      </div>
                      <p className="text-[6px] sm:text-[7px] font-bold text-slate-900 leading-tight truncate">SAP ERP Portal Login Bug</p>
                    </div>
                  </div>

                  <div className="w-8 sm:w-12 h-0.5 bg-slate-300 rounded-full mx-auto mt-0.5" />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. TRUSTED COMPANIES MARQUEE                                              */}
        {/* ========================================================================= */}
        <section className="pt-6 sm:pt-8 border-t border-slate-200/80 text-center space-y-4 overflow-hidden">
          <div className="space-y-1">
            <span className="text-xs font-black text-[#4f46e5] tracking-widest uppercase block">Enterprise Trust</span>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900">
              Trusted by 30+ innovative enterprise leaders
            </p>
          </div>

          <div className="relative w-full overflow-hidden py-3">
            <div className="flex space-x-3 w-max animate-marquee-smooth">
              {[...ENTERPRISE_COMPANIES, ...ENTERPRISE_COMPANIES].map((comp, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl px-3.5 py-2.5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-cyan-300 transition-all flex items-center space-x-2.5 shrink-0 min-w-[150px] cursor-pointer"
                >
                  {comp.type === 'letter' && (
                    <div className="h-8 w-8 rounded-full bg-[#ac8e3c] flex items-center justify-center text-white text-xs font-serif font-black shadow-md">
                      {comp.letter}
                    </div>
                  )}

                  {comp.type === 'hdfc' && (
                    <div className="h-6 w-6 border-2 border-red-600 flex items-center justify-center">
                      <div className="h-2 w-2 bg-blue-900" />
                    </div>
                  )}

                  {comp.type === 'badge' && (
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-[8px] font-black shadow-md"
                      style={{ backgroundColor: comp.bg }}
                    >
                      {comp.letter}
                    </div>
                  )}

                  {comp.type === 'text' && (
                    <div className="text-left leading-none">
                      <span className="text-sm font-black text-blue-900 tracking-tighter block">{comp.text}</span>
                      <span className="text-[7px] font-black text-blue-900 uppercase tracking-widest block">{comp.textSub}</span>
                    </div>
                  )}

                  {comp.type === 'adani' && (
                    <div className="text-left leading-none">
                      <span className="text-sm font-black text-pink-600 tracking-tight block">{comp.text}</span>
                      <span className="text-[7.5px] font-bold text-slate-500">{comp.textSub}</span>
                    </div>
                  )}

                  {comp.type !== 'text' && comp.type !== 'adani' && (
                    <div className="text-left leading-none overflow-hidden">
                      <span className="text-xs font-black text-slate-900 block truncate max-w-[95px]">{comp.name}</span>
                      <span className="text-[7px] font-bold text-slate-500 uppercase truncate max-w-[95px] block mt-0.5">{comp.sub}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 1: COMPACT & INTERACTIVE OVERVIEW BANNER                          */}
        {/* ========================================================================= */}
        <section id="overview" className="pt-6 sm:pt-8 border-t border-slate-200/80 scroll-mt-24">
          <div className="rounded-3xl bg-slate-50/90 border border-slate-200/90 p-4 sm:p-6 shadow-xs relative overflow-hidden">
            {/* Subtle Accent Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-6 space-y-1.5">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200/80 text-cyan-800 text-[11px] font-black tracking-wide uppercase shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
                <span>Core Innovation Engine</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                3 Unique Architectural Capabilities
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl mx-auto">
                Engineered for multi-tenant scalability, zero cross-tenant data leaks, and sub-minute SLA execution.
              </p>
            </div>

            {/* 3 Compact Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Card 1: Inbound Email */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-cyan-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-200/80 group-hover:scale-105 transition-transform">
                      <Mail className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-extrabold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                      Omnichannel
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-cyan-700 transition-colors">Inbound Email Sync</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Customers email your support address and TicketPro automatically parses headers, detects category, and assigns agents instantly.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-400">Zero Portal Login Needed</span>
                  <span className="font-black text-emerald-600 flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>99.4% Parse Accuracy</span>
                  </span>
                </div>
              </div>

              {/* Card 2: Dynamic Form Studio */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/80 group-hover:scale-105 transition-transform">
                      <Sliders className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      No-Code Engine
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">Dynamic Form Studio</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Custom fields adapt per department and company in real-time. Hospitals get ward numbers; IT gets git commit hashes without code.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-400">Runtime JSON Schemas</span>
                  <span className="font-black text-blue-600">Zero DB Migrations</span>
                </div>
              </div>

              {/* Card 3: SLA Breach Protection */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/80 group-hover:scale-105 transition-transform">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Sub-Minute SLA
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">SLA Breach Protection</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Precision countdown clocks trigger automated escalations to managers before breaches happen, backed by instant CSAT ratings.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="font-bold text-slate-400">Auto-Escalation Engine</span>
                  <span className="font-black text-amber-600">&lt; 15m Response Target</span>
                </div>
              </div>
            </div>

            {/* Compact Live Interactive Sandbox */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                {/* Left Mini Ticket Preview */}
                <div className="lg:col-span-6 space-y-2.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-xs border border-cyan-200/60">
                        <Ticket className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-black text-slate-900">{activeSandboxTicket.id} Live Execution</span>
                    </div>
                    <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                      <span>{activeSandboxTicket.status}</span>
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 leading-snug">
                    {activeSandboxTicket.title}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/80">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                      activeSandboxTicket.priority === 'High'
                        ? 'text-rose-600 bg-rose-50 border-rose-200'
                        : activeSandboxTicket.priority === 'Medium'
                        ? 'text-amber-600 bg-amber-50 border-amber-200'
                        : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                    }`}>
                      {activeSandboxTicket.priority} Priority
                    </span>
                    <span className="text-slate-500 font-medium">Assigned: <strong className="text-slate-800 font-bold">{activeSandboxTicket.assignee}</strong></span>
                    <span className="text-cyan-800 font-extrabold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200/70 text-[10px]">
                      ⏱ {activeSandboxTicket.slaTime} SLA
                    </span>
                  </div>
                </div>

                {/* Right Mini Interactive Ticket Generator */}
                <div className="lg:col-span-6">
                  <form onSubmit={handleQuickTicketSubmit} className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                        <Plus className="h-3.5 w-3.5 text-cyan-600" />
                        <span>Interactive Ticket Sandbox</span>
                      </span>
                      {quickTicketCreated ? (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <Check className="h-3 w-3" />
                          <span>Ticket Logged Live!</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">Try creating one live</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={quickTicketType}
                        onChange={(e) => setQuickTicketType(e.target.value)}
                        className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500 outline-none"
                      >
                        <option>Technical Issue</option>
                        <option>Billing &amp; Invoice</option>
                        <option>Access &amp; Security</option>
                      </select>

                      <select
                        value={quickPriority}
                        onChange={(e) => setQuickPriority(e.target.value)}
                        className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-cyan-500 outline-none"
                      >
                        <option value="High">High Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="Low">Low Priority</option>
                      </select>
                    </div>

                    <div className="flex space-x-2">
                      <input
                        type="text"
                        required
                        value={quickDesc}
                        onChange={(e) => setQuickDesc(e.target.value)}
                        placeholder="Type issue summary and hit log ticket..."
                        className="flex-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-cyan-500 outline-none placeholder:text-slate-400"
                      />
                      <button
                        type="submit"
                        className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] text-white text-xs font-black shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0 active:scale-95"
                      >
                        Log Ticket
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: THE 4-STAGE SUPPORT LIFECYCLE                                   */}
        {/* ========================================================================= */}
        <section id="what-we-offer" className="pt-6 sm:pt-8 border-t border-slate-200/80 space-y-6 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200/80 text-[#0891b2] text-xs font-black tracking-wider uppercase shadow-2xs">
              <Workflow className="h-3.5 w-3.5 text-[#0891b2]" />
              <span>How TicketPro Works</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              The End-to-End Support Lifecycle,<br />
              <span className="bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#6366f1] bg-clip-text text-transparent">
                Streamlined for Speed
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Experience a seamless workflow from initial request submission to first-contact resolution, team collaboration, and automated customer CSAT feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stage 1: Intake */}
            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-cyan-400 hover:-translate-y-1.5 transition-all p-6 space-y-3 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#06b6d4] to-[#0284c7] text-white flex items-center justify-center font-black text-xs shadow-md shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                  01
                </div>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-cyan-700 transition-colors">Intelligent Intake</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Capture structured tickets with company-tailored dynamic form fields, dropdowns, validation rules, and direct file uploads.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-cyan-600 flex items-center space-x-1">
                <span>Custom Fields Studio</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Stage 2: Department Routing */}
            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-blue-400 hover:-translate-y-1.5 transition-all p-6 space-y-3 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#2563eb] text-white flex items-center justify-center font-black text-xs shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
                  02
                </div>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-700 transition-colors">Department Queues</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Automatically route incoming tickets to the appropriate department and assign specialized agents based on queue availability.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-blue-600 flex items-center space-x-1">
                <span>Workload Balancing</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Stage 3: SLA & Collaboration */}
            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-amber-400 hover:-translate-y-1.5 transition-all p-6 space-y-3 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white flex items-center justify-center font-black text-xs shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform">
                  03
                </div>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-700 transition-colors">SLA &amp; Team Collaboration</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Enforce strict SLA countdown targets with multi-level escalation alerts and private internal notes for agent collaboration.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-amber-600 flex items-center space-x-1">
                <span>SLA Policy Automation</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Stage 4: Resolution & CSAT */}
            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-400 hover:-translate-y-1.5 transition-all p-6 space-y-3 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] text-white flex items-center justify-center font-black text-xs shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                  04
                </div>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">Resolution &amp; CSAT</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Close tickets with resolution audit timestamps and trigger automated 5-star customer feedback surveys to measure satisfaction.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-emerald-600 flex items-center space-x-1">
                <span>CSAT Feedback Loops</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: 8 ENTERPRISE PLATFORM CAPABILITIES                              */}
        {/* ========================================================================= */}
        <section id="key-features" className="pt-6 sm:pt-8 border-t border-slate-200/80 space-y-6 scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200/80 text-[#0891b2] text-xs font-black tracking-wider uppercase shadow-2xs">
              <Layers className="h-3.5 w-3.5 text-[#0891b2]" />
              <span>Enterprise Capabilities</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Architected for Enterprise Control,<br />
              <span className="bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#6366f1] bg-clip-text text-transparent">
                Scale &amp; Governance
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
              Explore the core system modules built into TicketPro to power your support department, secure your data, and deliver dependable operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {CAPABILITIES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  onClick={() => navigate('/login')}
                  className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/90 hover:border-cyan-400 shadow-xs hover:shadow-xl transition-all hover:-translate-y-1.5 flex flex-col justify-between cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider border px-2 py-0.5 rounded-full ${item.bgBadge}`}>
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-cyan-700 transition-colors">{item.title}</h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{item.desc}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      {item.perks.map((perk, pIdx) => (
                        <div key={pIdx} className="flex items-center space-x-2 text-[11px] font-bold text-slate-700">
                          <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-cyan-600 group-hover:text-cyan-700">
                    <span className="text-[11px]">Explore Module</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* ========================================================================= */}
      {/* SECTION 4: FLOATING CTA BANNER + MATCHING BOXED FOOTER                     */}
      {/* ========================================================================= */}
      <footer id="solutions" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative mt-14 sm:mt-20 pb-8 sm:pb-12 scroll-mt-24">
        {/* Overlapping Floating CTA Banner */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-20 -mb-16 sm:-mb-20">
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#06101e] via-[#0b192e] to-[#0f172a] p-5 sm:p-7 text-white shadow-2xl relative overflow-hidden border border-cyan-400/50">
            {/* Ambient Corner Flare */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 relative z-10">
              <div className="flex items-center space-x-3 sm:space-x-4 text-left">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-[#06b6d4] to-[#0ea5e9] flex items-center justify-center text-white shadow-lg shadow-cyan-500/40 shrink-0">
                  <Ticket className="h-6 w-6 sm:h-7 sm:w-7 text-white rotate-[-12deg]" />
                </div>

                <div className="space-y-0.5">
                  <h3 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-tight leading-snug">
                    Ready to streamline your support operations with TicketPro?
                  </h3>
                  <p className="text-[11px] sm:text-xs text-cyan-100 font-medium">
                    Experience smarter ticketing, faster resolutions, and happier customers — all in one platform.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0 w-full md:w-auto justify-start md:justify-end">
                <button
                  onClick={() => navigate('/onboard')}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] text-white text-xs font-black shadow-lg shadow-cyan-500/25 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <span>Book a Demo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => navigate('/login')}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer backdrop-blur-xs active:scale-95"
                >
                  <span>Live Portal</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Boxed Dark Navy Footer Base */}
        <div id="about" className="w-full rounded-2xl sm:rounded-3xl bg-[#070d1b] pt-24 sm:pt-28 pb-8 px-5 sm:px-8 lg:px-10 text-slate-300 border border-slate-800/80 relative z-10 shadow-2xl">
          <div className="space-y-8 sm:space-y-10">
            {/* 6 Columns Navigation Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 sm:gap-8">
              {/* Col 1: Brand Info & Socials */}
              <div className="col-span-2 space-y-3.5">
                <div
                  className="flex items-center space-x-2.5 cursor-pointer group shrink-0"
                  onClick={() => navigate('/')}
                >
                  <TicketProEmblem sizeClass="h-9 w-9 sm:h-10 sm:w-10" />

                  <div className="w-fit flex flex-col items-stretch select-none">
                    <div className="text-xl sm:text-2xl font-black tracking-tight leading-none text-center">
                      <span className="text-white">Ticket</span>
                      <span className="bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#93c5fd] bg-clip-text text-transparent">
                        Pro
                      </span>
                    </div>
                    <div className="w-full mt-[2px] sm:mt-1 flex flex-col items-stretch">
                      <div className="w-full flex items-center justify-between gap-1 text-[#38bdf8] leading-none">
                        <span className="h-[2px] flex-1 bg-[#38bdf8] rounded-full min-w-[6px]" />
                        <span className="text-[6.5px] sm:text-[7.5px] font-black tracking-[0.16em] uppercase whitespace-nowrap shrink-0">
                          SMART TICKETING
                        </span>
                        <span className="h-[2px] flex-1 bg-[#38bdf8] rounded-full min-w-[6px]" />
                      </div>
                      <div className="w-full text-center text-[6.5px] sm:text-[7.5px] font-black tracking-[0.22em] text-[#38bdf8] uppercase whitespace-nowrap leading-none mt-[2px]">
                        BETTER SUPPORT
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed max-w-sm">
                  TicketPro is a powerful, multi-tenant ticketing solution that helps organizations automate support operations, improve response times, and deliver exceptional customer experiences.
                </p>

                {/* Social links */}
                <div className="flex items-center space-x-2 pt-1">
                  <span className="h-7 w-7 rounded-full border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-400 flex items-center justify-center text-[10px] font-black transition-all cursor-pointer">
                    in
                  </span>
                  <span className="h-7 w-7 rounded-full border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-400 flex items-center justify-center text-[10px] font-black transition-all cursor-pointer">
                    𝕏
                  </span>
                  <span className="h-7 w-7 rounded-full border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-400 flex items-center justify-center text-[10px] font-black transition-all cursor-pointer">
                    ▶
                  </span>
                </div>
              </div>

              {/* Col 2: Products */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="h-3 w-3 text-cyan-400" />
                  <span>Products</span>
                </h4>
                <ul className="space-y-1.5 text-[11px] text-slate-400 font-medium">
                  <li><a href="#overview" className="hover:text-white transition-colors">Ticketing Platform</a></li>
                  <li><a href="#what-we-offer" className="hover:text-white transition-colors">Multi-Tenant SaaS</a></li>
                  <li><a href="#key-features" className="hover:text-white transition-colors">Dynamic Ticket Forms</a></li>
                  <li><a href="#key-features" className="hover:text-white transition-colors">Automation &amp; Workflows</a></li>
                </ul>
              </div>

              {/* Col 3: Solutions */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Zap className="h-3 w-3 text-amber-400" />
                  <span>Solutions</span>
                </h4>
                <ul className="space-y-1.5 text-[11px] text-slate-400 font-medium">
                  <li><a href="#overview" className="hover:text-white transition-colors">Customer Support</a></li>
                  <li><a href="#what-we-offer" className="hover:text-white transition-colors">IT Helpdesk</a></li>
                  <li><a href="#key-features" className="hover:text-white transition-colors">Field Operations</a></li>
                  <li><a href="#overview" className="hover:text-white transition-colors">Enterprise Support</a></li>
                </ul>
              </div>

              {/* Col 4: Resources */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="h-3 w-3 text-purple-400" />
                  <span>Resources</span>
                </h4>
                <ul className="space-y-1.5 text-[11px] text-slate-400 font-medium">
                  <li><a href="#about" className="hover:text-white transition-colors">Documentation</a></li>
                  <li><a href="#about" className="hover:text-white transition-colors">Case Studies</a></li>
                  <li><a href="#about" className="hover:text-white transition-colors">Help Center</a></li>
                </ul>
              </div>

              {/* Col 5: Company */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Building2 className="h-3 w-3 text-emerald-400" />
                  <span>Company</span>
                </h4>
                <ul className="space-y-1.5 text-[11px] text-slate-400 font-medium">
                  <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                  <li><a href="#about" className="hover:text-white transition-colors">Careers</a></li>
                  <li><button onClick={() => navigate('/onboard')} className="hover:text-white transition-colors cursor-pointer">Contact Us</button></li>
                </ul>
              </div>
            </div>

            {/* Newsletter Row */}
            <div className="pt-6 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5 text-left w-full md:w-auto">
                <h5 className="text-xs font-black text-white flex items-center space-x-1.5">
                  <Send className="h-3 w-3 text-cyan-400" />
                  <span>Stay Updated</span>
                </h5>
                <p className="text-[11px] text-slate-400">
                  Subscribe to our newsletter for the latest updates, tips and product news.
                </p>
              </div>

              <form onSubmit={handleNewsletterSubmit} className="flex items-center space-x-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Mail className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#06b6d4] to-[#2563eb] hover:from-[#0891b2] text-white font-black p-2.5 rounded-xl shadow-md shadow-cyan-500/25 transition-all cursor-pointer shrink-0 active:scale-95"
                  title="Subscribe"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-white" />
                </button>
              </form>

              {newsletterSubscribed && (
                <div className="text-[11px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-700/60 px-3 py-1.5 rounded-xl">
                  ✓ Thank you for subscribing!
                </div>
              )}
            </div>

            {/* Bottom Copyright */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
              <div>
                &copy; 2026 <span className="font-black tracking-wide bg-gradient-to-r from-[#06b6d4] via-[#38bdf8] to-[#818cf8] bg-clip-text text-transparent">TicketPro</span>. All rights reserved.
              </div>

              <div className="flex items-center space-x-3 text-slate-400">
                <a href="#about" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
                <span>|</span>
                <a href="#about" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
