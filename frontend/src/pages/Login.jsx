import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { companyCodeParam } = useParams();

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
    api.get('/auth/companies')
      .then(data => {
        if (Array.isArray(data)) setActiveCompanies(data);
      })
      .catch(() => {});
  }, []);

  // Pre-fill company code if passed in URL params
  useEffect(() => {
    if (companyCodeParam) {
      setLoginCompanyCode(companyCodeParam.toUpperCase());
      setShowCompanyField(true);
    }
  }, [companyCodeParam]);

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
  const [showCompanyField, setShowCompanyField] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  // Forgot Password & OTP State — now inline (no modal)
  // 'view': 'login' | 'forgot' (covers all forgot steps via otpStep)
  const [currentView, setCurrentView] = useState('login');
  const [otpStep, setOtpStep] = useState(1); // 1 = Enter Email, 2 = Verify OTP, 3 = New Password, 4 = Success
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailWarning, setForgotEmailWarning] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [, setResetVerifiedToken] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    let interval = null;
    if (currentView === 'forgot' && otpStep === 2 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentView, otpStep, otpTimer]);

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
        setEmailWarning('Invalid email or password. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToForgot = () => {
    setCurrentView('forgot');
    setOtpStep(1);
    setForgotEmail(loginEmail || '');
    setOtpCode('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setResetVerifiedToken('');
    setOtpError('');
    setOtpSuccess('');
    setForgotEmailWarning('');
    setOtpTimer(300);
    setResendCooldown(30);
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
    setOtpStep(1);
    setOtpError('');
    setOtpSuccess('');
    setForgotEmailWarning('');
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
      setOtpStep(3);
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
      setOtpStep(4);
    } catch (err) {
      setOtpError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  /* =====================================================================
     SHARED LEFT PANEL (Identical for login & forgot password views)
     ===================================================================== */
  const LeftPanel = (
    <div 
      className="w-full lg:w-1/2 relative p-7 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-between shrink-0 overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.28) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(56, 189, 248, 0.12) 0%, transparent 50%), linear-gradient(155deg, #1b104d 0%, #120a35 55%, #0b0522 100%)'
      }}
    >
      {/* Soft atmospheric background lights */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

      {/* Top Logo Lockup */}
      <div 
        onClick={() => navigate('/')} 
        className="relative z-10 flex items-center space-x-3.5 cursor-pointer group w-fit"
        title="Return to Home"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] flex items-center justify-center shadow-[0_0_24px_rgba(56,189,248,0.45)] ring-2 ring-white/20 shrink-0 group-hover:scale-105 transition-transform duration-300">
          <svg 
            viewBox="0 0 24 24" 
            className="w-6 h-6 text-white" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
            <line x1="12" y1="9" x2="12" y2="9.01" strokeWidth="3" />
            <line x1="12" y1="12" x2="12" y2="12.01" strokeWidth="3" />
            <line x1="12" y1="15" x2="12" y2="15.01" strokeWidth="3" />
          </svg>
        </div>
        <div className="flex flex-col">
          <div className="text-2xl font-black tracking-tight leading-none">
            <span className="text-white">Ticket</span>
            <span className="text-[#38bdf8]">Pro</span>
          </div>
          <div className="text-[8.5px] font-extrabold tracking-[0.24em] text-[#38bdf8] uppercase mt-1 leading-none">
            SMART TICKETING · BETTER SUPPORT
          </div>
        </div>
      </div>

      {/* Center Hero Messaging */}
      <div className="relative z-10 mt-8 mb-4 lg:my-auto lg:py-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.12]">
          Every ticket,<br />
          handled <span className="text-[#38bdf8]">on time.</span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base font-normal mt-4 mb-8 lg:mb-10 max-w-md leading-relaxed hidden sm:block">
          One calm workspace for your company admins, agents and customers.
        </p>

        {/* 3 Core Feature Items */}
        <div className="space-y-5 hidden lg:block">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center shrink-0 shadow-sm backdrop-blur-sm">
              <Layers className="w-5 h-5 text-indigo-300" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Multi-company workspaces</h3>
              <p className="text-xs text-slate-300/80 mt-0.5 font-normal">Isolated data for every organization.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center shrink-0 shadow-sm backdrop-blur-sm">
              <Users className="w-5 h-5 text-indigo-300" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Role-based access</h3>
              <p className="text-xs text-slate-300/80 mt-0.5 font-normal">Company admins, agents and customers.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center shrink-0 shadow-sm backdrop-blur-sm">
              <ShieldCheck className="w-5 h-5 text-indigo-300" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Secure & real-time</h3>
              <p className="text-xs text-slate-300/80 mt-0.5 font-normal">Encrypted sessions with live updates.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Metrics */}
      <div className="relative z-10 pt-6 sm:pt-8 hidden lg:flex items-center gap-8 sm:gap-12">
        <div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight">4m 12s</div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">median first reply</div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight">98.4%</div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">within SLA</div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight">312</div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">resolved today</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#110a36] text-left font-sans select-none overflow-x-hidden">

      {/* LEFT PANEL */}
      {LeftPanel}

      {/* =========================================================================
          RIGHT PANEL — Switches between LOGIN and FORGOT PASSWORD views inline
          ========================================================================= */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-start lg:justify-center items-center px-6 sm:px-12 lg:px-16 pt-8 pb-12 sm:pt-10 sm:pb-14 lg:py-16 flex-1 lg:min-h-screen relative z-10 rounded-t-[32px] sm:rounded-t-[36px] lg:rounded-none -mt-6 lg:mt-0 shadow-2xl lg:shadow-none">
        <div className="w-full max-w-[420px]">

          {/* ===== LOGIN VIEW ===== */}
          {currentView === 'login' && (
            <>
              {/* Heading */}
              <div className="mb-8">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
                  Welcome back
                </h2>
                <p className="text-sm sm:text-base text-[#64748b] font-normal mt-2">
                  Sign in to your support workspace.
                </p>
              </div>

              {/* Feedback Alerts */}
              {error && (
                <div className="p-3.5 mb-6 rounded-2xl bg-red-50 text-red-700 text-xs font-bold border border-red-200 animate-in fade-in space-y-2">
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
                <div className="p-3.5 mb-6 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 animate-in fade-in">
                  {success}
                </div>
              )}

              {/* LOGIN FORM */}
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {/* Email Address */}
                <div>
                  <label className="block text-sm font-semibold text-[#0f172a] mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={loginEmail}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    placeholder="name@company.com"
                    className={`w-full px-4 py-3.5 bg-white border rounded-2xl text-sm sm:text-base text-[#0f172a] placeholder-[#94a3b8] focus:outline-none transition-all ${
                      emailWarning
                        ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-400/20 bg-rose-50/20 text-rose-900'
                        : 'border-[#e2e8f0] focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10'
                    }`}
                  />
                  {emailWarning && (
                    <div className="flex items-start space-x-1.5 mt-2 p-2 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 animate-in fade-in text-xs font-medium">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-rose-600" />
                      <span>{emailWarning}</span>
                    </div>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-[#0f172a] mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3.5 pr-12 bg-white border border-[#e2e8f0] rounded-2xl text-sm sm:text-base text-[#0f172a] placeholder-[#94a3b8] focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Forgot password? Link */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={handleGoToForgot}
                    className="text-sm font-medium text-[#4f46e5] hover:text-[#4338ca] hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign in Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 bg-[#4f46e5] hover:bg-[#4338ca] active:scale-[0.99] text-white text-base font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="w-4 h-4 ml-1 inline" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-7">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#e2e8f0]" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-[#94a3b8] font-semibold tracking-wider">OR</span>
                  </div>
                </div>

                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={() => {
                    setError('Google Single Sign-On is managed by your Enterprise Super Admin.');
                  }}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-[#e2e8f0] rounded-2xl text-sm sm:text-base font-semibold text-[#0f172a] shadow-xs active:scale-[0.99] transition-all flex items-center justify-center space-x-3 cursor-pointer"
                >
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Optional Workspace Code Toggle */}
                {showCompanyField ? (
                  <div className="pt-2 animate-in fade-in space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[#0f172a]">Workspace Code</label>
                      <button 
                        type="button" 
                        onClick={() => { setShowCompanyField(false); setLoginCompanyCode(''); }}
                        className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        list="active-companies-datalist"
                        value={loginCompanyCode}
                        onChange={(e) => setLoginCompanyCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFCBANK (Optional)"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-[#e2e8f0] rounded-xl text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:border-[#4f46e5] focus:outline-none"
                      />
                      <Building2 className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <datalist id="active-companies-datalist">
                        {activeCompanies.map(c => (
                          <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
                        ))}
                      </datalist>
                    </div>
                  </div>
                ) : (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCompanyField(true)}
                      className="text-xs text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      Have a specific workspace code?
                    </button>
                  </div>
                )}

                {/* Footer Registration Link */}
                <div className="text-center pt-2">
                  <p className="text-sm text-[#64748b]">
                    New organization?{' '}
                    <Link to="/onboard" className="text-[#4f46e5] font-semibold hover:text-[#4338ca] hover:underline">
                      Create a workspace
                    </Link>
                  </p>
                </div>
              </form>
            </>
          )}

          {/* ===== FORGOT PASSWORD VIEW (inline, same right panel) ===== */}
          {currentView === 'forgot' && (
            <>
              {/* ── STEP 1: Enter Email ── */}
              {otpStep === 1 && (
                <div className="animate-in fade-in duration-200">
                  {/* Back to sign in */}
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="flex items-center space-x-1.5 text-sm text-[#64748b] hover:text-[#0f172a] font-medium mb-8 cursor-pointer transition-colors group"
                  >
                    <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    <span>Back to sign in</span>
                  </button>

                  {/* Heading */}
                  <div className="mb-8">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
                      Forgot your password?
                    </h2>
                    <p className="text-sm sm:text-base text-[#64748b] font-normal mt-2">
                      Enter your email and we'll send you a reset link.
                    </p>
                  </div>

                  {/* Error */}
                  {otpError && (
                    <div className="p-3.5 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in">
                      {otpError}
                    </div>
                  )}

                  {/* Email Form */}
                  <form onSubmit={handleSendOtp} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-[#0f172a] mb-2">
                        Email address
                      </label>
                      <input
                        type="email"
                        required
                        autoFocus
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (forgotEmailWarning) setForgotEmailWarning(validateEmailFormat(e.target.value));
                        }}
                        onBlur={() => {
                          if (forgotEmail) setForgotEmailWarning(validateEmailFormat(forgotEmail));
                        }}
                        placeholder="name@company.com"
                        className={`w-full px-4 py-3.5 bg-white border rounded-2xl text-sm sm:text-base text-[#0f172a] placeholder-[#94a3b8] focus:outline-none transition-all ${
                          forgotEmailWarning
                            ? 'border-rose-400 focus:border-rose-500 ring-2 ring-rose-400/20 bg-rose-50/20 text-rose-900'
                            : 'border-[#e2e8f0] focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10'
                        }`}
                      />
                      {forgotEmailWarning && (
                        <div className="flex items-start space-x-1.5 mt-2 p-2 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 animate-in fade-in text-xs font-medium">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-rose-600" />
                          <span>{forgotEmailWarning}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="w-full py-3.5 px-5 bg-[#4f46e5] hover:bg-[#4338ca] active:scale-[0.99] text-white text-base font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                    >
                      {otpLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>Send reset link</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ── STEP 2: Verify OTP ── */}
              {otpStep === 2 && (
                <div className="animate-in fade-in duration-200">
                  <button
                    type="button"
                    onClick={() => { setOtpStep(1); setOtpError(''); setOtpSuccess(''); }}
                    className="flex items-center space-x-1.5 text-sm text-[#64748b] hover:text-[#0f172a] font-medium mb-8 cursor-pointer transition-colors group"
                  >
                    <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    <span>Change email</span>
                  </button>

                  <div className="mb-8">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
                      Verify your code
                    </h2>
                    <p className="text-sm sm:text-base text-[#64748b] font-normal mt-2">
                      We sent a 6-digit code to <span className="font-semibold text-[#0f172a]">{forgotEmail}</span>
                    </p>
                  </div>

                  {otpSuccess && (
                    <div className="p-3.5 mb-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold animate-in fade-in flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{otpSuccess}</span>
                    </div>
                  )}

                  {otpError && (
                    <div className="p-3.5 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in">
                      {otpError}
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtpOnly} className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-[#0f172a]">Verification code</label>
                        <div className="flex items-center space-x-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="• • • • • •"
                        className="w-full tracking-[0.4em] text-center text-2xl font-black py-4 px-4 rounded-2xl border-2 border-[#e2e8f0] focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 outline-none transition-all"
                      />
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || otpLoading}
                          onClick={handleSendOtp}
                          className="text-xs font-semibold text-[#4f46e5] hover:underline disabled:text-[#94a3b8] disabled:no-underline flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading || otpCode.length < 6}
                      className="w-full py-3.5 px-5 bg-[#4f46e5] hover:bg-[#4338ca] active:scale-[0.99] text-white text-base font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                    >
                      {otpLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ── STEP 3: Create New Password ── */}
              {otpStep === 3 && (
                <div className="animate-in fade-in duration-200">
                  <div className="mb-8">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
                      Create new password
                    </h2>
                    <p className="text-sm sm:text-base text-[#64748b] font-normal mt-2">
                      Your identity has been verified. Set a new password below.
                    </p>
                  </div>

                  <div className="p-3.5 mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>OTP verified successfully!</span>
                  </div>

                  {otpError && (
                    <div className="p-3.5 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold animate-in fade-in">
                      {otpError}
                    </div>
                  )}

                  <form onSubmit={handleSetNewPassword} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-[#0f172a] mb-2">New password</label>
                      <div className="relative">
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          autoFocus
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full px-4 py-3.5 pr-12 bg-white border border-[#e2e8f0] rounded-2xl text-sm sm:text-base text-[#0f172a] placeholder-[#94a3b8] focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569] transition-colors cursor-pointer"
                        >
                          {showForgotNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#0f172a] mb-2">Confirm password</label>
                      <div className="relative">
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="Re-type new password"
                          className="w-full px-4 py-3.5 pr-12 bg-white border border-[#e2e8f0] rounded-2xl text-sm sm:text-base text-[#0f172a] placeholder-[#94a3b8] focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={otpLoading}
                      className="w-full py-3.5 px-5 bg-[#4f46e5] hover:bg-[#4338ca] active:scale-[0.99] text-white text-base font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer mt-2"
                    >
                      {otpLoading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <span>Update password</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ── STEP 4: Success ── */}
              {otpStep === 4 && (
                <div className="animate-in fade-in duration-200 text-center py-6">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50 mb-6">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                    Password updated!
                  </h2>
                  <p className="text-sm text-[#64748b] font-normal mt-2 mb-8 max-w-xs mx-auto">
                    Your password has been successfully reset. You can now sign in with your new credentials.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      handleBackToLogin();
                      setLoginEmail(forgotEmail);
                      setLoginPassword('');
                      setSuccess('Password reset successfully. Please sign in with your new credentials.');
                    }}
                    className="w-full py-3.5 px-5 bg-[#4f46e5] hover:bg-[#4338ca] active:scale-[0.99] text-white text-base font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Back to sign in</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>

    </div>
  );
};

export default Login;
