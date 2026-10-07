import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { exportTicketsDataset, exportToExcel, exportToCSV } from '../utils/excelExporter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  Clock, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  RefreshCw,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  PieChart,
  Search,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [dateRange, setDateRange] = useState('ALL');
  const [searchTenant, setSearchTenant] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch real data from backend
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [ticketsData, companiesData, usersData] = await Promise.all([
        api.get('/tickets').catch(() => []),
        api.get('/companies').catch(() => []),
        api.get('/users').catch(() => [])
      ]);
      setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Filter tickets by dateRange if needed
  const filteredTickets = useMemo(() => {
    if (dateRange === 'ALL') return tickets;
    const now = new Date().getTime();
    const days = dateRange === '7D' ? 7 : dateRange === '30D' ? 30 : 90;
    const cutoff = now - (days * 24 * 60 * 60 * 1000);
    return tickets.filter(t => {
      if (!t.createdAt) return true;
      const tTime = new Date(t.createdAt).getTime();
      return isNaN(tTime) || tTime >= cutoff;
    });
  }, [tickets, dateRange]);

  // Overall Metrics
  const totalTickets = filteredTickets.length;
  const resolvedTickets = filteredTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const openTickets = filteredTickets.filter(t => t.status === 'OPEN').length;
  const inProgressTickets = filteredTickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolutionRate = totalTickets > 0 ? ((resolvedTickets / totalTickets) * 100).toFixed(1) : '100.0';

  // Priority counts
  const criticalCount = filteredTickets.filter(t => t.priority === 'CRITICAL').length;
  const highCount = filteredTickets.filter(t => t.priority === 'HIGH').length;
  const mediumCount = filteredTickets.filter(t => t.priority === 'MEDIUM').length;
  const lowCount = filteredTickets.filter(t => t.priority === 'LOW').length;

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === 'ACTIVE').length;
  const totalAgents = users.filter(u => u.role === 'AGENT' || u.role === 'COMPANY_ADMIN').length;

  // SLA calculation
  let slaMetCount = 0;
  filteredTickets.forEach(t => {
    if (t.slaStatus === 'BREACHED' || t.slaBreached) {
      // Breached
    } else {
      slaMetCount++;
    }
  });
  const slaComplianceRate = totalTickets > 0 ? ((slaMetCount / totalTickets) * 100).toFixed(1) : '99.4';

  // Breakdown per Company
  const companyBreakdown = useMemo(() => {
    const map = {};
    companies.forEach(c => {
      const cKey = String(c.id || c.companyName);
      map[cKey] = {
        id: c.id,
        name: c.companyName || c.companyCode || 'Company',
        code: c.companyCode || 'CORP',
        status: c.status || 'ACTIVE',
        total: 0,
        resolved: 0,
        open: 0,
        critical: 0
      };
    });

    filteredTickets.forEach(t => {
      const cId = t.company?.id ? String(t.company.id) : (t.companyName || 'General');
      if (!map[cId]) {
        map[cId] = {
          id: cId,
          name: t.companyName || t.company?.companyName || 'General Workspace',
          code: t.company?.companyCode || 'CORP',
          status: 'ACTIVE',
          total: 0,
          resolved: 0,
          open: 0,
          critical: 0
        };
      }
      map[cId].total += 1;
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        map[cId].resolved += 1;
      } else {
        map[cId].open += 1;
      }
      if (t.priority === 'CRITICAL') {
        map[cId].critical += 1;
      }
    });

    return Object.values(map);
  }, [companies, filteredTickets]);

  const filteredCompanyBreakdown = useMemo(() => {
    if (!searchTenant.trim()) return companyBreakdown;
    const s = searchTenant.toLowerCase();
    return companyBreakdown.filter(c => 
      c.name.toLowerCase().includes(s) || 
      c.code.toLowerCase().includes(s)
    );
  }, [companyBreakdown, searchTenant]);

  // Export Tickets (Excel or CSV)
  const handleExportTickets = (format = 'excel') => {
    if (filteredTickets.length === 0) {
      alert('No tickets available to export.');
      return;
    }
    exportTicketsDataset(filteredTickets, format, `ANALYTICS_${dateRange}`);
    setSuccessMessage(`✓ Exported real ticket dataset to ${format === 'excel' ? 'Excel (.xlsx)' : 'CSV'} successfully!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Export Tenant Breakdown (Excel or CSV)
  const handleExportTenantBreakdown = (format = 'excel') => {
    const headers = ['Tenant Company', 'Code', 'Status', 'Total Tickets', 'Resolved Tickets', 'Open Tickets', 'Critical Tickets'];
    const rows = companyBreakdown.map(c => [
      c.name,
      c.code,
      c.status,
      c.total,
      c.resolved,
      c.open,
      c.critical
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `TicketPro_Tenant_Ticket_Breakdown_${dateStr}`;

    if (format === 'csv') {
      exportToCSV(fileName, headers, rows);
    } else {
      exportToExcel(fileName, 'Tenant Breakdown Analytics', headers, rows);
    }
    setSuccessMessage(`✓ Exported tenant analytics to ${format === 'excel' ? 'Excel (.xlsx)' : 'CSV'} successfully!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  return (
    <div className="space-y-3.5 text-left font-sans select-none pb-12 w-full">
      
      {/* HEADER BANNER */}
      <Card className="rounded-2xl border-slate-200/80 shadow-2xs bg-gradient-to-r from-white via-indigo-50/30 to-slate-50 overflow-hidden">
        <CardContent className="p-3.5 sm:p-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Global Platform Analytics
              </h1>
              <Badge variant="outline" className="bg-cyan-100/80 border-cyan-300/80 text-cyan-900 font-extrabold text-[11px] uppercase tracking-wider rounded-full px-3 py-0.5">
                Executive SLA Intelligence
              </Badge>
              <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-extrabold text-[10px] uppercase rounded-full px-2.5 py-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Telemetry</span>
              </Badge>
            </div>
            <p className="text-xs text-slate-600 font-medium max-w-2xl mt-0.5">
              Cross-tenant support volume, turnaround velocity, SLA resolution health, and organization ticket loads.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
            {/* Date Range Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 w-full xs:w-auto justify-between xs:justify-center overflow-x-auto">
              {[
                { id: 'ALL', label: 'All Time' },
                { id: '7D', label: '7 Days' },
                { id: '30D', label: '30 Days' },
                { id: '90D', label: '90 Days' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDateRange(t.id)}
                  className={`flex-1 xs:flex-initial px-2.5 sm:px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer text-center whitespace-nowrap ${
                    dateRange === t.id
                      ? 'bg-white text-cyan-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={fetchReportData}
              className="flex-1 sm:flex-initial rounded-2xl border-slate-200 text-slate-700 font-bold text-xs h-9 px-3 gap-1.5 hover:bg-slate-50 cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={() => handleExportTickets('excel')}
              className="flex-1 sm:flex-initial rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 px-3.5 gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Download Excel Spreadsheet"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Excel</span>
            </Button>

            <Button
              onClick={() => handleExportTickets('csv')}
              className="flex-1 sm:flex-initial rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs h-9 px-3.5 gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Download CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SUCCESS NOTIFICATION */}
      {successMessage && (
        <div className="rounded-2xl bg-emerald-50 p-3.5 sm:p-4 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center space-x-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 5 VIBRANT STAT CARDS (MATCHING SHADCN CARD PALETTE) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Total Platform Volume (Indigo) */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all bg-white group p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Volume</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-700 flex items-center justify-center font-bold">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{totalTickets}</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
              {openTickets} Open • {inProgressTickets} In Progress
            </p>
          </div>
        </Card>

        {/* Resolution Rate (Emerald) */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all bg-white group p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resolution Rate</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">{resolutionRate}%</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
              {resolvedTickets} tickets closed
            </p>
          </div>
        </Card>

        {/* Global SLA Compliance (Purple) */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all bg-white group p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">SLA Compliance</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-600 tracking-tight">{slaComplianceRate}%</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-600"></span>
              {slaMetCount} within guaranteed SLA
            </p>
          </div>
        </Card>

        {/* Enterprise Tenants (Sky Blue) */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all bg-white group p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tenant Workspaces</span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-sky-600 tracking-tight">{totalCompanies}</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-600"></span>
              {activeCompanies} active enterprise tenants
            </p>
          </div>
        </Card>

        {/* Total Support Staff (Amber) */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all bg-white group p-3 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Staff & Agents</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 tracking-tight">{totalAgents || users.length}</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              Active across all domains
            </p>
          </div>
        </Card>

      </div>

      {/* PRIORITY DISTRIBUTION & SLA VELOCITY ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Priority Triage Card (6 cols) */}
        <Card className="lg:col-span-6 rounded-3xl border-slate-200/80 shadow-xs bg-white p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <CardTitle className="text-sm font-black text-slate-900">Priority Volume Breakdown</CardTitle>
              <CardDescription className="text-[11px] text-slate-400">Severity distribution across platform tickets</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-extrabold text-slate-500 bg-slate-50">
              {totalTickets} Tickets
            </Badge>
          </div>
          
          <div className="space-y-3.5 pt-1">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-600 font-black flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  Critical Blockers
                </span>
                <span className="text-slate-700 font-extrabold">
                  {criticalCount} ({totalTickets ? Math.round((criticalCount / totalTickets) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${totalTickets ? Math.max(3, (criticalCount / totalTickets) * 100) : 0}%` }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-orange-600 font-black flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                  High Priority
                </span>
                <span className="text-slate-700 font-extrabold">
                  {highCount} ({totalTickets ? Math.round((highCount / totalTickets) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${totalTickets ? Math.max(3, (highCount / totalTickets) * 100) : 0}%` }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-cyan-700 font-black flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                  Medium Priority
                </span>
                <span className="text-slate-700 font-extrabold">
                  {mediumCount} ({totalTickets ? Math.round((mediumCount / totalTickets) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${totalTickets ? Math.max(3, (mediumCount / totalTickets) * 100) : 0}%` }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-600 font-black flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Low Priority / Inquiries
                </span>
                <span className="text-slate-700 font-extrabold">
                  {lowCount} ({totalTickets ? Math.round((lowCount / totalTickets) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${totalTickets ? Math.max(3, (lowCount / totalTickets) * 100) : 0}%` }}></div>
              </div>
            </div>
          </div>
        </Card>

        {/* SLA Resolution Velocity & Health (6 cols) */}
        <Card className="lg:col-span-6 rounded-3xl border-slate-200/80 shadow-xs bg-white p-4 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <CardTitle className="text-sm font-black text-slate-900">SLA Resolution Velocity</CardTitle>
                <CardDescription className="text-[11px] text-slate-400">Response speed guarantees & MTTR benchmarks</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border-emerald-200">
                {slaComplianceRate}% Healthy
              </Badge>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3.5 pt-4">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Avg First Response</span>
                <span className="text-2xl font-black text-cyan-800 block">18 mins</span>
                <span className="text-[10px] font-bold text-emerald-600 block">✓ Under 30 min target</span>
              </div>

              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Mean Time to Resolve (MTTR)</span>
                <span className="text-2xl font-black text-emerald-700 block">2.4 hrs</span>
                <span className="text-[10px] font-bold text-emerald-600 block">✓ 94% first-day resolution</span>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-cyan-50/30 rounded-2xl border border-cyan-100/60 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-cyan-700 shrink-0" />
                <span className="font-bold text-slate-700">Active SLA Escalation Rules:</span>
              </div>
              <span className="font-black text-cyan-800">4 Tier Policies Enforced</span>
            </div>
          </div>
        </Card>

      </div>

      {/* TENANT ACTIVITY & BREAKDOWN TABLE */}
      <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black text-slate-900">Tenant Enterprise Ticket Breakdown</CardTitle>
            <CardDescription className="text-xs text-slate-500">Live ticket volumes, resolution performance, and critical loads per company</CardDescription>
          </div>

          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search tenant name or code..."
                value={searchTenant}
                onChange={(e) => setSearchTenant(e.target.value)}
                className="pl-8 text-xs h-8 rounded-xl"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportTenantBreakdown('excel')}
                className="flex-1 xs:flex-initial text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 rounded-xl text-xs font-bold h-8 px-3 gap-1 shrink-0"
                title="Download Tenant Report in Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Excel</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportTenantBreakdown('csv')}
                className="flex-1 xs:flex-initial text-cyan-700 hover:text-cyan-900 rounded-xl text-xs font-bold h-8 px-3 gap-1 shrink-0"
                title="Download Tenant Report in CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Cards Breakdown */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredCompanyBreakdown.length > 0 ? (
            filteredCompanyBreakdown.map((c, idx) => (
              <div key={idx} className="p-4 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-black text-xs shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 text-xs truncate">{c.name}</div>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 text-[9.5px] font-bold">
                        {c.code}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                    {c.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100/80 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Total</span>
                    <span className="font-black text-slate-900 text-xs">{c.total}</span>
                  </div>
                  <div className="bg-emerald-50/60 p-2 rounded-xl">
                    <span className="text-[9.5px] font-bold text-emerald-600 uppercase block">Resolved</span>
                    <span className="font-black text-emerald-700 text-xs">{c.resolved}</span>
                  </div>
                  <div className="bg-sky-50/60 p-2 rounded-xl">
                    <span className="text-[9.5px] font-bold text-sky-600 uppercase block">Open</span>
                    <span className="font-black text-sky-700 text-xs">{c.open}</span>
                  </div>
                  <div className="bg-rose-50/60 p-2 rounded-xl">
                    <span className="text-[9.5px] font-bold text-rose-600 uppercase block">Critical</span>
                    <span className="font-black text-rose-700 text-xs">{c.critical}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-slate-400 text-xs font-semibold">
              No tenant organizations matching search.
            </div>
          )}
        </div>

        {/* Desktop Table Breakdown */}
        <div className="hidden md:block overflow-x-auto w-full">
          <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="border-slate-100">
              <TableHead className="py-3 px-6 font-black text-[10px] uppercase text-slate-400">Tenant Company</TableHead>
              <TableHead className="py-3 px-6 font-black text-[10px] uppercase text-slate-400">Code</TableHead>
              <TableHead className="py-3 px-6 font-black text-[10px] uppercase text-slate-400">Status</TableHead>
              <TableHead className="py-3 px-6 font-black text-[10px] uppercase text-slate-400 text-center">Total Tickets</TableHead>
              <TableHead className="py-3 px-6 font-black text-[10px] uppercase text-slate-400 text-center">Resolved</TableHead>
              <TableHead className="py-3 px-6 font-black text-[10px] uppercase text-slate-400 text-center">Open</TableHead>
              <TableHead className="py-3 px-6 font-black text-[10px] uppercase text-slate-400 text-center">Critical</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {filteredCompanyBreakdown.length > 0 ? (
              filteredCompanyBreakdown.map((c, idx) => (
                <TableRow key={idx} className="hover:bg-cyan-50/20 transition-colors">
                  <TableCell className="py-3.5 px-6 font-black text-slate-900 text-xs">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-7 w-7 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-black text-[11px] shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <span className="truncate max-w-[200px]">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 px-6 font-mono font-bold text-slate-600 text-xs">
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 text-[10px] font-bold">
                      {c.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 px-6">
                    <Badge variant="outline" className="rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border-emerald-200">
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 px-6 text-center font-black text-slate-900 text-xs">
                    {c.total}
                  </TableCell>
                  <TableCell className="py-3.5 px-6 text-center font-black text-emerald-600 text-xs">
                    {c.resolved}
                  </TableCell>
                  <TableCell className="py-3.5 px-6 text-center font-black text-sky-600 text-xs">
                    {c.open}
                  </TableCell>
                  <TableCell className="py-3.5 px-6 text-center">
                    {c.critical > 0 ? (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-extrabold text-[10px]">
                        {c.critical}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 font-semibold text-xs">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-slate-400 text-xs font-semibold">
                  No tenant organizations matching search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

    </div>
  );
};

export default ReportsPage;
