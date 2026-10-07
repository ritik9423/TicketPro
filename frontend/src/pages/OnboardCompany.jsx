import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { createNotification } from '../utils/notify';
import { compressLogoImage } from '../utils/imageCompressor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Building2,
  Ticket, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Globe, 
  ShieldCheck,
  FolderPlus,
  ArrowRight,
  ArrowLeft,
  Home,
  Sparkles,
  AlertCircle,
  Zap,
  Layers
} from 'lucide-react';
import { generateCategoriesForIndustry } from '../utils/dynamicIndustryEngine';

const OnboardCompany = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    companyCode: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    industryType: 'IT & Software Support',
    companySize: '50-250 Employees',
    description: '',

    // Admin Credentials
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    confirmPassword: '',

    // Brand & SLA Config
    primaryColor: '#4f46e5',
    logoUrl: '',
    slaResponseHours: '2',
    slaResolutionHours: '24'
  });

  // Automatically synchronize any local onboarding requests to the backend database
  useEffect(() => {
    const syncCachedRequests = async () => {
      try {
        const stored = localStorage.getItem('ticketpro_onboarding_requests');
        if (!stored) return;
        const list = JSON.parse(stored);
        if (!Array.isArray(list) || list.length === 0) return;

        let modified = false;
        for (const req of list) {
          if (req.syncedToBackend) continue;
          try {
            await api.post('/companies/register-request', {
              name: req.name || req.companyName,
              companyName: req.companyName || req.name,
              companyCode: req.companyCode,
              email: req.email,
              phone: req.phone || '+91 9999999999',
              website: req.website || ('https://' + (req.companyCode || 'comp').toLowerCase() + '.ticketpro.com'),
              address: req.address || 'Corporate Office',
              adminName: req.adminName || 'Company Admin',
              adminEmail: req.adminEmail,
              adminPhone: req.adminPhone || req.phone || '+91 9999999999',
              adminPassword: req.adminPassword || 'Admin@2026',
              logoUrl: req.logoUrl || '',
              customFields: typeof req.customFields === 'string' ? req.customFields : JSON.stringify(req.customFields || {})
            });
            req.syncedToBackend = true;
            modified = true;
          } catch (err) {
            console.warn('Sync cached onboarding request failed:', err);
          }
        }
        if (modified) {
          localStorage.setItem('ticketpro_onboarding_requests', JSON.stringify(list));
        }
      } catch (_e) {}
    };
    syncCachedRequests();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'companyName' && (!prev.companyCode || prev.companyCode === prev.companyName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8))) {
        updated.companyCode = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
      }
      return updated;
    });
  };

  // Image Upload for Logo
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedBase64 = await compressLogoImage(file);
        if (compressedBase64) {
          setFormData((prev) => ({ ...prev, logoUrl: compressedBase64 }));
        }
      } catch (err) {
        console.error('Logo upload error:', err);
      }
    }
  };

  const handleNext = () => {
    setError('');

    if (step === 1) {
      if (!formData.companyName.trim() || !formData.email.trim()) {
        setError('Please enter Company Name and Official Email address.');
        return;
      }
    }

    if (step === 2) {
      if (!formData.adminName.trim() || !formData.adminEmail.trim() || !formData.adminPassword) {
        setError('Please provide Admin Name, Admin Email, and Admin Password.');
        return;
      }
      if (formData.adminPassword !== formData.confirmPassword) {
        setError('Admin passwords do not match.');
        return;
      }
    }

    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrev = () => {
    setError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    const codeToUse = (formData.companyCode || formData.companyName.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, '');

    const customFieldsJson = JSON.stringify({
      primaryColor: formData.primaryColor,
      slaResponseHours: formData.slaResponseHours,
      slaResolutionHours: formData.slaResolutionHours,
      industryType: formData.industryType,
      companySize: formData.companySize
    });

    try {
      let backendCompany = null;
      try {
        backendCompany = await api.post('/companies/register-request', {
          name: formData.companyName,
          companyName: formData.companyName,
          companyCode: codeToUse,
          email: formData.email,
          phone: formData.phone || '+91 9999999999',
          website: formData.website || ('https://' + codeToUse.toLowerCase() + '.ticketpro.com'),
          address: formData.address || 'Corporate Office',
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPhone: formData.adminPhone || formData.phone || '+91 9999999999',
          adminPassword: formData.adminPassword,
          logoUrl: formData.logoUrl || '',
          customFields: customFieldsJson
        });
      } catch (postErr) {
        console.warn('Backend registration failed, saving locally:', postErr);
      }

      const newCompanyObj = {
        id: (backendCompany && backendCompany.id) ? backendCompany.id : Date.now(),
        name: formData.companyName,
        companyName: formData.companyName,
        companyCode: (backendCompany && backendCompany.companyCode) ? backendCompany.companyCode : codeToUse,
        email: formData.email,
        phone: formData.phone || '+91 9999999999',
        website: formData.website || ('https://' + codeToUse.toLowerCase() + '.ticketpro.com'),
        address: formData.address || 'Corporate Office',
        status: 'PENDING',
        logoUrl: formData.logoUrl || '',
        customFields: customFieldsJson,
        syncedToBackend: !!backendCompany,
        createdAt: new Date().toISOString()
      };

      const deletedIds = JSON.parse(localStorage.getItem('ticketpro_deleted_company_ids') || '[]');
      const filteredDeletedIds = deletedIds.filter(id => 
        id !== codeToUse && 
        id.toString().toLowerCase() !== formData.email.toLowerCase() &&
        id.toString().toLowerCase() !== formData.adminEmail.toLowerCase()
      );
      localStorage.setItem('ticketpro_deleted_company_ids', JSON.stringify(filteredDeletedIds));

      const storedComps = localStorage.getItem('ticketpro_companies');
      let compList = [];
      if (storedComps) {
        try {
          compList = JSON.parse(storedComps).filter(c => 
            (c.email || '').toLowerCase() !== formData.email.toLowerCase() &&
            (c.companyCode || '').toUpperCase() !== codeToUse.toUpperCase()
          );
        } catch(_e) {}
      }
      const updatedCompList = [newCompanyObj, ...compList];
      localStorage.setItem('ticketpro_companies', JSON.stringify(updatedCompList));

      // Pre-generate tailored categories & forms for this new tenant
      try {
        const tenantCategories = generateCategoriesForIndustry(codeToUse, formData.companyName, formData.industryType);
        localStorage.setItem('ticketpro_categories_' + codeToUse, JSON.stringify(tenantCategories));
      } catch (_e) {}

      const storedReqs = localStorage.getItem('ticketpro_onboarding_requests');
      let reqList = [];
      if (storedReqs) {
        try {
          reqList = JSON.parse(storedReqs).filter(r => 
            (r.email || '').toLowerCase() !== formData.email.toLowerCase() &&
            (r.companyCode || '').toUpperCase() !== codeToUse.toUpperCase()
          );
        } catch(_e) {}
      }
      localStorage.setItem('ticketpro_onboarding_requests', JSON.stringify([{
        ...newCompanyObj,
        logoUrl: formData.logoUrl || '',
        adminName: formData.adminName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword
      }, ...reqList]));

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('ticketpro_company_updated'));

      // Dispatch Real-Time Notification & Email Alert to Super Admin
      createNotification({
        title: 'Company Onboarding: ' + formData.companyName,
        message: "Company '" + formData.companyName + "' (" + codeToUse + ") submitted workspace onboarding request. Admin: " + formData.adminName + " (" + formData.adminEmail + "). Approval required.",
        type: 'COMPANY_ONBOARDING',
        link: '/companies',
        targetRole: 'SUPER_ADMIN',
        tenantId: 'GLOBAL',
        recipientEmail: 'superadmin@ticketpro.com'
      });

      setSuccess(true);
    } catch (_err) {
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 text-left font-sans select-none">
        <Card className="max-w-md w-full p-6 sm:p-7 rounded-3xl shadow-xl border-slate-200/80 space-y-4 text-center bg-white">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-1">
            <CheckCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl font-black text-slate-900">Onboarding Request Submitted!</CardTitle>
          <CardDescription className="text-xs font-semibold text-slate-500 leading-relaxed">
            Company registration for <strong className="text-slate-900">{formData.companyName}</strong> (Code: <code className="text-cyan-700 font-bold">{formData.companyCode}</code>) has been submitted to Super Admin for approval.
          </CardDescription>
          <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-100 text-left space-y-1">
            <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider block">Admin Credentials Logged</span>
            <p className="text-xs font-bold text-slate-900">Email: {formData.adminEmail}</p>
            <p className="text-xs font-bold text-slate-900">Company Code: {formData.companyCode}</p>
          </div>
          <Button
            onClick={() => navigate('/login')}
            className="w-full h-10 rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Return to Login
          </Button>
        </Card>
      </div>
    );
  }

  const steps = [
    { num: 1, name: 'Company Info', short: 'Info' },
    { num: 2, name: 'Admin Account', short: 'Admin' },
    { num: 3, name: 'Branding & Logo', short: 'Brand' },
    { num: 4, name: 'Workflow & SLA', short: 'SLA' },
    { num: 5, name: 'Review & Submit', short: 'Review' }
  ];

  return (
    <div className="min-h-screen bg-[#f5f6fe] text-left font-sans select-none flex flex-col justify-start py-2.5 sm:py-5 px-3 sm:px-6 relative overflow-x-hidden">
      
      {/* Background Lighting Ambient Radial Flares */}
      <div className="absolute -top-12 left-1/3 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-gradient-to-tr from-indigo-500/15 to-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto w-full space-y-3 sm:space-y-4 relative z-10">
        
        {/* RESPONSIVE STICKY HEADER BAR */}
        <header className="sticky top-2 sm:top-3 z-30 flex items-center justify-between bg-white/95 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl border border-slate-200/80 shadow-xs transition-all">
          <div className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer group shrink-0" onClick={() => navigate('/')}>
            {/* Outstanding 3D Glassmorphic TicketPro Brand Emblem */}
            <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-300">
              <svg 
                viewBox="0 0 48 48" 
                className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 drop-shadow-[0_4px_12px_rgba(2,132,199,0.38)]" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="tpObBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d2ff" />
                    <stop offset="45%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="tpObSpecGloss" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="tpObBorderShine" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
                  </linearGradient>
                </defs>

                {/* Rich 3D Gradient Base Orb */}
                <circle cx="24" cy="24" r="22" fill="url(#tpObBrandGrad)" />
                
                {/* Specular 3D Glass Highlight Arc */}
                <ellipse cx="24" cy="14" rx="15" ry="8" fill="url(#tpObSpecGloss)" opacity="0.4" />
                
                {/* Crisp Inner Glass Ring */}
                <circle cx="24" cy="24" r="21" stroke="url(#tpObBorderShine)" strokeWidth="1.5" />

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

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="text-xs font-bold text-slate-700 hover:text-cyan-700 bg-slate-50 hover:bg-cyan-50/60 rounded-xl border-slate-200 h-8 px-2.5 sm:px-3 gap-1.5 cursor-pointer shadow-2xs"
            >
              <Home className="h-3.5 w-3.5 text-cyan-700" />
              <span className="hidden sm:inline">Home</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/login')}
              className="text-xs font-bold text-white bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] rounded-xl h-8 px-3.5 shadow-xs cursor-pointer"
            >
              Login
            </Button>
          </div>
        </header>

        {/* MAIN COMPACT RESPONSIVE CARD */}
        <Card className="bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-xl border border-white/80 p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
          
          {/* STEP PROGRESSION BAR */}
          <div className="border-b border-slate-100 pb-3.5 sm:pb-4">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {steps.map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div 
                    onClick={() => step > s.num && setStep(s.num)}
                    className={`flex flex-col items-center space-y-1.5 ${step > s.num ? 'cursor-pointer group' : ''}`}
                  >
                    <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      step === s.num 
                        ? 'bg-gradient-to-tr from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white ring-4 ring-cyan-100 shadow-md shadow-cyan-500/25 scale-105' 
                        : step > s.num
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs group-hover:scale-105'
                          : 'bg-slate-100 text-slate-400 border border-slate-200/80'
                    }`}>
                      {step > s.num ? <CheckCircle className="h-4 w-4 text-white" /> : s.num}
                    </div>
                    <span className={`text-[10px] sm:text-[11px] font-bold text-center transition-colors ${
                      step === s.num 
                        ? 'text-cyan-700 font-extrabold' 
                        : step > s.num 
                          ? 'text-slate-700 group-hover:text-cyan-600 font-bold' 
                          : 'text-slate-400 font-medium'
                    }`}>
                      <span className="hidden sm:inline">{s.name}</span>
                      <span className="sm:hidden">{s.short}</span>
                    </span>
                  </div>

                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1.5 sm:mx-3 mb-4 rounded-full transition-all ${
                      step > s.num ? 'bg-gradient-to-r from-emerald-400 to-cyan-500' : 'bg-slate-200'
                    }`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* FORM BODY + SIDEBAR HIGHLIGHTS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            
            {/* Left Form Content (7 Columns on lg+) */}
            <div className="lg:col-span-7 space-y-3.5">
              <div>
                <CardTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {step === 1 && 'Tell us about your company'}
                  {step === 2 && 'Set up Company Admin Credentials'}
                  {step === 3 && 'Configure Brand Logo & Colors'}
                  {step === 4 && 'Define Support Workflows & SLAs'}
                  {step === 5 && 'Review Onboarding Details'}
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500 mt-0.5">
                  {step === 1 && 'Provide your organization details to create your multi-tenant helpdesk environment.'}
                  {step === 2 && 'Create the primary Company Admin account to manage agents, teams, and tickets.'}
                  {step === 3 && 'Upload your official brand logo URL or file and set primary portal colors.'}
                  {step === 4 && 'Configure default SLA resolution deadlines and ticket category priorities.'}
                  {step === 5 && 'Verify all information before submitting to Super Admin for approval.'}
                </CardDescription>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: COMPANY INFO */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="space-y-1">
                      <Label className="block text-[11px] font-bold text-slate-900">Company Name *</Label>
                      <Input
                        type="text"
                        name="companyName"
                        required
                        value={formData.companyName}
                        onChange={handleChange}
                        placeholder="e.g. Acme Corporation"
                        className="rounded-xl border-slate-200 text-xs font-semibold focus:border-cyan-500 h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="block text-[11px] font-bold text-slate-900">Unique Tenant Code *</Label>
                      <Input
                        type="text"
                        name="companyCode"
                        required
                        value={formData.companyCode}
                        onChange={handleChange}
                        placeholder="e.g. ACME"
                        className="rounded-xl border-slate-200 text-xs font-mono font-bold uppercase focus:border-cyan-500 h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="space-y-1">
                      <Label className="block text-[11px] font-bold text-slate-900">Official Email *</Label>
                      <Input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="support@acme.com"
                        className="rounded-xl border-slate-200 text-xs font-semibold focus:border-cyan-500 h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="block text-[11px] font-bold text-slate-900">Phone Number</Label>
                      <Input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 9999988888"
                        className="rounded-xl border-slate-200 text-xs font-semibold focus:border-cyan-500 h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="space-y-1">
                      <Label className="block text-[11px] font-bold text-slate-900">Industry Sector</Label>
                      <select
                        name="industryType"
                        value={formData.industryType}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold bg-white focus:border-cyan-500 focus:outline-none cursor-pointer h-9"
                      >
                        <option value="IT & Software Support">IT & Software Support</option>
                        <option value="Energy & Utilities">Energy & Utilities</option>
                        <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                        <option value="Banking & Financial Services">Banking & Financial Services</option>
                        <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="block text-[11px] font-bold text-slate-900">Company Size</Label>
                      <select
                        name="companySize"
                        value={formData.companySize}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold bg-white focus:border-cyan-500 focus:outline-none cursor-pointer h-9"
                      >
                        <option value="1-10 Employees">1-10 Employees</option>
                        <option value="10-50 Employees">10-50 Employees</option>
                        <option value="50-250 Employees">50-250 Employees</option>
                        <option value="250-1000 Employees">250-1000 Employees</option>
                        <option value="1000+ Employees">1000+ Enterprise Employees</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="block text-[11px] font-bold text-slate-900">Corporate Website URL</Label>
                    <Input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://www.acme.com"
                      className="rounded-xl border-slate-200 text-xs font-semibold focus:border-cyan-500 h-9"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: ADMIN ACCOUNT */}
              {step === 2 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="block text-[11px] font-bold text-slate-900">Admin Full Name *</Label>
                    <Input
                      type="text"
                      name="adminName"
                      required
                      value={formData.adminName}
                      onChange={handleChange}
                      placeholder="e.g. Rajesh Kumar"
                      className="rounded-xl border-slate-200 text-xs font-semibold focus:border-cyan-500 h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="block text-[11px] font-bold text-slate-900">Admin Login Email *</Label>
                    <Input
                      type="email"
                      name="adminEmail"
                      required
                      value={formData.adminEmail}
                      onChange={handleChange}
                      placeholder="admin@acme.com"
                      className="rounded-xl border-slate-200 text-xs font-semibold focus:border-cyan-500 h-9"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="space-y-1">
                      <Label className="block text-[11px] font-bold text-slate-900">Admin Password *</Label>
                      <Input
                        type="password"
                        name="adminPassword"
                        required
                        value={formData.adminPassword}
                        onChange={handleChange}
                        placeholder="Set strong password"
                        className="rounded-xl border-slate-200 text-xs font-semibold focus:border-cyan-500 h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="block text-[11px] font-bold text-slate-900">Confirm Password *</Label>
                      <Input
                        type="password"
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter password"
                        className="rounded-xl border-slate-200 text-xs font-semibold focus:border-cyan-500 h-9"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: BRANDING & LOGO */}
              {step === 3 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="block text-[11px] font-bold text-slate-900">Company Brand Logo</Label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <Input
                        type="text"
                        name="logoUrl"
                        value={formData.logoUrl}
                        onChange={handleChange}
                        placeholder="https://acme.com/logo.png or upload file"
                        className="rounded-xl border-slate-200 text-xs font-semibold focus:border-cyan-500 h-9 flex-1"
                      />
                      <label className="flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-all h-9 active:scale-95">
                        <FolderPlus className="h-3.5 w-3.5" />
                        <span>Upload Logo</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                    </div>

                    {formData.logoUrl && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2.5 mt-2">
                        <img src={formData.logoUrl} alt="Logo Preview" className="h-8 w-8 object-contain rounded-lg border bg-white p-0.5" />
                        <span className="text-xs font-bold text-slate-700">Brand Logo Loaded</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <Label className="block text-[11px] font-bold text-slate-900">Portal Theme Primary Color</Label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        name="primaryColor"
                        value={formData.primaryColor}
                        onChange={handleChange}
                        className="h-9 w-12 rounded-xl border cursor-pointer p-0.5"
                      />
                      <span className="text-xs font-mono font-bold text-slate-800">{formData.primaryColor}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: WORKFLOW & SLA */}
              {step === 4 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="space-y-1">
                      <Label className="block text-[11px] font-bold text-slate-900">SLA First Response Target</Label>
                      <select
                        name="slaResponseHours"
                        value={formData.slaResponseHours}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold bg-white focus:border-cyan-500 focus:outline-none cursor-pointer h-9"
                      >
                        <option value="1">Within 1 Hour (Critical)</option>
                        <option value="2">Within 2 Hours (Standard)</option>
                        <option value="4">Within 4 Hours</option>
                        <option value="8">Within 8 Hours</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="block text-[11px] font-bold text-slate-900">SLA Full Resolution Target</Label>
                      <select
                        name="slaResolutionHours"
                        value={formData.slaResolutionHours}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold bg-white focus:border-cyan-500 focus:outline-none cursor-pointer h-9"
                      >
                        <option value="12">Within 12 Hours</option>
                        <option value="24">Within 24 Hours (Standard)</option>
                        <option value="48">Within 48 Hours</option>
                        <option value="72">Within 72 Hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW & SUBMIT */}
              {step === 5 && (
                <div className="space-y-2 bg-slate-50/90 p-3.5 sm:p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5 text-xs">
                    <span className="font-bold text-slate-500">Company Name</span>
                    <span className="font-black text-slate-900">{formData.companyName}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5 text-xs">
                    <span className="font-bold text-slate-500">Company Code</span>
                    <Badge variant="outline" className="text-xs font-mono font-bold text-cyan-800 bg-cyan-50 border-cyan-200">{formData.companyCode}</Badge>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5 text-xs">
                    <span className="font-bold text-slate-500">Official Email</span>
                    <span className="font-bold text-slate-900">{formData.email}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5 text-xs">
                    <span className="font-bold text-slate-500">Company Admin</span>
                    <span className="font-bold text-slate-900">{formData.adminName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500">Admin Email</span>
                    <span className="font-bold text-slate-900">{formData.adminEmail}</span>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Compact Highlight Sidebar (5 Columns on lg+) */}
            <div className="lg:col-span-5 space-y-3 pt-1">
              <div className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 rounded-2xl p-4 sm:p-5 border border-cyan-100/90 flex flex-col justify-between items-center text-center space-y-3 shadow-xs">
                
                {/* Sleek Visual */}
                <div className="w-full max-w-[170px] hidden sm:block">
                  <svg className="w-full h-24" viewBox="0 0 200 130" fill="none">
                    <circle cx="100" cy="65" r="55" fill="#e0e7ff" opacity="0.6" />
                    <rect x="75" y="25" width="50" height="90" rx="4" fill="#312e81" />
                    <rect x="105" y="40" width="40" height="75" rx="4" fill="#4338ca" />
                    <rect x="52" y="55" width="38" height="60" rx="4" fill="#6366f1" />
                    <rect x="82" y="32" width="6" height="8" rx="1" fill="#c7d2fe" />
                    <rect x="94" y="32" width="6" height="8" rx="1" fill="#c7d2fe" />
                    <rect x="82" y="48" width="6" height="8" rx="1" fill="#c7d2fe" />
                    <rect x="94" y="48" width="6" height="8" rx="1" fill="#c7d2fe" />
                    <rect x="92" y="98" width="16" height="18" rx="2" fill="#1e1b4b" />
                    <rect x="30" y="116" width="140" height="3" rx="1.5" fill="#1e1b4b" />
                  </svg>
                </div>

                <div className="space-y-2 w-full text-left">
                  <div className="bg-white rounded-xl p-2.5 shadow-2xs border border-cyan-100/80 space-y-0.5">
                    <div className="flex items-center space-x-1.5 text-cyan-700">
                      <Layers className="h-3.5 w-3.5" />
                      <h4 className="text-xs font-black text-slate-900">Multi-Tenant Isolation</h4>
                    </div>
                    <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                      Instant separate database workspace, agent pools & ticket routing.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 shadow-2xs border border-cyan-100/80 space-y-0.5">
                    <div className="flex items-center space-x-1.5 text-emerald-600">
                      <Zap className="h-3.5 w-3.5" />
                      <h4 className="text-xs font-black text-slate-900">Automated SLA Engine</h4>
                    </div>
                    <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                      Target response & resolution deadlines track automatically per ticket.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* BOTTOM STEP NAVIGATION BUTTONS (BACK / NEXT / SUBMIT) */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3.5 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={step > 1 ? handlePrev : () => navigate('/')}
              className="w-full sm:w-auto rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-1.5 h-10 sm:h-9 px-4 cursor-pointer active:scale-95 transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{step > 1 ? 'Previous Step' : 'Cancel'}</span>
            </Button>

            {step < 5 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] active:scale-95 text-white text-xs font-black shadow-md shadow-cyan-500/25 gap-2 h-10 sm:h-9 px-5 cursor-pointer transition-all"
              >
                <span>Next Step</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-md shadow-emerald-600/20 disabled:opacity-50 gap-2 h-10 sm:h-9 px-5 cursor-pointer transition-all"
              >
                <span>{loading ? 'Submitting...' : 'Submit Company Onboarding'}</span>
              </Button>
            )}
          </div>

        </Card>

      </div>

    </div>
  );
};

export default OnboardCompany;
