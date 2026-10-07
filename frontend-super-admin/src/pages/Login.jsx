import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Mail,
  Ticket, 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('kushwaharitik9423@gmail.com');
  const [password, setPassword] = useState('Ritik@2003');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState(() => 
    window.location.search.includes('session_expired') 
      ? 'Your session expired after server restart. Please sign in to re-connect live database.' 
      : ''
  );

  const validateEmailFormat = (val) => {
    if (!val || !val.trim()) {
      return 'Please enter your email address.';
    }
    const trimmed = val.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      if (!trimmed.includes('@')) {
        return "Please include an '@' in your email address.";
      }
      const parts = trimmed.split('@');
      if (!parts[1] || !parts[1].includes('.')) {
        return 'Please enter a complete domain name (e.g., .com, .io).';
      }
      return 'Please enter a valid email address (e.g., admin@ticketpro.io).';
    }

    // Common domain typo detector
    const parts = trimmed.toLowerCase().split('@');
    if (parts.length === 2) {
      const domain = parts[1];
      if (domain === 'gamil.com' || domain === 'gnail.com' || domain === 'gmaill.com') {
        return `Did you mean @gmail.com? (${parts[0]}@gmail.com)`;
      }
      if (domain === 'yaho.com' || domain === 'yahooo.com') {
        return `Did you mean @yahoo.com? (${parts[0]}@yahoo.com)`;
      }
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (emailTouched || emailWarning) {
      setEmailWarning(validateEmailFormat(val));
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (email) {
      setEmailWarning(validateEmailFormat(email));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailTouched(true);
    const emailErr = validateEmailFormat(email);
    if (emailErr) {
      setEmailWarning(emailErr);
      setError(emailErr);
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');
    setEmailWarning('');

    try {
      const uProfile = await login(email.trim(), password);
      if (uProfile.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied. Only Super Admin is authorized to login here.');
      }
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.message || 'Invalid email or password.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f0ff] text-left font-sans flex flex-col items-center justify-center p-3.5 sm:p-8 select-none">
      
      {/* Top Floating Responsive Back Button Bar */}
      <div className="w-full max-w-5xl mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-700 hover:text-cyan-700 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-2xl border border-cyan-100 shadow-xs transition-all active:scale-95 cursor-pointer"
          title="Go Back"
        >
          <ArrowLeft className="h-4 w-4 text-cyan-700" />
          <span>Back</span>
        </button>
        <span className="text-[11px] font-bold text-slate-400">Super Admin Portal</span>
      </div>

      {/* 1-TO-1 EXACT MATCH TO USER'S NEW LOGIN SCREENSHOT */}
      <div className="max-w-5xl w-full bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-cyan-100/50 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
        
        {/* LEFT COLUMN: Modern Metallic Laptop Analytics Graphic & Command Center Branding */}
        <div className="order-2 lg:order-1 lg:col-span-6 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden text-white">
          
          {/* Ambient Lighting Background Blurs */}
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl pointer-events-none"></div>

          {/* TicketPro Brand Header */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-2 sm:space-x-2.5">
              {/* Outstanding 3D Glassmorphic TicketPro Brand Emblem */}
              <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-300">
                <svg 
                  viewBox="0 0 48 48" 
                  className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 drop-shadow-[0_4px_12px_rgba(2,132,199,0.38)]" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="tpSaLgBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d2ff" />
                      <stop offset="45%" stopColor="#0284c7" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="tpSaLgSpecGloss" x1="50%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="tpSaLgBorderShine" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
                    </linearGradient>
                  </defs>

                  {/* Rich 3D Gradient Base Orb */}
                  <circle cx="24" cy="24" r="22" fill="url(#tpSaLgBrandGrad)" />
                  
                  {/* Specular 3D Glass Highlight Arc */}
                  <ellipse cx="24" cy="14" rx="15" ry="8" fill="url(#tpSaLgSpecGloss)" opacity="0.4" />
                  
                  {/* Crisp Inner Glass Ring */}
                  <circle cx="24" cy="24" r="21" stroke="url(#tpSaLgBorderShine)" strokeWidth="1.5" />

                  {/* Ultra-Crisp Bespoke Ticket Emblem */}
                  <g filter="drop-shadow(0 2px 4px rgba(12, 23, 47, 0.3))">
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

              {/* Brand Typography & Tagline Lockup */}
              <div className="w-fit flex flex-col items-stretch select-none">
                <div className="text-xl sm:text-2xl md:text-[25px] font-black tracking-tight leading-none text-center">
                  <span className="text-white">Ticket</span>
                  <span className="bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#93c5fd] bg-clip-text text-transparent">Pro</span>
                </div>

                {/* Tagline Lockup: Tight gap right under TicketPro without blank void */}
                <div className="w-full mt-[2px] sm:mt-1 flex flex-col items-stretch">
                  <div className="w-full flex items-center justify-between gap-1 sm:gap-1.5 text-[#38bdf8] leading-none">
                    <span className="h-[2px] sm:h-[2.5px] flex-1 bg-[#38bdf8] rounded-full min-w-[6px]" />
                    <span className="text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black tracking-[0.16em] sm:tracking-[0.18em] uppercase whitespace-nowrap shrink-0">
                      SMART TICKETING
                    </span>
                    <span className="h-[2px] sm:h-[2.5px] flex-1 bg-[#38bdf8] rounded-full min-w-[6px]" />
                  </div>
                  <div className="w-full text-center text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black tracking-[0.22em] sm:tracking-[0.24em] text-[#38bdf8] uppercase whitespace-nowrap leading-none mt-[2px]">
                    BETTER SUPPORT
                  </div>
                </div>
              </div>
            </div>

            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
              System Active 🟢
            </span>
          </div>

          {/* Center Graphic: Floating Metallic Laptop with TicketPro Analytics Screen */}
          <div className="my-auto py-6 flex flex-col items-center justify-center relative z-10">
            
            <div className="relative w-full max-w-md group">
              {/* Soft Metallic Glow Behind Laptop */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-60 transition duration-700"></div>

              {/* Metallic Laptop Mockup Image */}
              <div className="relative rounded-2xl overflow-hidden border border-indigo-400/30 shadow-2xl bg-slate-900/90 transform hover:scale-[1.02] transition-transform duration-500">
                <img 
                  src="/laptop_analytics.jpg" 
                  alt="TicketPro Helpdesk Analytics Dashboard Mockup" 
                  className="w-full h-auto object-cover rounded-xl shadow-lg"
                />
              </div>

              {/* Floating Overlay Badge: Live Analytics Metric */}
              <div className="absolute -bottom-3 -right-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-500/40 shadow-xl flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[11px] font-extrabold text-white">99.8% Resolution SLA</span>
              </div>
            </div>

            <div className="mt-6 text-center space-y-1.5 max-w-sm">
              <h3 className="text-base font-black text-white tracking-tight">Centralized Multi-Tenant Analytics</h3>
              <p className="text-xs text-indigo-200/80 font-medium leading-relaxed">
                Monitor real-time support queues, active company workspaces, and SLA resolution performance from one command center.
              </p>
            </div>

          </div>

          {/* Footer Security Badge */}
          <div className="flex items-center justify-between text-[10px] text-indigo-300/70 font-bold border-t border-indigo-900/60 pt-3 relative z-10">
            <span>Super Admin Portal • Encrypted Security</span>
            <span>v2.5 Enterprise</span>
          </div>
        </div>

        {/* RIGHT COLUMN: White Form Card (Welcome Back!) */}
        <div className="order-1 lg:order-2 lg:col-span-6 p-6 sm:p-12 flex flex-col justify-between bg-white relative z-10">
          <div>
            
            {/* Mobile Brand Logo */}
            <div className="flex lg:hidden items-center justify-center space-x-2 sm:space-x-2.5 mb-5">
              {/* Outstanding 3D Glassmorphic TicketPro Brand Emblem */}
              <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-300">
                <svg 
                  viewBox="0 0 48 48" 
                  className="h-9 w-9 sm:h-10 sm:w-10 drop-shadow-[0_4px_12px_rgba(2,132,199,0.38)]" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="tpSaLgMobBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d2ff" />
                      <stop offset="45%" stopColor="#0284c7" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="tpSaLgMobSpecGloss" x1="50%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="tpSaLgMobBorderShine" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
                    </linearGradient>
                  </defs>

                  {/* Rich 3D Gradient Base Orb */}
                  <circle cx="24" cy="24" r="22" fill="url(#tpSaLgMobBrandGrad)" />
                  
                  {/* Specular 3D Glass Highlight Arc */}
                  <ellipse cx="24" cy="14" rx="15" ry="8" fill="url(#tpSaLgMobSpecGloss)" opacity="0.4" />
                  
                  {/* Crisp Inner Glass Ring */}
                  <circle cx="24" cy="24" r="21" stroke="url(#tpSaLgMobBorderShine)" strokeWidth="1.5" />

                  {/* Ultra-Crisp Bespoke Ticket Emblem */}
                  <g filter="drop-shadow(0 2px 4px rgba(12, 23, 47, 0.3))">
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

              {/* Brand Typography & Tagline Lockup */}
              <div className="w-fit flex flex-col items-stretch select-none">
                <div className="text-xl sm:text-2xl font-black tracking-tight leading-none text-center">
                  <span className="text-[#050e24]">Ticket</span>
                  <span className="bg-gradient-to-r from-[#1d68f0] via-[#0284c7] to-[#00b4d8] bg-clip-text text-transparent">Pro</span>
                </div>

                {/* Tagline Lockup: Tight gap right under TicketPro without blank void */}
                <div className="w-full mt-[2px] flex flex-col items-stretch">
                  <div className="w-full flex items-center justify-between gap-1 text-[#0072ea] leading-none">
                    <span className="h-[2px] flex-1 bg-[#0072ea] rounded-full min-w-[6px]" />
                    <span className="text-[6.5px] sm:text-[7.5px] font-black tracking-[0.16em] uppercase whitespace-nowrap shrink-0">
                      SMART TICKETING
                    </span>
                    <span className="h-[2px] flex-1 bg-[#0072ea] rounded-full min-w-[6px]" />
                  </div>
                  <div className="w-full text-center text-[6.5px] sm:text-[7.5px] font-black tracking-[0.22em] text-[#0072ea] uppercase whitespace-nowrap leading-none mt-[2px]">
                    BETTER SUPPORT
                  </div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-6 sm:mb-8 space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-[#111827]">Welcome Back!</h2>
              <p className="text-xs font-semibold text-gray-400">Login to Super Admin Platform Root</p>
            </div>

            {infoMsg && (
              <div className="rounded-xl bg-amber-50 p-3.5 text-xs font-bold text-amber-800 border border-amber-200 mb-5 flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{infoMsg}</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 p-3.5 text-xs font-bold text-red-600 border border-red-100 mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Email Address */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-[#111827]">Email Address</label>
                  {emailWarning && (
                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="h-3 w-3" />
                      Invalid Email
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    placeholder="Enter your email"
                    className={`block w-full rounded-xl border px-3.5 py-3 pl-10 text-xs font-semibold placeholder-gray-400 focus:outline-none transition-all ${
                      emailWarning
                        ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-400/20 bg-rose-50/20 text-rose-900'
                        : 'border-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 text-gray-800'
                    }`}
                  />
                  <Mail className={`h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                    emailWarning ? 'text-rose-500' : 'text-gray-400'
                  }`} />
                </div>
                {emailWarning && (
                  <div className="flex items-start space-x-1.5 mt-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-rose-600" />
                    <div className="text-[11px] font-bold leading-tight">
                      <span>{emailWarning}</span>
                      {emailWarning.includes('Did you mean') && (
                        <button
                          type="button"
                          onClick={() => {
                            const match = emailWarning.match(/\((.*?)\)/);
                            if (match && match[1]) {
                              setEmail(match[1]);
                              setEmailWarning('');
                            }
                          }}
                          className="ml-2 underline text-indigo-700 hover:text-indigo-900 font-black cursor-pointer"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#111827]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="block w-full rounded-xl border border-gray-200 px-3.5 py-3 pl-10 pr-10 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                  />
                  <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs font-semibold pt-1">
                <label className="flex items-center space-x-2 text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-cyan-700 focus:ring-cyan-500"
                  />
                  <span>Remember me</span>
                </label>
                <a 
                  href="#forgot" 
                  onClick={(e) => { e.preventDefault(); alert("Super Admin password is standard configured in application.properties."); }} 
                  className="text-cyan-700 hover:underline font-semibold"
                >
                  Forgot Password?
                </a>
              </div>

              {/* Submit Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold py-3.5 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Login</span>
                )}
              </button>

              {/* Divider: or */}
              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative px-4 bg-white text-[11px] font-semibold text-gray-400 uppercase">
                  or
                </div>
              </div>

              {/* Google Login Button matching exact screenshot */}
              <button
                type="button"
                onClick={() => alert("Google SSO is enabled for Super Admin accounts.")}
                className="w-full flex items-center justify-center space-x-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 py-3 text-xs font-bold text-gray-700 transition-all shadow-2xs cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Login with Google</span>
              </button>
            </form>
          </div>

          <div className="text-center pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-semibold">
              Platform Master Access • Multi-Tenant Outpost
            </p>
          </div>

        </div>

      </div>
      
    </div>
  );
};

export default Login;
