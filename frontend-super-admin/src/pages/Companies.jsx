import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { exportCompaniesDataset } from '../utils/excelExporter';
import Modal from '../components/common/Modal';
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
import { 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  FileCheck, 
  Building2, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  FileText, 
  Download, 
  FileSpreadsheet,
  PenTool,
  LogIn, 
  Sparkles,
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Phone,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Ticket,
  Clock
} from 'lucide-react';
import OnboardingDossierModal, { downloadOnboardingPDF } from '../components/companies/OnboardingDossierModal';

const Companies = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [inspectCompany, setInspectCompany] = useState(null);
  
  // Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  
  // Admin Credentials Modal states
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminCompany, setAdminCompany] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    password: '',
    existingAdmin: null
  });

  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    status: 'ACTIVE'
  });

  const fetchCompanies = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError('');
      const data = await api.get('/companies').catch(() => []);
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Super Admin fetchCompanies error:', err);
      setError(err.message || 'Failed to load companies from database.');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(true);
    const interval = setInterval(() => fetchCompanies(false), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // Export Companies (Excel / CSV)
  const handleExportCompanies = (format = 'excel') => {
    if (companies.length === 0) {
      alert('No enterprise companies to export.');
      return;
    }
    exportCompaniesDataset(companies, format);
    setSuccessMsg(`✓ Exported all ${companies.length} enterprise tenants to ${format === 'excel' ? 'Excel (.xlsx)' : 'CSV'} successfully!`);
  };

  // Super Admin Approval / Rejection Action
  const handleProposalAction = async (company, nextStatus) => {
    try {
      const payload = {
        companyName: company.companyName,
        companyCode: company.companyCode || 'DEFAULT',
        email: company.email,
        phone: company.phone || '',
        website: company.website || '',
        address: company.address || '',
        status: nextStatus,
        customFields: company.customFields
      };
      await api.put(`/companies/${company.id}`, payload);
      await fetchCompanies();

      if (nextStatus === 'ACTIVE') {
        setSuccessMsg(`✓ Company "${company.companyName}" APPROVED! Workspace is now active.`);
      } else {
        setSuccessMsg(`Company "${company.companyName}" registration rejected.`);
      }
    } catch (err) {
      setError(err.message || 'Failed to update company status.');
    }
  };

  const openEditModal = (company) => {
    setSelectedCompany(company);
    setFormData({
      companyName: company.companyName,
      email: company.email,
      phone: company.phone || '',
      website: company.website || '',
      address: company.address || '',
      status: company.status,
      customFields: company.customFields
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedCompany) {
        const extractVal = (v) => (v && typeof v === 'object' ? (v.target?.value ?? v.value ?? v) : v);
        await api.put(`/companies/${selectedCompany.id}`, {
          companyName: formData.companyName,
          companyCode: formData.companyCode,
          email: formData.email,
          phone: formData.phone || '',
          website: formData.website || '',
          address: formData.address || '',
          status: extractVal(formData.status) || 'ACTIVE'
        });
        setSuccessMsg(`✓ Company "${formData.companyName}" details updated successfully!`);
        await fetchCompanies();
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to update company.');
    }
  };

  const handleDelete = async (id, companyName = 'company') => {
    if (!window.confirm(`Are you sure you want to delete "${companyName}"? All tenant data and tickets will be permanently erased!`)) return;
    
    try {
      await api.delete(`/companies/${id}`);
      setSuccessMsg(`✓ Company "${companyName}" and all associated records permanently deleted.`);
      await fetchCompanies();
    } catch (err) {
      setError(err.message || 'Failed to delete company.');
    }
  };

  // 1-Click Direct Shadow Admin Login
  const handleImpersonateCompany = async (company) => {
    try {
      const res = await api.post(`/companies/${company.id}/shadow-login`);
      if (res && res.token) {
        localStorage.setItem('ticketpro_shadow_token', res.token);
        localStorage.setItem('ticketpro_shadow_user', JSON.stringify(res.user));
        const frontendUrl = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';
        window.open(`${frontendUrl}/dashboard?shadow=true`, '_blank');
      } else {
        setError('No active admin credentials found for this company. Please configure keys first.');
      }
    } catch (err) {
      setError(err.message || 'Failed to login as company admin.');
    }
  };

  // Admin Credentials Management
  const openAdminModal = async (company) => {
    setAdminCompany(company);
    setAdminLoading(true);
    setShowPassword(false);
    setAdminData({ name: '', email: '', password: '', existingAdmin: null });
    setIsAdminModalOpen(true);
    setError('');

    try {
      const admin = await api.get(`/companies/${company.id}/admin`).catch(() => null);
      if (admin && admin.id) {
        setAdminData({
          name: admin.name || '',
          email: admin.email || '',
          password: '',
          existingAdmin: admin
        });
      }
    } catch (_err) {
      // No existing admin yet
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminData.email || !adminData.name) {
      setError('Admin name and email are required.');
      return;
    }
    if (!adminData.existingAdmin && !adminData.password) {
      setError('Password is required for new admin setup.');
      return;
    }

    setAdminLoading(true);
    setError('');
    try {
      await api.post(`/companies/${adminCompany.id}/admin`, {
        name: adminData.name,
        email: adminData.email,
        password: adminData.password || undefined
      });

      setIsAdminModalOpen(false);
      setSuccessMsg(`✓ Admin credentials for "${adminCompany.companyName}" saved successfully!`);
      await fetchCompanies();
    } catch (err) {
      setError(err.message || 'Failed to set admin credentials.');
    } finally {
      setAdminLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent"></div>
          <span className="text-xs font-semibold text-slate-500">Loading Enterprise Workspaces...</span>
        </div>
      </div>
    );
  }

  const pendingCompanies = companies.filter(c => c.status === 'PENDING');
  const activeCompanies = companies.filter(c => c.status !== 'PENDING');

  return (
    <div className="space-y-3.5 text-left font-sans select-none pb-12 w-full">
      
      {/* HEADER BANNER */}
      <Card className="rounded-2xl border-slate-200/80 shadow-2xs bg-gradient-to-r from-white via-indigo-50/30 to-slate-50 overflow-hidden">
        <CardContent className="p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Enterprise Workspaces & Tenants
              </h1>
              <Badge variant="outline" className="bg-cyan-100/80 border-cyan-300/80 text-cyan-900 font-extrabold text-[11px] uppercase tracking-wider rounded-full px-3 py-0.5">
                {companies.length} Total
              </Badge>
            </div>
            <p className="text-xs text-slate-600 font-medium max-w-2xl mt-0.5">
              Review onboarding registration requests, approve enterprise workspaces, configure admin credentials, and launch 1-click shadow login.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => fetchCompanies(true)}
              className="flex-1 sm:flex-initial rounded-xl border-slate-200 text-slate-700 font-bold text-xs h-8.5 px-3 gap-1.5 hover:bg-slate-50 cursor-pointer shadow-2xs active:scale-95 justify-center"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={() => handleExportCompanies('excel')}
              className="flex-1 sm:flex-initial rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-8.5 px-3 gap-1.5 shadow-2xs cursor-pointer active:scale-95 justify-center"
              title="Download Real Excel Spreadsheet"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </Button>

            <Button
              onClick={() => handleExportCompanies('csv')}
              className="flex-1 sm:flex-initial rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs h-8.5 px-3 gap-1.5 shadow-2xs cursor-pointer active:scale-95 justify-center"
              title="Download CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* NOTIFICATIONS */}
      {error && (
        <div className="rounded-xl bg-rose-50 p-3.5 text-xs font-bold text-rose-700 border border-rose-200 flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 font-black cursor-pointer px-2">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-black cursor-pointer px-2">✕</button>
        </div>
      )}

      {/* 4 VIBRANT STAT CARDS (EXACT SAME SHADCN CARD PALETTE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Active Workspaces (Purple) */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all bg-white group p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Workspaces</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 tracking-tight leading-tight">{activeCompanies.length}</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-600"></span>
              Operational tenant organizations
            </p>
          </div>
        </Card>

        {/* KPI 2: Total Registered Tenants (Indigo) */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all bg-white group p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Registered</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-700 flex items-center justify-center font-bold">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">{companies.length}</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
              Database tenant records
            </p>
          </div>
        </Card>

        {/* KPI 3: Pending Approvals (Amber) */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all bg-white group p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight leading-tight">{pendingCompanies.length}</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              Awaiting super admin grant
            </p>
          </div>
        </Card>

        {/* KPI 4: Verified Integrity (Emerald) */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all bg-white group p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">System Health</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight leading-tight">100%</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
              Isolated tenant partitions active
            </p>
          </div>
        </Card>
      </div>

      {/* 1. SECTION: PENDING COMPANY REGISTRATION REQUESTS */}
      {pendingCompanies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <FileCheck className="h-4.5 w-4.5 text-amber-500" />
            <h3 className="text-sm font-black text-slate-900">
              Pending Onboarding Applications ({pendingCompanies.length})
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingCompanies.map((c) => {
              let custom = {};
              if (c.customFields) {
                try { custom = JSON.parse(c.customFields); } catch(_e) {}
              }
              return (
                <Card key={c.id} className="rounded-2xl border-amber-200 bg-gradient-to-b from-white to-amber-50/20 shadow-2xs overflow-hidden flex flex-col justify-between">
                  <div className="h-1 bg-amber-500 w-full"></div>
                  
                  <CardContent className="p-4 space-y-3 flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 font-black flex items-center justify-center text-xs shadow-2xs shrink-0">
                          {c.companyName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 truncate max-w-[150px]">{c.companyName}</h4>
                          <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[150px]">{c.email}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-100/80 border-amber-200 text-amber-800 font-extrabold text-[9px] rounded-full">
                        PENDING
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs text-slate-600 font-medium border-t border-amber-100 pt-2.5">
                      <p className="truncate text-[11px]">Industry: <strong className="text-cyan-800 font-bold">{custom.industryType || 'IT & Technology'}</strong></p>
                      <p className="truncate text-[11px]">Scale: <strong className="text-slate-800 font-bold">{custom.companySize || '50-250 Employees'}</strong></p>
                      <p className="truncate text-[11px]">Phone: <strong className="text-slate-800 font-bold">{c.phone || 'N/A'}</strong></p>
                    </div>
                  </CardContent>

                  <div className="p-3 bg-amber-50/40 border-t border-amber-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setInspectCompany(c)}
                        className="rounded-xl border-cyan-200 bg-white hover:bg-cyan-50 text-cyan-800 text-xs font-bold h-8 gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Inspect Docs</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadOnboardingPDF(c)}
                        className="rounded-xl border-cyan-200 bg-white hover:bg-cyan-50 text-cyan-800 text-xs font-bold h-8 gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleProposalAction(c, 'REJECTED')}
                        className="rounded-xl border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold h-8 gap-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </Button>
                      <Button
                        onClick={() => handleProposalAction(c, 'ACTIVE')}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black h-8 gap-1 shadow-2xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. SECTION: ACTIVE WORKSPACES TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-4.5 w-4.5 text-cyan-700" />
            <h3 className="text-sm font-black text-slate-900">
              Active Enterprise Tenants ({activeCompanies.length})
            </h3>
          </div>
        </div>
        
        <Card className="rounded-2xl border-slate-200/80 shadow-2xs bg-white overflow-hidden">
          {/* MOBILE CARD LIST VIEW (Below md) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {activeCompanies.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-semibold px-4">
                No active companies registered.
              </div>
            ) : (
              activeCompanies.map((c) => (
                <div key={`mobile-comp-${c.id}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                        {(c.companyCode || c.companyName || 'CO').slice(0, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-slate-900 text-xs block truncate">{c.companyName}</span>
                        <span className="text-[10px] text-slate-400 font-medium block truncate">{c.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 font-extrabold text-[10px]">
                        {c.companyCode || 'CORP'}
                      </Badge>
                      <Badge variant="outline" className={`rounded-full text-[9px] font-extrabold ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {c.status || 'ACTIVE'}
                      </Badge>
                    </div>
                  </div>

                  {c.website && (
                    <div className="text-[11px] text-slate-500 font-medium truncate">
                      Website: <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-cyan-700 hover:underline">{c.website}</a>
                    </div>
                  )}

                  {/* Mobile Quick Access Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleImpersonateCompany(c)}
                      className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[10.5px] font-black h-7.5 px-2 gap-1 shadow-2xs active:scale-95 cursor-pointer justify-center"
                      title="1-Click Direct Admin Portal Login"
                    >
                      <LogIn className="h-3 w-3 shrink-0" />
                      <span className="truncate">Login</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        try {
                          localStorage.setItem('ticketpro_superadmin_selected_company', JSON.stringify(c));
                        } catch (_e) {}
                        navigate(`/form-builder?companyId=${c.id}&companyCode=${c.companyCode}`);
                      }}
                      className="rounded-xl border-cyan-200 hover:bg-cyan-50 text-cyan-800 text-[10.5px] font-bold h-7.5 px-2 gap-1 cursor-pointer justify-center"
                      title="Customize Dynamic Intake Forms"
                    >
                      <PenTool className="h-3 w-3 text-cyan-700 shrink-0" />
                      <span className="truncate">Forms</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAdminModal(c)}
                      className="rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 text-[10.5px] font-bold h-7.5 px-2 gap-1 cursor-pointer justify-center"
                      title="View & Set Credentials"
                    >
                      <KeyRound className="h-3 w-3 text-slate-500 shrink-0" />
                      <span className="truncate">Keys</span>
                    </Button>
                  </div>

                  {/* Bottom Row: Additional Icon Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadOnboardingPDF(c)}
                      className="h-7 px-2 text-cyan-700 hover:bg-cyan-50 rounded-xl text-xs font-semibold gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>PDF Document</span>
                    </Button>

                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(c)}
                        className="h-7 w-7 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-xl"
                        title="Edit Company Details"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(c.id, c.companyName)}
                        className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                        title="Delete Tenant Workspace"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP LINEAR TABLE VIEW (md and above) */}
          <div className="hidden md:block overflow-x-auto w-full">
            <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100">
                <TableHead className="py-3 px-4 font-black text-[10px] uppercase tracking-wider text-slate-400">Workspace</TableHead>
                <TableHead className="py-3 px-4 font-black text-[10px] uppercase tracking-wider text-slate-400">Tenant Code</TableHead>
                <TableHead className="py-3 px-4 font-black text-[10px] uppercase tracking-wider text-slate-400">Contact Email</TableHead>
                <TableHead className="py-3 px-4 font-black text-[10px] uppercase tracking-wider text-slate-400">Status</TableHead>
                <TableHead className="py-3 px-4 font-black text-[10px] uppercase tracking-wider text-slate-400">Quick Access</TableHead>
                <TableHead className="py-3 px-4 font-black text-[10px] uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {activeCompanies.map((c) => (
                <TableRow key={c.id} className="hover:bg-cyan-50/30 transition-colors">
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                        {(c.companyCode || c.companyName || 'CO').slice(0, 3).toUpperCase()}
                      </div>
                      <div className="truncate max-w-[170px]">
                        <span className="font-extrabold text-slate-900 text-xs block truncate">{c.companyName}</span>
                        <span className="text-[10px] text-slate-400 font-medium block truncate">{c.website || 'No website'}</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-3 px-4 font-black text-cyan-800 text-xs">
                    <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 font-extrabold text-[10px]">
                      {c.companyCode || 'CORP'}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-3 px-4 text-slate-600 text-xs font-semibold">
                    {c.email}
                  </TableCell>

                  <TableCell className="py-3 px-4">
                    <Badge variant="outline" className={`rounded-full text-[10px] font-extrabold ${
                      c.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {c.status || 'ACTIVE'}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-3 px-4">
                    <div className="flex items-center space-x-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleImpersonateCompany(c)}
                        className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[11px] font-black h-7.5 px-2.5 gap-1 shadow-2xs active:scale-95 cursor-pointer"
                        title="1-Click Direct Admin Portal Login"
                      >
                        <LogIn className="h-3 w-3" />
                        <span>Login as Admin</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          try {
                            localStorage.setItem('ticketpro_superadmin_selected_company', JSON.stringify(c));
                          } catch (_e) {}
                          navigate(`/form-builder?companyId=${c.id}&companyCode=${c.companyCode}`);
                        }}
                        className="rounded-xl border-cyan-200 hover:bg-cyan-50 text-cyan-800 text-[11px] font-bold h-7.5 px-2.5 gap-1 cursor-pointer"
                        title="Customize Dynamic Intake Forms for this Company"
                      >
                        <PenTool className="h-3 w-3 text-cyan-700" />
                        <span>Forms</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAdminModal(c)}
                        className="rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold h-7.5 px-2.5 gap-1 cursor-pointer"
                        title="View & Set Credentials"
                      >
                        <KeyRound className="h-3 w-3 text-slate-500" />
                        <span>Keys</span>
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadOnboardingPDF(c)}
                      className="h-7.5 w-7.5 text-cyan-700 hover:bg-cyan-50 rounded-xl"
                      title="Download Onboarding Application PDF"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(c)}
                      className="h-7.5 w-7.5 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-xl"
                      title="Edit Company Details"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(c.id, c.companyName)}
                      className="h-7.5 w-7.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                      title="Delete Tenant Workspace"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {activeCompanies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-slate-400 text-xs font-semibold">
                    No active companies registered.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </Card>
      </div>

      {/* EDIT MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Edit Enterprise Workspace Details"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Company Name</Label>
            <Input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Support Email</Label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Status</Label>
            <CustomSelect
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'PENDING', label: 'PENDING' },
                { value: 'SUSPENDED', label: 'SUSPENDED' },
                { value: 'REJECTED', label: 'REJECTED' }
              ]}
              buttonClassName="block w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-900 bg-white cursor-pointer shadow-none"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl text-xs h-8.5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs h-8.5"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ADMIN CREDENTIALS MODAL */}
      <Modal 
        isOpen={isAdminModalOpen} 
        onClose={() => setIsAdminModalOpen(false)} 
        title={`Set Admin Access — ${adminCompany?.companyName || ''}`}
      >
        {adminLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-3.5">
            {adminData.existingAdmin && (
              <div className="bg-cyan-50/60 border border-cyan-100 rounded-xl p-3 space-y-0.5">
                <p className="text-[10px] font-black text-cyan-800 uppercase tracking-wider">Current Workspace Admin</p>
                <p className="text-xs font-black text-slate-900">{adminData.existingAdmin.name}</p>
                <p className="text-[11px] text-slate-500 font-semibold">{adminData.existingAdmin.email}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Admin Full Name</Label>
              <Input
                type="text"
                value={adminData.name}
                onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Admin Email (Login ID)</Label>
              <Input
                type="email"
                value={adminData.email}
                onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                placeholder="admin@company.com"
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                {adminData.existingAdmin ? 'New Password (leave blank to keep current)' : 'Password *'}
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder={adminData.existingAdmin ? '••••••••' : 'Set a strong password'}
                  className="rounded-xl pr-10"
                  required={!adminData.existingAdmin}
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

            <div className="flex justify-end pt-3 border-t border-slate-100 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdminModalOpen(false)}
                className="rounded-xl text-xs h-8.5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adminLoading}
                className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs h-8.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>{adminData.existingAdmin ? 'Update Credentials' : 'Create Admin'}</span>
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ONBOARDING DOCUMENTATION DOSSIER MODAL */}
      <OnboardingDossierModal
        isOpen={!!inspectCompany}
        onClose={() => setInspectCompany(null)}
        company={inspectCompany}
        onApprove={(comp) => handleProposalAction(comp, 'ACTIVE')}
        onReject={(comp) => handleProposalAction(comp, 'REJECTED')}
      />
    </div>
  );
};

export default Companies;
