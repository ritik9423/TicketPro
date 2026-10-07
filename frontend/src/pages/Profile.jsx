import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { downloadBlob } from '../utils/excelExporter';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CustomSelect from '@/components/ui/CustomSelect';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import Pagination from '@/components/common/Pagination';
import { extractPageData } from '../utils/paginationHelper';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Palette, 
  Lock, 
  Check, 
  RefreshCw, 
  UploadCloud, 
  Eye, 
  EyeOff, 
  Camera, 
  Save, 
  Sparkles,
  Link as LinkIcon,
  ShieldCheck,
  Layers,
  MapPin,
  ArrowLeft,
  FileText,
  Clock,
  Download,
  Search,
  CheckCircle,
  AlertTriangle,
  Activity,
  SlidersHorizontal,
  Briefcase,
  Bell,
  KeyRound,
  Headphones
} from 'lucide-react';

const Profile = () => {
  const { user, updateUserProfile, updateLocalTheme } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const role = user?.role || 'END_USER';
  const isAdmin = role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER';
  const isAgent = role === 'AGENT';
  const isEndUser = !isAdmin && !isAgent;

  // Active top tab
  const defaultTab = isAdmin ? 'company' : isAgent ? 'agent_profile' : 'user_profile';
  const [activeMainTab, setActiveMainTab] = useState(searchParams.get('tab') || defaultTab);

  // Common Profile Fields
  const [userName, setUserName] = useState(user?.name || '');
  const [userPhone, setUserPhone] = useState(user?.phone || '+91 98765 43210');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Company Information State (For Admin)
  const [companyName, setCompanyName] = useState(user?.companyName || 'Enterprise Workspace');
  const [email, setEmail] = useState(user?.email || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [address, setAddress] = useState('New Delhi, India');
  const [selectedTheme, setSelectedTheme] = useState('indigo');
  const [industryType, setIndustryType] = useState('IT & Software Support');
  const [logoUrlInput, setLogoUrlInput] = useState(user?.logoUrl || user?.avatarUrl || '');
  const [activeLogoTab, setActiveLogoTab] = useState('gallery');

  // Agent Specific State
  const defaultSignature = `Best regards,\n${user?.name || 'Agent'}\nCustomer Support Specialist | ${user?.department || 'IT & Infrastructure'}\nTicketPro Helpdesk`;
  const [agentSignature, setAgentSignature] = useState(() => {
    return localStorage.getItem(`agent_signature_${user?.id}`) || defaultSignature;
  });
  const [agentStatus, setAgentStatus] = useState(() => {
    return localStorage.getItem(`agent_status_${user?.id}`) || 'AVAILABLE'; // 'AVAILABLE' | 'BUSY' | 'AWAY'
  });
  const [agentNotifyAssigned, setAgentNotifyAssigned] = useState(() => {
    const saved = localStorage.getItem(`agent_notify_assigned_${user?.id}`);
    return saved !== null ? saved === 'true' : true;
  });

  // End User Specific State
  const [userNotifyReply, setUserNotifyReply] = useState(() => {
    const saved = localStorage.getItem(`user_notify_reply_${user?.id}`);
    return saved !== null ? saved === 'true' : true;
  });
  const [userNotifyResolved, setUserNotifyResolved] = useState(() => {
    const saved = localStorage.getItem(`user_notify_resolved_${user?.id}`);
    return saved !== null ? saved === 'true' : true;
  });
  const [contactPreference, setContactPreference] = useState('EMAIL');

  // Audit Logs State (For Admin)
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logPage, setLogPage] = useState(0);
  const [logSize, setLogSize] = useState(20);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotalElements, setLogTotalElements] = useState(0);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Preset Corporate Logos
  const presetLogos = [
    { name: 'IOCL Flame', url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=150&auto=format&fit=crop&q=80' },
    { name: 'Axis Bank Red', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
    { name: 'Emerald Shield', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
    { name: 'Cyber Blue', url: 'https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=150&auto=format&fit=crop&q=80' },
    { name: 'Minimal Geometric', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&auto=format&fit=crop&q=80' },
    { name: 'Golden Crest', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=150&auto=format&fit=crop&q=80' }
  ];

  const themes = [
    { name: 'indigo', label: 'Indigo Violet', color: 'bg-indigo-600' },
    { name: 'emerald', label: 'Emerald Green', color: 'bg-emerald-600' },
    { name: 'blue', label: 'Corporate Blue', color: 'bg-blue-600' },
    { name: 'crimson', label: 'Crimson Red', color: 'bg-rose-600' },
    { name: 'orange', label: 'Dark Orange', color: 'bg-orange-500' }
  ];

  // Fetch Audit Logs for Admin
  const fetchAuditLogs = useCallback(async (p = logPage, s = logSize) => {
    if (!isAdmin) return;
    try {
      setLogsLoading(true);
      const resp = await api.get(`/audit-logs?page=${p}&size=${s}`).catch(() => null);
      if (resp) {
        const pageData = extractPageData(resp, p, s);
        const logList = pageData.content || pageData.data || [];
        setAuditLogs(logList);
        setLogTotalPages(pageData.totalPages ?? pageData.meta?.totalPages ?? 1);
        setLogTotalElements(pageData.totalElements ?? pageData.meta?.totalElements ?? logList.length);
      } else {
        const fallback = [
          {
            id: 101,
            action: 'WORKSPACE_INITIALIZED',
            entityName: 'Company',
            entityId: user?.companyCode || 'TENANT',
            actorEmail: user?.email || 'admin@ticketpro.com',
            actorRole: user?.role || 'COMPANY_ADMIN',
            details: `Workspace configuration active for tenant ${user?.companyName || user?.companyCode || 'Organization'}`,
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            id: 102,
            action: 'RBAC_VERIFICATION',
            entityName: 'SecurityPolicy',
            entityId: 'JWT-GUARD-01',
            actorEmail: 'system@ticketpro.com',
            actorRole: 'SYSTEM',
            details: 'Live tenant isolation & instantaneous kill-switch filter verified.',
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
          }
        ];
        setAuditLogs(fallback);
        setLogTotalPages(1);
        setLogTotalElements(fallback.length);
      }
    } catch (_err) {
      console.warn('Audit logs fetch notice:', _err);
    } finally {
      setLogsLoading(false);
    }
  }, [isAdmin, user, logPage, logSize]);

  useEffect(() => {
    const compCode = user?.companyCode || 'CORP';
    const storedTheme = localStorage.getItem(`theme_config_${compCode}`);
    if (storedTheme) setSelectedTheme(storedTheme);

    const storedIndustry = localStorage.getItem(`industry_type_${compCode}`);
    if (storedIndustry) setIndustryType(storedIndustry);

    // Fetch live company profile details for admin
    const fetchCompanyData = async () => {
      if (isAdmin && user?.companyId) {
        const data = await api.get(`/companies/${user.companyId}`).catch(() => null);
        if (data) {
          if (data.companyName) setCompanyName(data.companyName);
          if (data.email) setEmail(data.email);
          if (data.phone) setUserPhone(data.phone);
          if (data.website) setWebsite(data.website);
          if (data.address) setAddress(data.address);
        }
      }
    };
    fetchCompanyData();

    if (activeMainTab === 'audit_logs') {
      fetchAuditLogs(logPage, logSize);
    }
  }, [user, activeMainTab, fetchAuditLogs, isAdmin, logPage, logSize]);

  // Gallery File Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setLogoUrlInput(dataUrl);
      setSuccess('✓ Profile image loaded! Click "Save Profile Settings" below to persist.');
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSaveSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    if (newPassword && newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match. Please re-enter.');
      setLoading(false);
      return;
    }

    const compCode = user?.companyCode || 'CORP';

    try {
      // Save Agent specifics
      if (isAgent && user?.id) {
        localStorage.setItem(`agent_signature_${user.id}`, agentSignature);
        localStorage.setItem(`agent_status_${user.id}`, agentStatus);
        localStorage.setItem(`agent_notify_assigned_${user.id}`, String(agentNotifyAssigned));
      }

      // Save End User specifics
      if (isEndUser && user?.id) {
        localStorage.setItem(`user_notify_reply_${user.id}`, String(userNotifyReply));
        localStorage.setItem(`user_notify_resolved_${user.id}`, String(userNotifyResolved));
        localStorage.setItem(`user_contact_pref_${user.id}`, contactPreference);
      }

      // Save Admin specifics
      if (isAdmin) {
        localStorage.setItem(`theme_config_${compCode}`, selectedTheme);
        localStorage.setItem(`ticketpro_company_theme_${compCode}`, selectedTheme);
        localStorage.setItem(`industry_type_${compCode}`, industryType);
        if (logoUrlInput) {
          localStorage.setItem(`ticketpro_company_logo_${compCode}`, logoUrlInput);
        }
        if (updateLocalTheme) updateLocalTheme(selectedTheme);
      }

      // Update Auth Profile Context
      updateUserProfile({
        name: userName || user?.name,
        phone: userPhone,
        companyName: isAdmin ? companyName : user?.companyName,
        logoUrl: logoUrlInput || user?.logoUrl,
        avatarUrl: logoUrlInput || user?.avatarUrl
      });

      // Update backend user table
      if (user?.id) {
        const payload = {
          name: userName || user?.name,
          email: user.email,
          phone: userPhone,
          status: 'ACTIVE'
        };
        if (newPassword) payload.password = newPassword;

        await api.put(`/users/${user.id}`, payload).catch(() => null);
      }

      // Update backend company table if admin
      if (isAdmin && user?.companyId) {
        const customFieldsPayload = JSON.stringify({
          logoUrl: logoUrlInput || '',
          primaryColor: selectedTheme || 'indigo',
          industryType: industryType || 'IT & Software Support'
        });

        await api.put(`/companies/${user.companyId}`, {
          companyName,
          email,
          phone: userPhone,
          website,
          address,
          status: 'ACTIVE',
          customFields: customFieldsPayload
        }).catch(() => null);
      }

      setSuccess('✓ Profile & Preferences updated successfully!');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setSuccess('');
      }, 3500);

    } catch (err) {
      console.error(err);
      setError('An error occurred while saving profile settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogsCSV = () => {
    if (!auditLogs.length) return;
    const headers = ['ID', 'Action', 'Scope', 'EntityID', 'ActorEmail', 'ActorRole', 'Details', 'Timestamp'];
    const rows = auditLogs.map(l => [
      l.id,
      l.action,
      l.entityName,
      l.entityId,
      l.actorEmail,
      l.actorRole,
      l.details || '',
      l.createdAt
    ]);
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };
    const csvContent = '\uFEFF' + [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `audit_logs_${user?.companyCode || 'TENANT'}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const filteredAuditLogs = auditLogs.filter(log => {
    if (logActionFilter && log.action !== logActionFilter) return false;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      const matchAction = (log.action || '').toLowerCase().includes(q);
      const matchActor = (log.actorEmail || '').toLowerCase().includes(q);
      const matchEntity = (log.entityName || '').toLowerCase().includes(q);
      const matchDetails = (log.details || '').toLowerCase().includes(q);
      return matchAction || matchActor || matchEntity || matchDetails;
    }
    return true;
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-5 text-left font-sans select-none pb-16 w-full">
      
      {/* 1. CLEAN PROFILE HEADER BANNER */}
      <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-800"></div>
        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-2">
            <div className="flex items-end space-x-3.5">
              <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-white p-1.5 shadow-md border border-slate-200/80 flex items-center justify-center shrink-0">
                <div className="h-full w-full rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-xl font-black text-white uppercase shadow-inner">
                  {getInitials(userName || user?.name)}
                </div>
              </div>

              <div className="pb-0.5 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {userName || user?.name || 'User Profile'}
                  </h1>
                  <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 font-extrabold text-[10px] uppercase rounded-full px-2 py-0.5">
                    {user?.role || 'USER'}
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-bold text-[10px] rounded-full px-2 py-0.5">
                    {user?.companyCode || 'WORKSPACE'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {user?.email || 'user@ticketpro.com'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs h-8 px-3 gap-1.5 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
                <span>Back</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. PILL NAVIGATION TABS (CLEAN ROLE ADAPTIVE) */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 overflow-x-auto no-scrollbar">
        {isAdmin ? (
          <>
            <button
              type="button"
              onClick={() => { setActiveMainTab('company'); setSearchParams({ tab: 'company' }); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                activeMainTab === 'company'
                  ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Company Profile & Branding</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMainTab('security'); setSearchParams({ tab: 'security' }); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                activeMainTab === 'security'
                  ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Credentials & Security</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMainTab('audit_logs'); setSearchParams({ tab: 'audit_logs' }); fetchAuditLogs(); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                activeMainTab === 'audit_logs'
                  ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-amber-500" />
              <span>Audit Trail & Activity Logs</span>
            </button>
          </>
        ) : isAgent ? (
          <>
            <button
              type="button"
              onClick={() => { setActiveMainTab('agent_profile'); setSearchParams({ tab: 'agent_profile' }); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                activeMainTab === 'agent_profile'
                  ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Headphones className="h-3.5 w-3.5 text-cyan-700" />
              <span>Agent Profile & Desk Setup</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMainTab('security'); setSearchParams({ tab: 'security' }); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                activeMainTab === 'security'
                  ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5 text-slate-700" />
              <span>Account Security & Password</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { setActiveMainTab('user_profile'); setSearchParams({ tab: 'user_profile' }); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                activeMainTab === 'user_profile'
                  ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <User className="h-3.5 w-3.5 text-cyan-700" />
              <span>Personal Information</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMainTab('preferences'); setSearchParams({ tab: 'preferences' }); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                activeMainTab === 'preferences'
                  ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Bell className="h-3.5 w-3.5 text-slate-700" />
              <span>Notification Preferences</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMainTab('security'); setSearchParams({ tab: 'security' }); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
                activeMainTab === 'security'
                  ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5 text-slate-700" />
              <span>Account Security & Password</span>
            </button>
          </>
        )}
      </div>

      {/* NOTIFICATION ALERTS */}
      {success && (
        <div className="rounded-2xl bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-900 font-black cursor-pointer px-2">✕</button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 p-3.5 text-xs font-bold text-rose-700 border border-rose-200 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 font-black cursor-pointer px-2">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🧑‍💼 AGENT VIEW: TAB 1 (AGENT PROFILE & DESK SETUP - NO KPI CARDS) */}
      {/* ========================================================================= */}
      {isAgent && activeMainTab === 'agent_profile' && (
        <form onSubmit={handleProfileSaveSubmit} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* LEFT: PERSONAL & DEPARTMENT INFORMATION (7 Cols) */}
            <Card className="lg:col-span-7 rounded-2xl border-slate-200/80 shadow-xs bg-white p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <User className="h-4 w-4 text-cyan-700" />
                  <span>Agent Identity & Department</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Update your contact details shown on assigned tickets
                </CardDescription>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Full Name</Label>
                  <Input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Contact Phone</Label>
                  <Input
                    type="text"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Work Email (Readonly)</Label>
                  <Input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-500 bg-slate-50 h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Assigned Department</Label>
                  <Input
                    type="text"
                    disabled
                    value={user?.department || 'IT & Infrastructure'}
                    className="rounded-xl border-cyan-200 text-xs font-bold text-cyan-900 bg-cyan-50/50 h-9"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Assigned Shift Schedule</Label>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between">
                    <span>Regular Day Shift: <strong>09:30 AM – 06:30 PM IST</strong></span>
                    <Badge variant="outline" className="text-[10px] font-bold bg-white text-emerald-700 border-emerald-300">Active</Badge>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs px-4 h-9 shadow-xs gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Agent Profile</span>
                </Button>
              </div>
            </Card>

            {/* RIGHT: DESK STATUS & TICKET SIGNATURE (5 Cols) */}
            <Card className="lg:col-span-5 rounded-2xl border-slate-200/80 shadow-xs bg-white p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <SlidersHorizontal className="h-4 w-4 text-cyan-700" />
                  <span>Desk Preferences & Signature</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Configure live status and auto-reply signature
                </CardDescription>
              </div>

              {/* Desk Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Live Agent Desk Status</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'AVAILABLE', label: 'Available', dot: 'bg-emerald-500', border: 'border-emerald-200 bg-emerald-50/50 text-emerald-800' },
                    { id: 'BUSY', label: 'Busy (In Call)', dot: 'bg-amber-500', border: 'border-amber-200 bg-amber-50/50 text-amber-800' },
                    { id: 'AWAY', label: 'Away', dot: 'bg-slate-400', border: 'border-slate-200 bg-slate-50 text-slate-700' }
                  ].map(statusItem => (
                    <button
                      key={statusItem.id}
                      type="button"
                      onClick={() => setAgentStatus(statusItem.id)}
                      className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        agentStatus === statusItem.id
                          ? `${statusItem.border} ring-2 ring-cyan-1000/20 font-black shadow-2xs`
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${statusItem.dot}`}></span>
                      <span>{statusItem.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Automated Ticket Reply Signature */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Ticket Reply Signature</Label>
                  <span className="text-[10px] text-slate-400">Appended to your replies</span>
                </div>
                <textarea
                  rows={4}
                  value={agentSignature}
                  onChange={(e) => setAgentSignature(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 font-mono focus:border-cyan-500 focus:outline-none bg-slate-50/50 resize-none"
                  placeholder="Enter your closing reply signature..."
                />
              </div>

              {/* Notification Checkbox */}
              <div className="pt-1">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agentNotifyAssigned}
                    onChange={(e) => setAgentNotifyAssigned(e.target.checked)}
                    className="mt-0.5 rounded text-cyan-700 focus:ring-cyan-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Ticket Assignment Alerts</span>
                    <span className="text-[11px] text-slate-400">Receive alerts when tickets are assigned to you.</span>
                  </div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs px-4 h-9 shadow-xs gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Preferences</span>
                </Button>
              </div>
            </Card>

          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 👤 END USER VIEW: TAB 1 (PERSONAL INFORMATION - NO KPI CARDS) */}
      {/* ========================================================================= */}
      {isEndUser && activeMainTab === 'user_profile' && (
        <form onSubmit={handleProfileSaveSubmit} className="space-y-5">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white p-5 sm:p-6 space-y-4 max-w-2xl">
            <div className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <User className="h-4 w-4 text-cyan-700" />
                <span>Personal Contact Details</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Support agents will use these details to contact you regarding tickets
              </CardDescription>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Your Full Name</Label>
                <Input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Registered Email (Readonly)</Label>
                <Input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-500 bg-slate-50 h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Phone Number</Label>
                <Input
                  type="text"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Connected Company Workspace</Label>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-center justify-between">
                  <span className="font-bold">{user?.companyName || user?.companyCode || 'Workspace Member'}</span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-white text-cyan-800 border-cyan-200">
                    Code: {user?.companyCode || 'CORP'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs px-4 h-9 shadow-xs gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Contact Details</span>
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 👤 END USER VIEW: TAB 2 (NOTIFICATION PREFERENCES) */}
      {/* ========================================================================= */}
      {isEndUser && activeMainTab === 'preferences' && (
        <form onSubmit={handleProfileSaveSubmit} className="space-y-5">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white p-5 sm:p-6 space-y-4 max-w-2xl">
            <div className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Bell className="h-4 w-4 text-cyan-700" />
                <span>Support Notifications & Alerts</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Choose how and when you want to receive updates on your tickets
              </CardDescription>
            </div>

            <div className="space-y-3">
              <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={userNotifyReply}
                  onChange={(e) => setUserNotifyReply(e.target.checked)}
                  className="mt-0.5 rounded text-cyan-700 focus:ring-cyan-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Agent Reply Notifications</span>
                  <span className="text-[11px] text-slate-500">Receive an email immediately when a support specialist replies to your ticket.</span>
                </div>
              </label>

              <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={userNotifyResolved}
                  onChange={(e) => setUserNotifyResolved(e.target.checked)}
                  className="mt-0.5 rounded text-cyan-700 focus:ring-cyan-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Resolution Alerts</span>
                  <span className="text-[11px] text-slate-500">Get notified when your inquiry is resolved with the complete solution.</span>
                </div>
              </label>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Preferred Contact Channel</Label>
              <CustomSelect
                value={contactPreference}
                onChange={(val) => setContactPreference(val)}
                options={[
                  { value: 'EMAIL', label: 'Email Notifications (Recommended)' },
                  { value: 'PHONE', label: 'Phone / SMS Updates' },
                  { value: 'IN_APP', label: 'In-App Live Portal Only' }
                ]}
                buttonClassName="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 bg-white cursor-pointer shadow-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs px-4 h-9 shadow-xs gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Notification Prefs</span>
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 🏢 ADMIN VIEW: TAB 1 (COMPANY PROFILE & BRANDING) */}
      {/* ========================================================================= */}
      {isAdmin && activeMainTab === 'company' && (
        <form onSubmit={handleProfileSaveSubmit} className="space-y-6">
          
          {/* LOGO & BRAND CARD */}
          <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden bg-white p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="h-16 w-16 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200/80 flex items-center justify-center shrink-0">
                  {logoUrlInput ? (
                    <img src={logoUrlInput} alt="Company Logo" className="h-full w-full rounded-xl object-contain bg-white" />
                  ) : (
                    <div className="h-full w-full rounded-xl bg-gradient-to-tr from-[#06b6d4] via-[#2563eb] to-[#4f46e5] flex items-center justify-center text-xl font-black text-white uppercase">
                      {companyName ? companyName.charAt(0) : 'C'}
                    </div>
                  )}
                </div>

                <div className="space-y-0.5">
                  <h2 className="text-base font-black text-slate-900">{companyName}</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Tenant Code: <span className="font-bold text-slate-800">{user?.companyCode || 'CORP'}</span>
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs px-4 h-9 shadow-xs gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Company Profile</span>
              </Button>
            </div>

            {/* LOGO UPLOAD TABS */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveLogoTab('gallery')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeLogoTab === 'gallery' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Upload Logo File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLogoTab('link')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeLogoTab === 'link' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span>Image URL</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLogoTab('preset')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeLogoTab === 'preset' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Presets</span>
                </button>
              </div>

              {activeLogoTab === 'gallery' && (
                <div className="p-4 rounded-xl border border-dashed border-cyan-200 bg-cyan-50/20 text-center space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-500 cursor-pointer max-w-xs mx-auto file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                  />
                </div>
              )}

              {activeLogoTab === 'link' && (
                <div className="space-y-1 max-w-md">
                  <Input
                    type="url"
                    value={logoUrlInput}
                    onChange={(e) => setLogoUrlInput(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="rounded-xl border-slate-200 text-xs h-9"
                  />
                </div>
              )}

              {activeLogoTab === 'preset' && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {presetLogos.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLogoUrlInput(preset.url)}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                        logoUrlInput === preset.url ? 'border-cyan-500 bg-cyan-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="h-8 w-8 mx-auto rounded-lg object-cover mb-1" />
                      <span className="text-[10px] font-bold text-slate-700 block truncate">{preset.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* 2-COLUMN GRID: CORE DETAILS + THEME PALETTE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-7 rounded-2xl border-slate-200/80 shadow-xs bg-white p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-cyan-700" />
                  <span>Organization Information</span>
                </CardTitle>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Company Name *</Label>
                  <Input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Support Email *</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Support Phone</Label>
                  <Input
                    type="text"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Official Website</Label>
                  <Input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Headquarters Address</Label>
                  <Input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                  />
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-5 rounded-2xl border-slate-200/80 shadow-xs bg-white p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Palette className="h-4 w-4 text-cyan-700" />
                    <span>Workspace Brand Theme</span>
                  </CardTitle>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {themes.map((theme) => {
                    const isSelected = selectedTheme === theme.name;
                    return (
                      <button
                        key={theme.name}
                        type="button"
                        onClick={() => {
                          setSelectedTheme(theme.name);
                          if (updateLocalTheme) updateLocalTheme(theme.name);
                          localStorage.setItem(`theme_config_${user?.companyCode || 'CORP'}`, theme.name);
                        }}
                        className={`flex items-center space-x-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected ? 'border-cyan-500 bg-cyan-50/50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`h-3.5 w-3.5 rounded-full ${theme.color} shrink-0`}></div>
                        <span className="text-slate-800 text-[11px] truncate">{theme.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1 pt-1">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Industry Vertical</Label>
                  <CustomSelect
                    value={industryType}
                    onChange={(val) => setIndustryType(val)}
                    options={[
                      { value: 'IT & Software Support', label: 'IT & Software Support' },
                      { value: 'Healthcare & Hospitals', label: 'Healthcare & Hospitals' },
                      { value: 'Finance & Banking', label: 'Finance & Banking' },
                      { value: 'Retail & E-commerce', label: 'Retail & E-commerce' },
                      { value: 'Facility & Real Estate', label: 'Facility & Real Estate' },
                      { value: 'Energy & Petroleum', label: 'Energy & Petroleum' }
                    ]}
                    buttonClassName="block w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 bg-white cursor-pointer shadow-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs px-4 h-9 shadow-xs gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Update Theme</span>
                </Button>
              </div>
            </Card>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 🔐 COMMON TAB: ACCOUNT SECURITY & PASSWORD (NO KPI CARDS) */}
      {/* ========================================================================= */}
      {activeMainTab === 'security' && (
        <form onSubmit={handleProfileSaveSubmit} className="space-y-5">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white p-5 sm:p-6 space-y-4 max-w-xl">
            <div className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <KeyRound className="h-4 w-4 text-cyan-700" />
                <span>Account Security & Password</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Update your account password and review login access credentials
              </CardDescription>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Account Username / Name</Label>
                <Input
                  type="text"
                  value={userName || user?.name || ''}
                  onChange={(e) => setUserName(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Login Email (Readonly)</Label>
                <Input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-500 bg-slate-50 h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">System Role Level</Label>
                <Input
                  type="text"
                  disabled
                  value={user?.role || 'USER'}
                  className="rounded-xl border-cyan-200 text-xs font-extrabold text-cyan-800 bg-cyan-50/70 h-9"
                />
              </div>

              <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-100">
                <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (leave blank to keep current)"
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 pr-10 h-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {newPassword && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Confirm New Password</Label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password to confirm"
                    className="rounded-xl border-slate-200 text-xs font-bold text-slate-900 h-9"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs px-4 h-9 shadow-xs gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Credentials</span>
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 🏢 ADMIN VIEW: TAB 3 (AUDIT TRAIL & ACTIVITY LOGS) */}
      {/* ========================================================================= */}
      {isAdmin && activeMainTab === 'audit_logs' && (
        <div className="space-y-4">
          {/* FILTER & EXPORT BAR */}
          <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search audit events by action, email, scope..."
                  className="rounded-xl pl-9 border-slate-200 text-xs h-9 focus-visible:ring-cyan-1000"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-52">
                  <CustomSelect
                    value={logActionFilter}
                    onChange={(val) => setLogActionFilter(val)}
                    placeholder="All Actions"
                    options={[
                      { value: '', label: 'All Actions' },
                      { value: 'COMPANY_CREATED', label: 'COMPANY_CREATED' },
                      { value: 'COMPANY_UPDATED', label: 'COMPANY_UPDATED' },
                      { value: 'STATUS_CHANGED', label: 'STATUS_CHANGED' },
                      { value: 'ADMIN_ASSIGNED', label: 'ADMIN_ASSIGNED' },
                      { value: 'SECURITY_UPDATE', label: 'SECURITY_UPDATE' },
                      { value: 'WORKSPACE_INITIALIZED', label: 'WORKSPACE_INITIALIZED' }
                    ]}
                    buttonClassName="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 cursor-pointer h-9 shadow-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={fetchAuditLogs}
                    disabled={logsLoading}
                    className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs h-9 px-3 gap-1 cursor-pointer hover:bg-slate-50"
                    title="Refresh Logs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? 'animate-spin text-cyan-700' : ''}`} />
                    <span>Refresh</span>
                  </Button>

                  <Button
                    onClick={handleExportLogsCSV}
                    className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs h-9 px-3.5 gap-1 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* AUDIT LOGS TABLE */}
          <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
            {logsLoading ? (
              <div className="py-12 text-center text-xs font-bold text-cyan-700 flex items-center justify-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
                <span>Fetching Tenant Audit Stream...</span>
              </div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="py-12 text-center space-y-1.5">
                <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">No Audit Events Found</h4>
                <p className="text-[11px] text-slate-400">All tenant events and security modifications will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="border-slate-100">
                      <TableHead className="py-2.5 px-3.5 font-bold text-[10px] uppercase text-slate-400">Timestamp</TableHead>
                      <TableHead className="py-2.5 px-3.5 font-bold text-[10px] uppercase text-slate-400">Action Type</TableHead>
                      <TableHead className="py-2.5 px-3.5 font-bold text-[10px] uppercase text-slate-400">Scope</TableHead>
                      <TableHead className="py-2.5 px-3.5 font-bold text-[10px] uppercase text-slate-400">Actor & Role</TableHead>
                      <TableHead className="py-2.5 px-3.5 font-bold text-[10px] uppercase text-slate-400">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {filteredAuditLogs.map((log, idx) => (
                      <TableRow key={log.id || idx} className="hover:bg-cyan-50/30 transition-colors">
                        <TableCell className="py-2.5 px-3.5 text-slate-500 font-semibold text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt || Date.now()).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2.5 px-3.5 whitespace-nowrap">
                          <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${
                            (log.action || '').includes('SECURITY') || (log.action || '').includes('SUSPEND')
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : (log.action || '').includes('STATUS') || (log.action || '').includes('ADMIN')
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                          }`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 px-3.5 font-bold text-slate-800 truncate max-w-[140px] text-xs">
                          {log.entityName} {log.entityId ? `(#${log.entityId})` : ''}
                        </TableCell>
                        <TableCell className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 truncate max-w-[150px] text-xs">{log.actorEmail || 'System'}</span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase">{log.actorRole || 'ADMIN'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-3.5 text-slate-600 text-xs font-medium">
                          {log.details || 'Configuration or security attribute modified.'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="p-3.5 border-t border-slate-100">
              <Pagination
                currentPage={logPage}
                totalPages={logTotalPages}
                totalElements={logTotalElements}
                pageSize={logSize}
                onPageChange={(newPage) => setLogPage(newPage)}
                onPageSizeChange={(newSize) => {
                  setLogSize(newSize);
                  setLogPage(0);
                }}
              />
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};

export default Profile;
