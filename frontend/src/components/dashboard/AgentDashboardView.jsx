import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Ticket, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Star, 
  Zap, 
  ArrowUpRight, 
  Building2, 
  Megaphone, 
  BookOpen, 
  Flame,
  Plus,
  Inbox,
  Search,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { api } from '@/services/api';
import { liveChannel } from '@/utils/liveChannel';

const AgentDashboardView = ({ stats, user, onTicketClaimed }) => {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'URGENT' | 'OPEN' | 'IN_PROGRESS'
  const [searchQuery, setSearchQuery] = useState('');
  const [claimingId, setClaimingId] = useState(null);

  const allTickets = Array.isArray(stats?.allTickets) ? stats.allTickets : [];
  const userDept = (user?.department || '').toLowerCase();
  const userName = (user?.name || '').toLowerCase();
  const userIdStr = String(user?.id || '');

  // Tickets assigned specifically to this agent
  const myAssignedTickets = allTickets.filter(t => {
    return (t.assignedToId && String(t.assignedToId) === userIdStr) ||
           (t.assignedTo?.id && String(t.assignedTo.id) === userIdStr) ||
           (t.assignedAgent && t.assignedAgent.toLowerCase().includes(userName)) ||
           (t.assignedTo?.name && t.assignedTo.name.toLowerCase().includes(userName));
  });

  // Department unassigned tickets (can be claimed by this agent)
  const departmentUnassignedTickets = allTickets.filter(t => {
    const isAssigned = !!(t.assignedToId || t.assignedTo?.id || t.assignedAgent);
    if (isAssigned) return false;
    const tDept = (t.department || t.categoryName || t.category?.targetDepartment || '').toLowerCase();
    if (!userDept) return true;
    return tDept.includes(userDept.substring(0, 4)) || userDept.includes(tDept.substring(0, 4));
  });

  // Compute Agent KPI counts
  const activeAssigned = myAssignedTickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'NEW');
  const urgentCount = myAssignedTickets.filter(t => 
    ['URGENT', 'HIGH', 'CRITICAL'].includes((t.priority || '').toUpperCase()) && 
    t.status !== 'RESOLVED' && t.status !== 'CLOSED'
  ).length;
  const resolvedCount = myAssignedTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const csatRating = stats?.csatAverage || 4.9;

  // Filter assigned list for worklist view
  const filteredWorklist = myAssignedTickets.filter(t => {
    if (filterTab === 'URGENT' && !['URGENT', 'HIGH', 'CRITICAL'].includes((t.priority || '').toUpperCase())) return false;
    if (filterTab === 'OPEN' && !(t.status === 'OPEN' || t.status === 'NEW')) return false;
    if (filterTab === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSub = (t.subject || '').toLowerCase().includes(q);
      const matchNum = (t.ticketNumber || `#TK-${t.id}`).toLowerCase().includes(q);
      const matchReq = (t.creatorName || t.userEmail || '').toLowerCase().includes(q);
      return matchSub || matchNum || matchReq;
    }
    return true;
  });

  const handleClaimTicket = async (ticket, e) => {
    if (e) e.stopPropagation();
    try {
      setClaimingId(ticket.id);
      await api.put(`/tickets/${ticket.id}`, {
        assignedToId: user.id,
        status: ticket.status === 'NEW' ? 'OPEN' : ticket.status
      });

      liveChannel.broadcast('TICKET_UPDATED', { ticketId: ticket.id, action: 'CLAIM', assignedToId: user.id });
      if (onTicketClaimed) onTicketClaimed();
    } catch (_err) {
      console.error('Failed to claim ticket', _err);
    } finally {
      setClaimingId(null);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch ((priority || '').toUpperCase()) {
      case 'URGENT':
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/80 dark:bg-slate-900 dark:text-slate-400';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400';
      case 'ON_HOLD':
        return 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-400';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-400';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 text-left">
      {/* SHADCN MODERN TOP HERO CARD */}
      <Card className="rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 px-2.5 py-0.5 text-xs font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Support Desk • Active
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs font-semibold px-2.5 py-0.5">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                {user?.department || 'Support Specialist'}
              </Badge>
            </div>
            
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Welcome back, {user?.name || 'Agent'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                You have <span className="font-semibold text-foreground">{activeAssigned.length} assigned tickets</span> requiring your attention today.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate('/tickets')}
              className="gap-2 rounded-xl shadow-2xs font-semibold"
            >
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <span>Full Queue</span>
            </Button>
            <Button
              size="default"
              onClick={() => navigate('/tickets?create=true')}
              className="gap-2 rounded-xl bg-primary text-primary-foreground shadow-xs font-semibold hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span>Create Ticket</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* SHADCN KPI METRICS GRID (MATCHING DESIGN & ACCENTS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        
        {/* KPI 1: Assigned to Me (Blue Theme) */}
        <div 
          onClick={() => navigate('/tickets')}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group flex flex-col justify-between space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9.5 w-9.5 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Ticket className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                  Assigned to Me
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                  Active open or in progress
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60 shrink-0">
              Assigned
            </span>
          </div>

          <div className="pt-0.5">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {activeAssigned.length}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 text-teal-600 dark:text-teal-400" />
              Active
            </span>
            <span className="text-[10.5px] text-slate-400 font-medium">
              pending your action
            </span>
          </div>
        </div>

        {/* KPI 2: Urgent Priority (Teal Theme) */}
        <div 
          onClick={() => navigate('/tickets?priority=HIGH')}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-white to-teal-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 transition-all cursor-pointer group flex flex-col justify-between space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9.5 w-9.5 rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Flame className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                  High / Urgent
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                  Priority SLA escalation targets
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              Urgent
            </span>
          </div>

          <div className="pt-0.5">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {urgentCount}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60 px-2 py-0.5 rounded-full">
              <TrendingDown className="h-3 w-3 text-teal-600 dark:text-teal-400" />
              SLA Priority
            </span>
            <span className="text-[10.5px] text-slate-400 font-medium">
              immediate response
            </span>
          </div>
        </div>

        {/* KPI 3: CSAT Performance (Amber Theme) */}
        <div 
          onClick={() => navigate('/reports')}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer group flex flex-col justify-between space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9.5 w-9.5 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Star className="h-4.5 w-4.5 fill-amber-500/20" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                  CSAT Performance
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                  Customer satisfaction score
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60 shrink-0">
              Rating
            </span>
          </div>

          <div className="pt-0.5">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-baseline gap-1.5">
              <span>{csatRating}</span>
              <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">/ 5.0</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
              ★ {csatRating >= 4.5 ? 'Excellent' : 'Good'}
            </span>
            <span className="text-[10.5px] text-slate-400 font-medium">
              verified feedback
            </span>
          </div>
        </div>

        {/* KPI 4: Resolved by Me (Emerald Theme) */}
        <div 
          onClick={() => navigate('/tickets?status=RESOLVED')}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-white to-emerald-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group flex flex-col justify-between space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9.5 w-9.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                  Resolved by Me
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                  Successful resolutions recorded
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60 shrink-0">
              Closed
            </span>
          </div>

          <div className="pt-0.5">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {resolvedCount}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              +33%
            </span>
            <span className="text-[10.5px] text-slate-400 font-medium">
              resolved cases
            </span>
          </div>
        </div>

      </div>

      {/* TWO COLUMN WORKSPACE: ACTIVE WORKLIST + DEPARTMENT QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        
        {/* LEFT COLUMN: ACTIVE WORKLIST (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="rounded-2xl border border-border/70 shadow-xs bg-card">
            <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span>My Active Worklist</span>
                    </CardTitle>
                    <Badge variant="secondary" className="font-semibold text-xs rounded-full px-2">
                      {filteredWorklist.length}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Assigned tickets currently pending your action
                  </CardDescription>
                </div>

                {/* Segmented Filter Pills */}
                <div className="inline-flex h-8 items-center justify-center rounded-xl bg-muted/80 p-0.5 text-muted-foreground self-start sm:self-auto">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'URGENT', label: 'Urgent' },
                    { id: 'OPEN', label: 'Open' },
                    { id: 'IN_PROGRESS', label: 'In Progress' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterTab(tab.id)}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                        filterTab === tab.id
                          ? 'bg-background text-foreground shadow-2xs font-bold'
                          : 'hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Search within Worklist */}
              <div className="pt-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by ticket #, subject, or requester name..."
                    className="h-8 pl-8 pr-3 rounded-xl text-[11.5px] bg-muted/40 border-border/60 focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredWorklist.length === 0 ? (
                <div className="py-10 text-center space-y-2 px-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Your Worklist is All Clear</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {searchQuery.trim()
                      ? `No assigned tickets matching "${searchQuery}".`
                      : filterTab === 'ALL'
                        ? 'No active tickets currently assigned to you. You can claim new unassigned tickets from your department queue on the right.'
                        : `No tickets matching "${filterTab}" filter.`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredWorklist.map(ticket => {
                    const priorityClass = getPriorityBadgeClass(ticket.priority);
                    const statusClass = getStatusBadgeClass(ticket.status);
                    const requester = ticket.creatorName || ticket.userEmail || ticket.createdBy?.name || 'Customer';
                    const initials = requester.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CU';

                    return (
                      <div
                        key={ticket.id}
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                        className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/40 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="h-7.5 w-7.5 rounded-lg bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {initials}
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11.5px] font-bold text-primary">
                                {ticket.ticketNumber || `#TK-${ticket.id}`}
                              </span>
                              <Badge variant="outline" className={`text-[9.5px] font-bold uppercase rounded-md px-1.5 py-0 border ${priorityClass}`}>
                                {ticket.priority || 'MEDIUM'}
                              </Badge>
                              <Badge variant="outline" className={`text-[9.5px] font-bold uppercase rounded-md px-1.5 py-0 border ${statusClass}`}>
                                {ticket.status}
                              </Badge>
                              <Badge variant="outline" className="text-[9.5px] font-extrabold rounded-md px-1.5 py-0 border bg-amber-50 text-amber-800 border-amber-200 shadow-2xs gap-0.5">
                                <span>⚡</span> Auto-Assigned
                              </Badge>
                            </div>

                            <h4 className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                              {ticket.subject}
                            </h4>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span>Requester: <strong className="font-medium text-foreground">{requester}</strong></span>
                              <span>•</span>
                              <span>{ticket.department || ticket.categoryName || 'Support'}</span>
                              <span>•</span>
                              <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Recent'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tickets/${ticket.id}`);
                            }}
                            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-all cursor-pointer"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: DEPARTMENT UNASSIGNED QUEUE (4 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-2xl border border-border/70 shadow-xs bg-card">
            <CardHeader className="p-3.5 pb-2.5 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>Dept Unassigned Queue</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Available for claiming
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-bold rounded-full px-2.5 py-0.5 bg-amber-500/10 text-amber-700 border-amber-500/30">
                  {departmentUnassignedTickets.length} Waiting
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
              {departmentUnassignedTickets.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-medium text-muted-foreground">
                    No unassigned tickets in your department queue right now.
                  </p>
                </div>
              ) : (
                departmentUnassignedTickets.slice(0, 5).map(ticket => {
                  const priorityClass = getPriorityBadgeClass(ticket.priority);
                  return (
                    <div
                      key={ticket.id}
                      className="p-2.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-foreground">
                          {ticket.ticketNumber || `#TK-${ticket.id}`}
                        </span>
                        <Badge variant="outline" className={`text-[9.5px] font-bold uppercase rounded-md px-1.5 py-0 border ${priorityClass}`}>
                          {ticket.priority || 'MEDIUM'}
                        </Badge>
                      </div>

                      <h5 className="text-[11.5px] font-semibold text-foreground line-clamp-2 leading-snug">
                        {ticket.subject}
                      </h5>

                      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10.5px] text-muted-foreground">
                        <span className="truncate max-w-[120px]">
                          {ticket.creatorName || ticket.userEmail || 'Customer'}
                        </span>
                        <Button
                          size="sm"
                          disabled={claimingId === ticket.id}
                          onClick={(e) => handleClaimTicket(ticket, e)}
                          className="h-6.5 px-2 rounded-md text-[10.5px] font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
                        >
                          <Zap className="h-3 w-3" />
                          <span>{claimingId === ticket.id ? 'Claiming...' : 'Claim'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* AGENT QUICK RESOURCES CARD */}
          <Card className="rounded-2xl border border-border/70 shadow-xs bg-card">
            <CardHeader className="p-3 pb-1.5">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>Agent Quick Links</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0.5 space-y-1.5">
              <button
                type="button"
                onClick={() => navigate('/kb')}
                className="w-full text-left p-2 rounded-lg border border-border/60 hover:bg-muted/60 transition-colors flex items-center justify-between text-[11.5px] font-semibold text-foreground cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Standard Operating Procedures</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/announcements')}
                className="w-full text-left p-2 rounded-lg border border-border/60 hover:bg-muted/60 transition-colors flex items-center justify-between text-[11.5px] font-semibold text-foreground cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Team Announcements</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AgentDashboardView;
