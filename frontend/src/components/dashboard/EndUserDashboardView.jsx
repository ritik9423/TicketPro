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
  Search, 
  Star, 
  Plus, 
  BookOpen, 
  Megaphone, 
  HelpCircle, 
  ChevronRight, 
  Sparkles, 
  ArrowUpRight,
  ShieldCheck,
  MessageSquare,
  FileText,
  LifeBuoy,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { CsatRatingModal } from '@/components/common/CsatRatingModal';

const EndUserDashboardView = ({ stats, user }) => {
  const navigate = useNavigate();
  const [kbQuery, setKbQuery] = useState('');
  const [csatModalTicket, setCsatModalTicket] = useState(null);
  const [ticketFilter, setTicketFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'RESOLVED'

  const allTickets = Array.isArray(stats?.allTickets) ? stats.allTickets : [];
  const userEmail = (user?.email || '').toLowerCase();
  const userIdStr = String(user?.id || '');

  // Tickets created specifically by this end user
  const myTickets = allTickets.filter(t => {
    return (userIdStr && t.createdById && String(t.createdById) === userIdStr) ||
           (userIdStr && t.createdBy?.id && String(t.createdBy.id) === userIdStr) ||
           (userEmail && t.creatorEmail && t.creatorEmail.toLowerCase() === userEmail) ||
           (userEmail && t.userEmail && t.userEmail.toLowerCase() === userEmail) ||
           (userEmail && t.customerEmail && t.customerEmail.toLowerCase() === userEmail) ||
           (userEmail && t.createdBy?.email && t.createdBy.email.toLowerCase() === userEmail) ||
           (!t.createdBy && !t.createdById);
  });

  // Authoritative fallback: if allTickets was already scoped for this customer, display allTickets
  const displayTickets = myTickets.length > 0 ? myTickets : allTickets;

  const openTickets = displayTickets.filter(t => t.status === 'OPEN' || t.status === 'NEW');
  const inProgressTickets = displayTickets.filter(t => t.status === 'IN_PROGRESS');
  const resolvedTickets = displayTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');

  const filteredTickets = displayTickets.filter(t => {
    if (ticketFilter === 'ACTIVE') return t.status === 'OPEN' || t.status === 'NEW' || t.status === 'IN_PROGRESS';
    if (ticketFilter === 'RESOLVED') return t.status === 'RESOLVED' || t.status === 'CLOSED';
    return true;
  });

  const handleKbSearch = (e) => {
    e.preventDefault();
    if (kbQuery.trim()) {
      navigate(`/kb?search=${encodeURIComponent(kbQuery.trim())}`);
    } else {
      navigate('/kb');
    }
  };

  const getStatusBadge = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'RESOLVED':
      case 'CLOSED':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/80 text-[10px] font-semibold px-2 py-0">
            Resolved
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200/80 text-[10px] font-semibold px-2 py-0">
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200/80 text-[10px] font-semibold px-2 py-0">
            {status || 'Open'}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* SHADCN MODERN CUSTOMER HERO CARD */}
      <Card className="rounded-2xl border border-border/70 shadow-xs bg-card overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 px-2.5 py-0.5 text-xs font-semibold border-primary/30 bg-primary/10 text-primary">
                <Sparkles className="h-3 w-3" />
                Customer Support Hub
              </Badge>
              <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
                {user?.companyName || user?.companyCode || 'TicketPro Workspace'}
              </Badge>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Hi {user?.name || 'there'}, how can we help you today?
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track your active requests in real-time, browse self-service guides, or create a new support ticket.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              size="default"
              onClick={() => navigate('/tickets?create=true')}
              className="gap-2 rounded-xl bg-primary text-primary-foreground shadow-xs font-semibold hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span>New Support Ticket</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* SEARCH / KNOWLEDGE BASE BAR */}
      <Card className="rounded-2xl border border-border/70 shadow-xs bg-card p-2">
        <form onSubmit={handleKbSearch} className="relative flex items-center">
          <Search className="h-4 w-4 absolute left-3.5 text-muted-foreground" />
          <Input
            type="text"
            value={kbQuery}
            onChange={(e) => setKbQuery(e.target.value)}
            placeholder="Search FAQs, system guides, error solutions, or how-to articles..."
            className="h-11 pl-10 pr-24 rounded-xl text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent placeholder:text-muted-foreground/70"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold"
          >
            Search FAQ
          </Button>
        </form>
      </Card>

      {/* QUICK ACTIONS ROW (3 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Action 1: Create Ticket */}
        <div
          onClick={() => navigate('/tickets?create=true')}
          className="p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group flex items-start gap-3.5"
        >
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
              <span>Submit a Ticket</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Report an IT, billing, or equipment issue to our team.
            </p>
          </div>
        </div>

        {/* Action 2: Knowledge Base */}
        <div
          onClick={() => navigate('/kb')}
          className="p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group flex items-start gap-3.5"
        >
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground group-hover:text-purple-600 transition-colors flex items-center gap-1">
              <span>Knowledge Base</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Find instant answers with step-by-step resolution guides.
            </p>
          </div>
        </div>

        {/* Action 3: Announcements */}
        <div
          onClick={() => navigate('/announcements')}
          className="p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group flex items-start gap-3.5"
        >
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 font-bold group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground group-hover:text-amber-600 transition-colors flex items-center gap-1">
              <span>Announcements</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Check scheduled maintenance and organization notices.
            </p>
          </div>
        </div>
      </div>

      {/* SHADCN STATUS KPI CARDS (4 COLS MATCHING DESIGN & ACCENTS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        
        {/* KPI 1: My Requests (Blue Theme) */}
        <div 
          onClick={() => setTicketFilter('ALL')}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group flex flex-col justify-between space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9.5 w-9.5 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Ticket className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                  My Requests
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                  All submitted support tickets
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60 shrink-0">
              Total
            </span>
          </div>

          <div className="pt-0.5">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {myTickets.length}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 text-teal-600 dark:text-teal-400" />
              All-time
            </span>
            <span className="text-[10.5px] text-slate-400 font-medium">
              ticket submission history
            </span>
          </div>
        </div>

        {/* KPI 2: Awaiting Review (Teal Theme) */}
        <div 
          onClick={() => setTicketFilter('ACTIVE')}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-white to-teal-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 transition-all cursor-pointer group flex flex-col justify-between space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9.5 w-9.5 rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                  Awaiting Review
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                  Newly submitted tickets in queue
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/80 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              Active
            </span>
          </div>

          <div className="pt-0.5">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {openTickets.length}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/60 px-2 py-0.5 rounded-full">
              <TrendingDown className="h-3 w-3 text-teal-600 dark:text-teal-400" />
              Queued
            </span>
            <span className="text-[10.5px] text-slate-400 font-medium">
              pending agent triage
            </span>
          </div>
        </div>

        {/* KPI 3: In Progress (Amber Theme) */}
        <div 
          onClick={() => setTicketFilter('ACTIVE')}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer group flex flex-col justify-between space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9.5 w-9.5 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                  In Progress
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                  Assigned agents actively working on a fix
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60 shrink-0">
              Working
            </span>
          </div>

          <div className="pt-0.5">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {inProgressTickets.length}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
              <Activity className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              Active
            </span>
            <span className="text-[10.5px] text-slate-400 font-medium">
              work in progress
            </span>
          </div>
        </div>

        {/* KPI 4: Resolved Issues (Emerald Theme) */}
        <div 
          onClick={() => setTicketFilter('RESOLVED')}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-white to-emerald-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group flex flex-col justify-between space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-9.5 w-9.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11.5px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                  Resolved Issues
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
                  Solutions delivered successfully
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60 shrink-0">
              Closed
            </span>
          </div>

          <div className="pt-0.5">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {resolvedTickets.length}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              {myTickets.length > 0 ? `${Math.round((resolvedTickets.length / myTickets.length) * 100)}%` : '100%'}
            </span>
            <span className="text-[10.5px] text-slate-400 font-medium">
              resolution success rate
            </span>
          </div>
        </div>

      </div>

      {/* TWO COLUMN SECTION: MY TICKETS (7 COLS) + POPULAR KB & FAQS (5 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: MY TICKETS (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="rounded-2xl border border-border/70 shadow-xs bg-card">
            <CardHeader className="p-5 pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span>My Support Requests</span>
                    </CardTitle>
                    <Badge variant="secondary" className="font-semibold text-xs rounded-full px-2">
                      {filteredTickets.length}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Track updates and responses for your tickets
                  </CardDescription>
                </div>

                {/* Filter Tabs */}
                <div className="inline-flex h-8 items-center justify-center rounded-lg bg-muted/80 p-1 text-muted-foreground self-start sm:self-auto">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'ACTIVE', label: 'Active' },
                    { id: 'RESOLVED', label: 'Resolved' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setTicketFilter(tab.id)}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-0.5 text-xs font-semibold transition-all cursor-pointer ${
                        ticketFilter === tab.id
                          ? 'bg-background text-foreground shadow-2xs font-bold'
                          : 'hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredTickets.length === 0 ? (
                <div className="py-14 text-center space-y-3 px-4">
                  <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">No Support Requests Found</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {ticketFilter === 'ALL'
                      ? 'You have not submitted any tickets yet. If you need any assistance, click the button below.'
                      : `You have no tickets under "${ticketFilter}".`}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate('/tickets?create=true')}
                    className="gap-1.5 rounded-xl font-semibold mt-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create a Ticket</span>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredTickets.map(ticket => {
                    const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
                    const hasRated = !!(ticket.satisfactionRating || localStorage.getItem(`csat_rating_${ticket.id}`));
                    
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer group"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              {ticket.ticketNumber || `#TK-${ticket.id}`}
                            </span>
                            {getStatusBadge(ticket.status)}
                            {ticket.categoryName && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground rounded-md px-1.5 py-0 border-border/70">
                                {ticket.categoryName}
                              </Badge>
                            )}
                          </div>

                          <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {ticket.subject}
                          </h4>

                          <p className="text-xs text-muted-foreground">
                            Assigned Agent: <strong className="font-medium text-foreground">{ticket.assignedAgent || ticket.assignedTo?.name || 'Support Team Specialist'}</strong> • {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Recently'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* CSAT Rating Button for Resolved Tickets */}
                          {isResolved && (
                            <Button
                              size="sm"
                              variant={hasRated ? "secondary" : "default"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCsatModalTicket(ticket);
                              }}
                              className={`h-8 px-2.5 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer ${
                                hasRated 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                              }`}
                            >
                              <Star className={`h-3.5 w-3.5 ${hasRated ? 'fill-emerald-600 text-emerald-600' : 'fill-white'}`} />
                              <span>{hasRated ? 'Rated ★' : 'Rate Resolution'}</span>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tickets/${ticket.id}`);
                            }}
                            className="h-8 px-3 rounded-lg text-xs font-semibold"
                          >
                            Details
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

        {/* RIGHT COLUMN: SELF-SERVICE FAQS & GUIDES (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-2xl border border-border/70 shadow-xs bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span>Self-Service FAQ Guides</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Instant answers to frequent questions
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/kb')}
                  className="text-xs font-semibold text-primary hover:text-primary/90 p-0 h-auto cursor-pointer"
                >
                  Browse All
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5">
              {[
                { title: 'How to Reset Your Single Sign-On (SSO) Password', category: 'Security' },
                { title: 'Connecting to Corporate VPN on Windows & Mac', category: 'Network' },
                { title: 'Requesting Laptop Accessories & Hardware Upgrades', category: 'Hardware' },
                { title: 'Email Configuration & Microsoft Outlook Setup', category: 'Email & Cloud' },
                { title: 'Software License Approvals & Activation Policy', category: 'Software' }
              ].map((article, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/kb?search=${encodeURIComponent(article.title)}`)}
                  className="p-3 rounded-xl border border-border/60 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5 pr-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {article.category}
                    </span>
                    <h5 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {article.title}
                    </h5>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* NEED LIVE HELP NOTICE */}
          <Card className="rounded-2xl border border-border/70 shadow-xs bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                <LifeBuoy className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Need Help from an Expert?
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Our IT & Customer Support engineers are online to assist you.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/tickets?create=true')}
              className="w-full rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Raise Support Ticket Now</span>
            </Button>
          </Card>
        </div>

      </div>

      {/* CSAT MODAL FOR RATING COMPLETED TICKETS */}
      {csatModalTicket && (
        <CsatRatingModal
          isOpen={!!csatModalTicket}
          onClose={() => setCsatModalTicket(null)}
          ticket={csatModalTicket}
          onSubmitSuccess={() => {
            setCsatModalTicket(null);
          }}
        />
      )}
    </div>
  );
};

export default EndUserDashboardView;
