import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Building2, 
  Ticket,
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  RefreshCw,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Layers,
  Users,
  KeyRound,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Active companies cache for autocomplete
  const [activeCompanies, setActiveCompanies] = useState([]);
  const [isSuperAdminError, setIsSuperAdminError] = useState(false);

  // Auto-login if Impersonation Token passed from Super Admin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const impToken = params.get('impersonateToken');
    if (impToken) {
      const impEmail = params.get('email');
      const impName = params.get('name');
      const impRole = params.get('role') || 'COMPANY_ADMIN';
      const impCompId = params.get('companyId');
      const impCompName = params.get('companyName');
      const impCompCode = params.get('companyCode');

      sessionStorage.setItem('token', impToken); localStorage.removeItem('token');
      const userObj = {
        email: impEmail || 'admin@' + (impCompCode ? impCompCode.toLowerCase() : 'tenant') + '.com',
        name: impName || 'Company Administrator',
        role: impRole,
        companyId: impCompId ? Number(impCompId) : null,
        companyName: impCompName || 'Company Workspace',
        companyCode: impCompCode || 'COMPANY',
        isImpersonated: true
      };
      sessionStorage.setItem('user', JSON.stringify(userObj)); localStorage.removeItem('user');
      window.location.href = '/dashboard';
    }
  }, []);

  // Fetch active companies on load for autocomplete / hint
  useEffect(() => {
    fetch('/api/auth/companies')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setActiveCompanies(data);
      })
      .catch(() => {});
  }, []);

  // Check if redirected due to deleted/inactive company or super admin restriction
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'company_deleted') {
      setError('Your company workspace has been deleted from Super Admin. All user sessions have been revoked.');
    } else if (params.get('error') === 'company_inactive') {
      setError('Your company account is currently inactive. Please contact Super Admin.');
    } else if (params.get('error') === 'super_admin_portal_required') {
      setIsSuperAdminError(true);
      setError('Super Admin account is not permitted in company workspaces. Please use the dedicated Super Admin Portal.');
    }
  }, []);

  // Login State
  const [loginCompanyCode, setLoginCompanyCode] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailWarning, setEmailWarning] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  // Email validation helper
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
        return 'Please enter a complete domain name (e.g., name@company.com).';
      }
      return 'Please enter a valid email address (e.g., name@company.com).';
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
      if (domain === 'hotmial.com' || domain === 'hotmaill.com') {
        return `Did you mean @hotmail.com? (${parts[0]}@hotmail.com)`;
      }
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setLoginEmail(val);
    if (emailTouched || emailWarning) {
      setEmailWarning(validateEmailFormat(val));
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (loginEmail) {
      setEmailWarning(validateEmailFormat(loginEmail));
    }
  };

  // Forgot Password & OTP State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [otpStep, setOtpStep] = useState(1); // 1 = Enter Email, 2 = Verify OTP & Reset, 3 = Success
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailWarning, setForgotEmailWarning] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [resetVerifiedToken, setResetVerifiedToken] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    let interval = null;
    if (showForgotModal && otpStep === 2 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showForgotModal, otpStep, otpTimer]);

  // Feedback States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setEmailTouched(true);
    const emailErr = validateEmailFormat(loginEmail);
    if (emailErr) {
      setEmailWarning(emailErr);
      setError(emailErr);
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');
    setEmailWarning('');
    setIsSuperAdminError(false);
    setSuccess('');

    try {
      await login(loginEmail.trim(), loginPassword, loginCompanyCode);
      navigate('/dashboard');
    } catch (err) {
      if (err.message === 'SUPER_ADMIN_PORTAL_ONLY') {
        setIsSuperAdminError(true);
        setError('This account is Master Super Admin. Super Admin can only login via the Super Admin Portal.');
      } else {
        setIsSuperAdminError(false);
        const errMsg = err.message || 'Invalid email address or password.';
        setError(errMsg);
        // Highlight email field with warning
        setEmailWarning('Invalid email or password. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setShowForgotModal(true);
    setOtpStep(1);
    setForgotEmail(loginEmail || '');
    setOtpCode('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setResetVerifiedToken('');
    setOtpError('');
    setOtpSuccess('');
    setOtpTimer(300);
    setResendCooldown(30);
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const emailErr = validateEmailFormat(forgotEmail);
    if (emailErr) {
      setForgotEmailWarning(emailErr);
      setOtpError(emailErr);
      return;
    }
    setForgotEmailWarning('');
    setOtpLoading(true);
    setOtpError('');
    setOtpSuccess('');
    try {
      const res = await api.post('/auth/send-reset-otp', { email: forgotEmail.trim() });
      setOtpSuccess(res.message || 'Verification code sent to your email.');
      setOtpStep(2);
      setOtpTimer(300);
      setResendCooldown(30);
    } catch (err) {
      setOtpError(err.message || 'Failed to send verification code. Please check your email.');
      setForgotEmailWarning('No account associated with this email address was found.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 2: Verify OTP First
  const handleVerifyOtpOnly = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpError('Please enter the valid 6-digit verification code.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    setOtpSuccess('');
    try {
      const res = await api.post('/auth/verify-otp', {
        email: forgotEmail.trim(),
        otp: otpCode.trim()
      });
      setResetVerifiedToken(res.resetToken || 'verified');
      setOtpSuccess('OTP verified successfully! Now please create your new password.');
      setOtpStep(3); // Step 3: Now allow user to set new password
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired verification code. Please check and try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Step 3: Submit New Password after successful verification
  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (!forgotNewPassword) {
      setOtpError('Please enter a new password.');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setOtpError('Password must be at least 8 characters with letters & numbers.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setOtpError('Passwords do not match. Please re-enter.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    try {
      await api.post('/auth/verify-reset-otp', {
        email: forgotEmail.trim(),
        otp: otpCode.trim(),
        newPassword: forgotNewPassword
      });
      setOtpStep(4); // Step 4: Complete
    } catch (err) {
      setOtpError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full bg-[#f3f4fa] text-left font-sans select-none flex flex-col items-center justify-start pt-4 sm:pt-6 pb-12 px-3 sm:px-6 overflow-x-hidden overflow-y-auto relative">

      {/* Top Stable Navigation Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-3 px-0.5 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-xs font-black text-slate-700 hover:text-cyan-700 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all active:scale-95 cursor-pointer"
          title="Return to Home"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-cyan-700" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline-block">TicketPro Helpdesk</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>

      {/* SINGLE UNIFIED 2-PANE CARD */}
      <div className="max-w-4xl w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-100 grid grid-cols-1 md:grid-cols-12 shrink-0">

        {/* LEFT PANE: BRANDING BANNER (5 Cols on md+) */}
        <div className="md:col-span-5 bg-gradient-to-b from-[#3730a3] via-[#312e81] to-[#1e1b4b] p-6 sm:p-8 text-white flex flex-col justify-between relative overflow-hidden">

          <div className="space-y-4 relative z-10">
            <div className="inline-flex items-center space-x-2 sm:space-x-2.5 cursor-pointer group shrink-0" onClick={() => navigate('/')}>
              {/* Outstanding 3D Glassmorphic TicketPro Brand Emblem */}
              <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-300">
                <svg 
                  viewBox="0 0 48 48" 
                  className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 drop-shadow-[0_4px_12px_rgba(2,132,199,0.38)]" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="tpFeLgBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d2ff" />
                      <stop offset="45%" stopColor="#0284c7" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="tpFeLgSpecGloss" x1="50%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="tpFeLgBorderShine" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
                    </linearGradient>
                  </defs>

                  {/* Rich 3D Gradient Base Orb */}
                  <circle cx="24" cy="24" r="22" fill="url(#tpFeLgBrandGrad)" />
                  
                  {/* Specular 3D Glass Highlight Arc */}
                  <ellipse cx="24" cy="14" rx="15" ry="8" fill="url(#tpFeLgSpecGloss)" opacity="0.4" />
                  
                  {/* Crisp Inner Glass Ring */}
                  <circle cx="24" cy="24" r="21" stroke="url(#tpFeLgBorderShine)" strokeWidth="1.5" />

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
                  <div className="w-full flex items-center justify-between gap-1 sm:gap-1.5 text-cyan-300 leading-none">
                    <span className="h-[2px] sm:h-[2.5px] flex-1 bg-cyan-300 rounded-full min-w-[6px]" />
                    <span className="text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black tracking-[0.16em] sm:tracking-[0.18em] uppercase whitespace-nowrap shrink-0">
                      SMART TICKETING
                    </span>
                    <span className="h-[2px] sm:h-[2.5px] flex-1 bg-cyan-300 rounded-full min-w-[6px]" />
                  </div>
                  <div className="w-full text-center text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black tracking-[0.22em] sm:tracking-[0.24em] text-cyan-300 uppercase whitespace-nowrap leading-none mt-[2px]">
                    BETTER SUPPORT
                  </div>
                </div>
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-1">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight leading-snug">
                Smart Ticketing<br />
                for Modern Businesses
              </h1>
              <p className="text-xs text-indigo-100/90 font-medium leading-relaxed">
                Manage, collaborate, and resolve client support inquiries with SLA tracking and live updates.
              </p>
            </div>

            {/* Features (Visible on tablet/desktop) */}
            <div className="space-y-2.5 pt-1 hidden sm:block">
              <div className="flex items-start space-x-2.5">
                <div className="h-6 w-6 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                  <Layers className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Multi-Company Architecture</h4>
                  <p className="text-[10px] text-indigo-200 font-medium">Isolated workspaces for every tenant organization.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="h-6 w-6 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                  <Users className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Role-Based Access</h4>
                  <p className="text-[10px] text-indigo-200 font-medium">Company Admins, Agents, and End-Users.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <div className="h-6 w-6 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                  <ShieldCheck className="h-3 w-3" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Encrypted & Real-time</h4>
                  <p className="text-[10px] text-indigo-200 font-medium">Live WebSockets with 256-bit secure sessions.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Vector Illustration */}
          <div className="pt-2 relative z-10 hidden md:flex justify-center items-end">
            <div className="relative w-full max-w-[230px]">
              <svg className="w-full h-30" viewBox="0 0 320 180" fill="none">
                <rect x="80" y="15" width="220" height="145" rx="10" fill="#ffffff" opacity="0.92" />
                <path d="M 80 25 C 80 19 85 15 91 15 L 289 15 C 295 15 300 19 300 25 L 300 32 L 80 32 Z" fill="#6366f1" opacity="0.35" />
                <circle cx="288" cy="23" r="3" fill="#6366f1" />
                <circle cx="278" cy="23" r="3" fill="#6366f1" />
                <circle cx="268" cy="23" r="3" fill="#6366f1" />

                <rect x="95" y="42" width="36" height="26" rx="5" fill="#c7d2fe" opacity="0.5" />
                <rect x="140" y="42" width="95" height="26" rx="5" fill="#e0e7ff" opacity="0.8" />
                <rect x="245" y="42" width="40" height="26" rx="5" fill="#c7d2fe" opacity="0.5" />

                <rect x="95" y="76" width="36" height="26" rx="5" fill="#e0e7ff" opacity="0.6" />
                <rect x="140" y="76" width="95" height="26" rx="5" fill="#e0e7ff" opacity="0.8" />
                <rect x="245" y="76" width="40" height="26" rx="5" fill="#c7d2fe" opacity="0.5" />

                <rect x="95" y="110" width="36" height="26" rx="5" fill="#c7d2fe" opacity="0.5" />
                <rect x="140" y="110" width="95" height="26" rx="5" fill="#e0e7ff" opacity="0.8" />

                <path d="M 268,135 L 296,135 L 290,170 L 274,170 Z" fill="#312e81" />
                <path d="M 282,100 Q 310,110 300,132 Q 282,126 282,100 Z" fill="#4338ca" />
                <path d="M 282,92 Q 260,105 266,128 Q 282,122 282,92 Z" fill="#3730a3" />

                <path d="M 62,60 Q 75,48 88,60 C 88,52 78,46 62,60 Z" fill="#0f172a" />
                <circle cx="75" cy="68" r="11" fill="#fdba74" />
                <rect x="72" y="77" width="6" height="6" fill="#fed7aa" />
                <path d="M 52,92 C 52,80 96,80 96,92 L 96,145 L 52,145 Z" fill="#1e293b" />
                <rect x="55" y="140" width="38" height="32" fill="#0f172a" />
                <path d="M 78,95 L 108,110 L 132,110" stroke="#fdba74" strokeWidth="5" strokeLinecap="round" />

                <rect x="25" y="125" width="145" height="7" rx="3" fill="#0f172a" />
                <rect x="34" y="132" width="5" height="42" fill="#0f172a" />
                <rect x="155" y="132" width="5" height="42" fill="#0f172a" />

                <path d="M 110,84 L 152,84 L 146,125 L 104,125 Z" fill="#0f172a" />
                <circle cx="128" cy="102" r="4" fill="#ffffff" />
              </svg>
            </div>
          </div>

        </div>

        {/* RIGHT PANE: LOGIN FORM (7 Cols on md+) */}
        <div className="md:col-span-7 p-6 sm:p-8 lg:p-9 flex flex-col justify-between bg-white text-left">

          <div className="space-y-4">

            {/* Header */}
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
                Welcome Back!
              </h2>
              <p className="text-xs font-semibold text-gray-400 mt-0.5">
                Enter your credentials to access your support workspace
              </p>
            </div>

            {/* Feedback Alerts */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 text-xs font-bold border border-red-200 animate-in fade-in space-y-2">
                <p>{error}</p>
                {isSuperAdminError && (
                  <div className="pt-1">
                    <a
                      href="http://localhost:5174/login"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs shadow-sm transition-all"
                    >
                      <span>Go to Super Admin Portal (Port 5174)</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 animate-in fade-in">
                {success}
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#111827]">Company Workspace / Code <span className="text-gray-400 font-normal">(Optional)</span></label>
                  {activeCompanies.length > 0 && (
                    <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">
                      {activeCompanies.length} Active {activeCompanies.length === 1 ? 'Company' : 'Companies'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    list="active-companies-datalist"
                    value={loginCompanyCode}
                    onChange={(e) => setLoginCompanyCode(e.target.value)}
                    placeholder={activeCompanies.length > 0 ? `e.g. ${activeCompanies.map(c => c.code).join(' or ')}` : "e.g. HDFCBANK or Leave blank"}
                    className="block w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 pl-10 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-[#4f46e5] focus:outline-none transition-all"
                  />
                  <Building2 className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <datalist id="active-companies-datalist">
                    {activeCompanies.map(c => (
                      <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#111827]">Email Address *</label>
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
                    autoComplete="username"
                    value={loginEmail}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    placeholder="name@company.com"
                    className={`block w-full rounded-2xl border px-3.5 py-2.5 pl-10 text-xs font-semibold placeholder-gray-400 focus:outline-none transition-all ${
                      emailWarning
                        ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-400/20 bg-rose-50/20 text-rose-900'
                        : 'border-gray-200 focus:border-[#4f46e5] text-gray-800'
                    }`}
                  />
                  <Mail className={`h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                    emailWarning ? 'text-rose-500' : 'text-gray-400'
                  }`} />
                </div>

                {/* Email Warning Alert Message */}
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
                              setLoginEmail(match[1]);
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

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#111827]">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your secret password"
                    className="block w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 pl-10 pr-10 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-[#4f46e5] focus:outline-none transition-all"
                  />
                  <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5]"
                  />
                  <span className="text-xs font-semibold text-gray-500">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-xs font-bold text-[#4f46e5] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-[#4f46e5] hover:bg-[#3730a3] text-white text-xs font-black tracking-wide shadow-lg shadow-cyan-500/20 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-98 cursor-pointer mt-1"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    <span>Authenticating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Login to Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2 text-gray-400 font-bold tracking-wider">or</span>
                </div>
              </div>

              {/* Google OAuth Option */}
              <button
                type="button"
                onClick={() => {
                  setError('Google Single Sign-On is managed by your Enterprise Super Admin.');
                }}
                className="w-full py-2.5 px-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all flex items-center justify-center space-x-2 shadow-2xs active:scale-98 cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Onboard Company Link */}
              <div className="text-center pt-1">
                <p className="text-xs text-gray-500 font-semibold">
                  New Organization?{' '}
                  <Link to="/onboard" className="text-[#4f46e5] font-black hover:underline inline-flex items-center space-x-1">
                    <span>Register Company Workspace</span>
                    <Sparkles className="h-3 w-3 text-amber-500" />
                  </Link>
                </p>
              </div>
            </form>

          </div>

          {/* Footer Security Badge */}
          <div className="text-center pt-4 mt-2 border-t border-gray-100 flex items-center justify-center space-x-1.5 text-slate-400 text-[11px] font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Protected by TicketPro Enterprise SSL 256-Bit Encryption</span>
          </div>
        </div>

      </div>

      {/* FORGOT PASSWORD MODAL WITH EMAIL OTP VERIFICATION */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-left relative overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-cyan-50 border border-cyan-100/80 flex items-center justify-center text-cyan-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Secure Password Reset</h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    {otpStep === 1 && "Step 1 of 3: Enter Registered Email"}
                    {otpStep === 2 && "Step 2 of 3: Verify 6-Digit OTP"}
                    {otpStep === 3 && "Step 3 of 3: Create New Password"}
                    {otpStep === 4 && "Password Successfully Reset"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close dialog"
                className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Alerts */}
            {otpError && (
              <div className="p-3 mb-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold animate-in fade-in">
                {otpError}
              </div>
            )}

            {/* STEP 1: ENTER EMAIL */}
            {otpStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Enter your registered account email. We will send a secure 6-digit verification code to reset your password.
                </p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Account Email</label>
                    {forgotEmailWarning && (
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
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotEmailWarning) setForgotEmailWarning(validateEmailFormat(e.target.value));
                      }}
                      onBlur={() => {
                        if (forgotEmail) setForgotEmailWarning(validateEmailFormat(forgotEmail));
                      }}
                      placeholder="you@company.com"
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none transition-all ${
                        forgotEmailWarning
                          ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-400/20 bg-rose-50/20 text-rose-900'
                          : 'border-slate-200 focus:border-cyan-500 text-slate-800'
                      }`}
                    />
                    <Mail className={`h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                      forgotEmailWarning ? 'text-rose-500' : 'text-slate-400'
                    }`} />
                  </div>
                  {forgotEmailWarning && (
                    <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5 mt-1 animate-in fade-in">
                      <AlertCircle className="h-3 w-3 shrink-0 text-rose-500" />
                      <span>{forgotEmailWarning}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-1/3 py-2.5 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-2/3 py-2.5 rounded-2xl bg-[#4f46e5] text-white text-xs font-black hover:bg-indigo-700 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 active:scale-98"
                  >
                    {otpLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit OTP</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: VERIFY OTP ONLY */}
            {otpStep === 2 && (
              <form onSubmit={handleVerifyOtpOnly} className="space-y-4">
                {otpSuccess && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold animate-in fade-in flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{otpSuccess}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Enter 6-Digit Verification Code</label>
                    <div className="flex items-center space-x-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      <Clock className="h-3 w-3" />
                      <span>{Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full tracking-widest text-center text-xl font-black py-3 rounded-2xl border-2 border-cyan-200 focus:border-cyan-500 focus:outline-none transition-all shadow-xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    OTP sent to <span className="font-bold text-slate-700">{forgotEmail}</span>.
                  </p>
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || otpLoading}
                      onClick={handleSendOtp}
                      className="text-[11px] font-bold text-cyan-700 hover:underline disabled:text-slate-400 disabled:no-underline flex items-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => { setOtpStep(1); setOtpError(''); }}
                    className="w-1/3 py-3 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    Change Email
                  </button>

                  <button
                    type="submit"
                    disabled={otpLoading || otpCode.length < 6}
                    className="w-2/3 py-3 rounded-2xl bg-[#4f46e5] text-white text-xs font-black hover:bg-indigo-700 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 active:scale-98"
                  >
                    {otpLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Verifying OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify OTP</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: CREATE NEW PASSWORD (APPEARS ONLY AFTER OTP MATCHES) */}
            {otpStep === 3 && (
              <form onSubmit={handleSetNewPassword} className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>OTP verified successfully! Now create your new password.</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">New Password *</label>
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="At least 8 chars (letters & numbers)"
                      className="w-full pl-9 pr-10 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-cyan-500 focus:outline-none transition-all"
                    />
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showForgotNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">Confirm New Password *</label>
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:border-cyan-500 focus:outline-none transition-all"
                    />
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-3 rounded-2xl bg-[#4f46e5] text-white text-xs font-black hover:bg-indigo-700 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 active:scale-98"
                  >
                    {otpLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Update Password & Save</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: SUCCESS */}
            {otpStep === 4 && (
              <div className="space-y-4 text-center py-3 animate-in fade-in">
                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900">Password Reset Complete!</h4>
                  <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto">
                    Your password has been successfully updated. You can now login to your account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setLoginEmail(forgotEmail);
                    setLoginPassword('');
                    setSuccess('Password reset successfully. Please login with your new credentials.');
                  }}
                  className="w-full py-3 rounded-2xl bg-[#4f46e5] text-white text-xs font-black hover:bg-indigo-700 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all active:scale-98"
                >
                  Proceed to Login
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
