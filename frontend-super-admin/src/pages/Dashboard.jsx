import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
  Building2, 
  Ticket, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight, 
  RefreshCw, 
  ShieldCheck, 
  Sliders, 
  CreditCard,
  PlusCircle,
  FileCheck,
  Check,
  X,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Layers,
  Star,
  Activity,
  AlertCircle,
  FileText,
  Download
} from 'lucide-react';
import TicketTrends from '../components/dashboard/TicketTrends';
import PriorityStatusCard from '../components/dashboard/PriorityStatusCard';
import OnboardingDossierModal, { downloadOnboardingPDF } from '../components/companies/OnboardingDossierModal';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [inspectCompany, setInspectCompany] = useState(null);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setLoading(true);
    setError('');

    try {
      // 1. Fetch dashboard aggregated stats, company list, and global ticket stream
      const [statsData, companiesData, ticketsData] = await Promise.all([
        api.get('/dashboard').catch(() => null),
        api.get('/companies').catch(() => []),
        api.get('/tickets').catch(() => [])
      ]);

      const compList = Array.isArray(companiesData) ? companiesData : (Array.isArray(companiesData?.content) ? companiesData.content : []);
      const ticketList = Array.isArray(ticketsData) ? ticketsData : (Array.isArray(ticketsData?.content) ? ticketsData.content : []);

      setCompanies(compList);
      setTickets(ticketList);

      // Compute or fallback stats
      const openCount = ticketList.filter(t => t.status === 'OPEN' || t.status === 'NEW').length;
      const inProgCount = ticketList.filter(t => t.status === 'IN_PROGRESS').length;
      const resCount = ticketList.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
      const highCount = ticketList.filter(t => ['HIGH', 'CRITICAL', 'URGENT'].includes((t.priority || '').toUpperCase())).length;
      const medCount = ticketList.filter(t => (t.priority || '').toUpperCase() === 'MEDIUM').length;
      const lowCount = ticketList.filter(t => ['LOW', '', 'NORMAL', 'STANDARD'].includes((t.priority || '').toUpperCase())).length;

      setStats({
        totalCompanies: compList.length > 0 ? compList.length : (statsData?.totalCompanies || 0),
        totalTickets: ticketList.length > 0 ? ticketList.length : (statsData?.totalTickets || 0),
        openTickets: ticketList.length > 0 ? openCount : (statsData?.openTickets || 0),
        inProgressTickets: ticketList.length > 0 ? inProgCount : (statsData?.inProgressTickets || 0),
        resolvedTickets: ticketList.length > 0 ? resCount : (statsData?.resolvedTickets || 0),
        highPriority: highCount,
        mediumPriority: medCount,
        lowPriority: lowCount,
        csatAverage: statsData?.csatAverage || 5.0,
        companiesList: compList,
        ticketsList: ticketList,
        allTickets: ticketList,
        recentTickets: ticketList.slice(0, 6)
      });
    } catch (err) {
      console.error('Super Admin Dashboard Fetch Error:', err);
      setError(err.message || 'Unable to sync live records with platform backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(false), 25000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickApprove = async (company) => {
    try {
      const payload = {
        companyName: company.companyName,
        companyCode: company.companyCode || 'DEFAULT',
        email: company.email,
        phone: company.phone || '',
        status: 'ACTIVE',
        customFields: company.customFields
      };
      await api.put(`/companies/${company.id}`, payload);
      setActionMsg(`✓ Workspace "${company.companyName}" successfully approved and activated!`);
      setTimeout(() => setActionMsg(''), 4000);
      fetchDashboardData(false);
    } catch (err) {
      setError(err.message || 'Failed to approve company registration.');
    }
  };

  const handleReject = async (company) => {
    if (!window.confirm(`Are you sure you want to reject the onboarding application for "${company.companyName}"?`)) return;
    try {
      const payload = {
        companyName: company.companyName,
        companyCode: company.companyCode || 'DEFAULT',
        email: company.email,
        phone: company.phone || '',
        status: 'REJECTED',
        customFields: company.customFields
      };
      await api.put(`/companies/${company.id}`, payload);
      setActionMsg(`Onboarding application for "${company.companyName}" rejected.`);
      setTimeout(() => setActionMsg(''), 4000);
      fetchDashboardData(false);
    } catch (err) {
      setError(err.message || 'Failed to reject company registration.');
    }
  };

  const pendingCompanies = useMemo(() => {
    return companies.filter(c => c.status === 'PENDING');
  }, [companies]);

  const totalCompanies = stats?.totalCompanies ?? companies.length;
  const totalTickets = stats?.totalTickets ?? tickets.length;
  const openTickets = stats?.openTickets ?? 0;
  const inProgressTickets = stats?.inProgressTickets ?? 0;
  const resolvedTickets = stats?.resolvedTickets ?? 0;

  const getPriorityBadge = (priority) => {
    switch ((priority || '').toUpperCase()) {
      case 'URGENT':
      case 'CRITICAL':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-black uppercase">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-black uppercase">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-black uppercase">Medium</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[9px] font-bold uppercase">Standard</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'RESOLVED':
      case 'CLOSED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-black uppercase">Resolved</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-black uppercase">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-800 border-cyan-200 text-[9px] font-black uppercase">Open</Badge>;
    }
  };

  return (
    <div className="space-y-3.5 text-left font-sans select-none pb-8 w-full">
      
      {/* SHADCN MODERN TOP HERO CARD - COMPACT HEIGHT */}
      <Card className="rounded-2xl border border-slate-200/80 shadow-2xs bg-gradient-to-r from-white via-indigo-50/30 to-purple-50/20 overflow-hidden">
        <CardContent className="p-3.5 sm:p-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 px-2 py-0.5 text-[10.5px] font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Platform Root Control</span>
              </Badge>
              <Badge variant="secondary" className="gap-1 text-[10.5px] font-bold px-2 py-0.5 bg-cyan-50 text-cyan-800 border-cyan-200/60">
                <Building2 className="h-3 w-3 text-cyan-700" />
                <span>Multi-Tenant Architecture</span>
              </Badge>
            </div>
            
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Super Admin Master Command Center
              </h1>
              <p className="text-xs text-slate-500 font-medium max-w-2xl mt-0.5">
                Global governance over tenant workspaces, custom ticket schemas, SLA policies, and enterprise workflows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => fetchDashboardData(true)}
              className="flex-1 sm:flex-initial rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 h-8.5 text-xs gap-1.5 cursor-pointer shadow-2xs active:scale-95 justify-center"
            >
              <RefreshCw className={`h-3 w-3 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={() => navigate('/companies')}
              className="flex-1 sm:flex-initial rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black shadow-xs shadow-cyan-500/20 px-3.5 h-8.5 text-xs gap-1.5 active:scale-95 cursor-pointer justify-center"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Manage Tenants</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ACTION / NOTIFICATION MESSAGES */}
      {actionMsg && (
        <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center space-x-2 animate-in fade-in shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 border border-rose-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            onClick={() => fetchDashboardData(true)}
            className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] h-7 px-2.5 cursor-pointer"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* PENDING ONBOARDING REQUESTS BANNER (SUPER ADMIN APPROVAL NOTIFICATION) */}
      {pendingCompanies.length > 0 && (
        <Card className="rounded-2xl border-amber-300/80 bg-gradient-to-r from-amber-50 via-white to-amber-50 shadow-2xs p-4 space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-amber-200/60 pb-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="h-8.5 w-8.5 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/30 shrink-0">
                <FileCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950">
                  New Onboarding Applications ({pendingCompanies.length} Pending Approval)
                </h3>
                <p className="text-[11px] text-amber-700 font-medium">
                  Review new corporate registration requests, inspect documentation, and grant workspace activation.
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate('/companies')}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black h-8 px-3 gap-1 shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>Review in Tenants</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingCompanies.map((c) => {
              let custom = {};
              if (c.customFields) {
                try {
                  custom = typeof c.customFields === 'string' ? JSON.parse(c.customFields) : c.customFields;
                } catch (_e) {}
              }
              return (
                <div key={c.id} className="p-3.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs flex flex-col justify-between space-y-2.5 hover:border-amber-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="h-8.5 w-8.5 rounded-xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                        {c.companyName?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate">{c.companyName}</h4>
                        <span className="text-[10px] text-slate-500 font-medium block truncate">{c.email}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-black uppercase shrink-0">
                      Pending
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 font-medium border-t border-amber-100/70 pt-2">
                    <p className="truncate text-[11px]">Industry: <strong className="text-cyan-800 font-bold">{custom.industryType || 'IT & Software Support'}</strong></p>
                    <p className="truncate text-[11px]">Scale: <strong className="text-slate-800 font-bold">{custom.companySize || '50-250 Employees'}</strong></p>
                    <p className="truncate text-[11px]">Phone: <strong className="text-slate-800 font-bold">{c.phone || 'N/A'}</strong></p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectCompany(c)}
                        className="h-7.5 rounded-lg border-cyan-200 bg-white hover:bg-cyan-50 text-cyan-800 text-[10.5px] font-black gap-1 shadow-2xs cursor-pointer"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Inspect Docs</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadOnboardingPDF(c)}
                        className="h-7.5 rounded-lg border-cyan-200 bg-white hover:bg-cyan-50 text-cyan-800 text-[10.5px] font-black gap-1 shadow-2xs cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>PDF</span>
                      </Button>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Code: {c.companyCode || 'CORP'}</span>
                      <Button
                        size="sm"
                        onClick={() => handleQuickApprove(c)}
                        className="h-7.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black gap-1 shadow-2xs cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 4 KPI METRICS CARDS (MATCHING DESIGN PALETTE WITH ORIGINAL SUPER ADMIN NAMES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* KPI 1: Active Workspaces (Blue Theme) */}
        <div 
          onClick={() => navigate('/companies')}
          className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-blue-50/40 p-4 sm:p-4.5 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-200/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 truncate">
                  Active Workspaces
                </h3>
                <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                  Enterprise tenants configured
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
              Tenants
            </span>
          </div>

          <div className="pt-1">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {loading && !stats ? <span className="inline-block h-8 w-12 bg-slate-100 rounded animate-pulse" /> : totalCompanies}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200/70 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 text-teal-600" />
              +12%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              vs. last 30 days
            </span>
          </div>
        </div>

        {/* KPI 2: Total Platform Tickets (Teal Theme) */}
        <div 
          onClick={() => navigate('/tickets')}
          className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-teal-50/40 p-4 sm:p-4.5 shadow-2xs hover:shadow-xs hover:border-teal-300 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-teal-500/10 text-teal-600 border border-teal-200/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Ticket className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 truncate">
                  Total Platform Tickets
                </h3>
                <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                  All-time registered requests
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 shrink-0">
              Total
            </span>
          </div>

          <div className="pt-1">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {loading && !stats ? <span className="inline-block h-8 w-14 bg-slate-100 rounded animate-pulse" /> : totalTickets}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200/70 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 text-teal-600" />
              +18%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              vs. last 30 days
            </span>
          </div>
        </div>

        {/* KPI 3: Open Queues (Amber Theme) */}
        <div 
          onClick={() => navigate('/tickets?status=OPEN')}
          className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-amber-50/40 p-4 sm:p-4.5 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-200/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 truncate">
                  Open Queues
                </h3>
                <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                  Pending agent triage
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Active
            </span>
          </div>

          <div className="pt-1">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {loading && !stats ? <span className="inline-block h-8 w-12 bg-slate-100 rounded animate-pulse" /> : openTickets}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
              <TrendingDown className="h-3 w-3 text-amber-600" />
              -20%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              vs. last 7 days
            </span>
          </div>
        </div>

        {/* KPI 4: Resolved & CSAT (Emerald Theme) */}
        <div 
          onClick={() => navigate('/tickets?status=RESOLVED')}
          className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 sm:p-4.5 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 truncate">
                  Resolved & CSAT
                </h3>
                <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                  {totalTickets ? `${Math.round(((resolvedTickets || 0) / totalTickets) * 100)}% resolution rate` : '100% resolution'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
              Resolved
            </span>
          </div>

          <div className="pt-1">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-baseline gap-2">
              <span>{loading && !stats ? <span className="inline-block h-8 w-12 bg-slate-100 rounded animate-pulse" /> : resolvedTickets}</span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                ★ {stats?.csatAverage || 5.0}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              +33%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              vs. last 7 days
            </span>
          </div>
        </div>

      </div>

      {/* CHARTS & ANALYTICS ROW - BALANCED & COMPACT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Global Ticket Trends Chart (7-8 Cols) */}
        <TicketTrends
          tickets={stats?.allTickets || tickets || []}
          className="lg:col-span-7 xl:col-span-8"
        />

        {/* Severity & Status Concentric Ring Distribution (4-5 Cols) */}
        <PriorityStatusCard
          stats={stats}
          tickets={stats?.allTickets || tickets || []}
          className="lg:col-span-5 xl:col-span-4"
        />

      </div>

      {/* MULTI-TENANT WORKSPACES LIVE GRID */}
      {companies && companies.length > 0 && (
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <CardTitle className="text-sm sm:text-base font-black text-slate-900 flex items-center space-x-2">
                <Building2 className="h-4.5 w-4.5 text-cyan-700" />
                <span>Multi-Tenant Enterprise Workspaces ({companies.length})</span>
              </CardTitle>
              <CardDescription className="text-[11px] font-medium text-slate-500 mt-0.5">
                Managed enterprise tenants with dynamic schemas and live ticket loads
              </CardDescription>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/companies')}
              className="text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg gap-1 cursor-pointer h-8 px-3 shadow-2xs"
            >
              <span>Manage All</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((comp) => {
              const compTickets = tickets.filter(t => (t.companyName === comp.companyName || t.company?.id === comp.id || t.company?.companyCode === comp.companyCode));
              return (
                <div
                  key={comp.id || comp.companyCode || comp.code}
                  onClick={() => navigate(`/tickets?companyCode=${comp.companyCode || comp.code || ''}`)}
                  className="p-3.5 rounded-xl border border-slate-200/70 hover:border-cyan-300 hover:shadow-xs bg-white transition-all cursor-pointer group space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8.5 w-8.5 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-100 font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                        {(comp.companyCode || comp.code || comp.companyName || 'CO').slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 group-hover:text-cyan-700 transition-colors truncate max-w-[150px]">
                          {comp.companyName || comp.name || 'Enterprise Tenant'}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          Code: {comp.companyCode || comp.code || 'CORP'}
                        </span>
                      </div>
                    </div>

                    <Badge variant="outline" className={`rounded-full text-[9px] font-black uppercase ${
                      comp.status === 'ACTIVE' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {comp.status || 'ACTIVE'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 text-slate-500 font-medium">
                    <span className="text-[10.5px] text-slate-400">Live Active Tickets:</span>
                    <span className="font-extrabold text-cyan-800 bg-cyan-50 border border-cyan-200/60 px-2 py-0.5 rounded-md text-[10.5px]">
                      {compTickets.length} Tickets
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* RECENT PLATFORM TICKETS WORKLIST */}
      {tickets && tickets.length > 0 && (
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <CardTitle className="text-sm sm:text-base font-black text-slate-900 flex items-center space-x-2">
                <Ticket className="h-4.5 w-4.5 text-cyan-700" />
                <span>Recent Platform Tickets ({tickets.slice(0, 5).length})</span>
              </CardTitle>
              <CardDescription className="text-[11px] font-medium text-slate-500 mt-0.5">
                Real-time stream of incoming customer requests across all active tenant companies
              </CardDescription>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/tickets')}
              className="text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg gap-1 cursor-pointer h-8 px-3 shadow-2xs"
            >
              <span>View Full Queue</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {tickets.slice(0, 6).map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets?ticketId=${t.id}`)}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center group-hover:bg-cyan-50 group-hover:text-cyan-700 transition-colors shrink-0">
                    #{t.id}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-cyan-700 transition-colors">
                      {t.subject || 'Ticket Request'}
                    </h4>
                    <div className="flex items-center space-x-2 mt-0.5 text-[10.5px] text-slate-400">
                      <span className="font-semibold text-slate-600">{t.companyName || t.company?.companyName || 'Enterprise'}</span>
                      <span>•</span>
                      <span>{t.creatorName || t.userEmail || 'Customer'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
                  {getPriorityBadge(t.priority)}
                  {getStatusBadge(t.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ONBOARDING DOCUMENTATION DOSSIER MODAL */}
      <OnboardingDossierModal
        isOpen={!!inspectCompany}
        onClose={() => setInspectCompany(null)}
        company={inspectCompany}
        onApprove={handleQuickApprove}
        onReject={handleReject}
      />

    </div>
  );
};

export default Dashboard;
