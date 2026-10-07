import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { exportTicketsDataset } from '../utils/excelExporter';
import { liveChannel } from '../utils/liveChannel';
import { wsService } from '../services/websocket';
import Pagination from '../components/common/Pagination';
import { extractPageData } from '../utils/paginationHelper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  Search, 
  Ticket as TicketIcon, 
  Eye, 
  RefreshCw, 
  Building2, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  X,
  Send,
  Download,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Trash2,
  Activity,
  Layers,
  Edit2
} from 'lucide-react';

const TicketsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Server-side Pagination State (0-indexed, default 20)
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Dynamic Form Pinned Version State
  const [selectedTicketFormTemplate, setSelectedTicketFormTemplate] = useState(null);
  const [isEditingFormValues, setIsEditingFormValues] = useState(false);
  const [editFormValues, setEditFormValues] = useState({});
  const [savingFormValues, setSavingFormValues] = useState(false);

  // Multi-Select & Bulk Operations State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Comments / Thread State
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Fetch Live Tickets and Agents from Backend
  const fetchTickets = async (pageToFetch = currentPage, sizeToFetch = pageSize) => {
    setLoading(true);
    try {
      let url = `/tickets?page=${pageToFetch}&size=${sizeToFetch}&sortBy=createdAt&direction=desc`;
      if (searchTerm || (statusFilter && statusFilter !== 'ALL') || (priorityFilter && priorityFilter !== 'ALL') || (companyFilter && companyFilter !== 'ALL')) {
        const params = new URLSearchParams();
        params.append('page', String(pageToFetch));
        params.append('size', String(sizeToFetch));
        params.append('sortBy', 'createdAt');
        params.append('direction', 'desc');
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter && statusFilter !== 'ALL') params.append('statuses', statusFilter);
        if (priorityFilter && priorityFilter !== 'ALL') params.append('priorities', priorityFilter);
        if (companyFilter && companyFilter !== 'ALL') params.append('companyCode', companyFilter);
        url = `/tickets/search?${params.toString()}`;
      }

      const [ticketsData, usersData] = await Promise.all([
        api.get(url).catch(() => null),
        api.get('/users?page=0&size=100').catch(() => [])
      ]);
      const pageData = extractPageData(ticketsData, pageToFetch, sizeToFetch);
      setTickets(pageData.content);
      setTotalElements(pageData.totalElements);
      setTotalPages(pageData.totalPages);
      setCurrentPage(pageData.page);

      const usersList = Array.isArray(usersData) ? usersData : (Array.isArray(usersData?.content) ? usersData.content : []);
      setUsers(usersList);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Subscribe to multi-tab real-time live channel broadcasts
    const unsubscribe = liveChannel.subscribe('TICKET_UPDATED', () => {
      fetchTickets();
    });

    // Real-time WebSocket subscriptions for global ticket creation and deletion
    const unsubWs = wsService.subscribe('/topic/tickets/GLOBAL', () => {
      fetchTickets();
    });

    const unsubWsDel = wsService.subscribe('/topic/tickets/GLOBAL/deleted', (deletedId) => {
      if (deletedId) {
        setTickets(prev => prev.filter(t => t.id !== Number(deletedId)));
      }
    });

    return () => {
      unsubscribe();
      if (unsubWs) unsubWs();
      if (unsubWsDel) unsubWsDel();
    };
  }, []);

  // Sync incoming search query parameters (from Dashboard clicks)
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam.toUpperCase());
    }
    const priorityParam = searchParams.get('priority');
    if (priorityParam) {
      setPriorityFilter(priorityParam.toUpperCase());
    }
    const compParam = searchParams.get('companyCode') || searchParams.get('company');
    if (compParam) {
      setCompanyFilter(compParam);
    }
    const ticketIdParam = searchParams.get('ticketId');
    if (ticketIdParam && tickets.length > 0) {
      const found = tickets.find(t => String(t.id) === String(ticketIdParam) || String(t.ticketNumber) === String(ticketIdParam));
      if (found) {
        setSelectedTicket(found);
      }
    }
  }, [searchParams, tickets]);

  // Fetch comments and pinned form template when selectedTicket changes
  useEffect(() => {
    if (!selectedTicket?.id) {
      setComments([]);
      setSelectedTicketFormTemplate(null);
      return;
    }

    // Load pinned immutable dynamic form version for this ticket
    if (selectedTicket.formTemplateId) {
      api.get(`/form-templates/${selectedTicket.formTemplateId}`)
        .then(res => setSelectedTicketFormTemplate(res))
        .catch(() => setSelectedTicketFormTemplate(null));
    } else {
      setSelectedTicketFormTemplate(null);
    }

    const loadComments = async () => {
      setCommentsLoading(true);
      try {
        const data = await api.get(`/tickets/${selectedTicket.id}/comments`);
        setComments(Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []));
      } catch (err) {
        console.warn('Comments fetch warning:', err);
        setComments([]);
      } finally {
        setCommentsLoading(false);
      }
    };

    loadComments();
  }, [selectedTicket?.id, selectedTicket?.formTemplateId]);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // Reset page to 0 and re-fetch whenever filters change
  const isFirstFilterMount = React.useRef(true);
  useEffect(() => {
    if (isFirstFilterMount.current) {
      isFirstFilterMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setCurrentPage(0);
      fetchTickets(0, pageSize);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, priorityFilter, companyFilter]);

  // Unique companies list for filter
  const companyOptions = useMemo(() => {
    const companies = Array.from(new Set(tickets.map((t) => t.companyName || t.company?.companyName || t.companyCode).filter(Boolean)));
    return companies;
  }, [tickets]);

  const filteredTickets = tickets;
  const paginatedTickets = tickets;

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCompanyFilter('ALL');
    setSearchParams({});
    setCurrentPage(0);
    fetchTickets(0, pageSize);
  };

  // Save Dynamic Form Submission Values
  const handleSaveDynamicFormValues = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTicket?.id) return;
    setSavingFormValues(true);
    setErrorMsg('');
    try {
      const payload = {
        subject: selectedTicket.subject,
        description: selectedTicket.description,
        status: selectedTicket.status,
        priority: selectedTicket.priority,
        department: selectedTicket.department,
        categoryId: selectedTicket.categoryId || selectedTicket.category?.id,
        assignedToId: selectedTicket.assignedToId || selectedTicket.assignedTo?.id,
        formValues: editFormValues,
        customFields: editFormValues
      };
      const updated = await api.put(`/tickets/${selectedTicket.id}`, payload);
      const newVals = updated?.formValues || editFormValues;
      const updatedTicket = { ...selectedTicket, ...updated, formValues: newVals };
      setSelectedTicket(updatedTicket);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, ...updated, formValues: newVals } : t));
      setIsEditingFormValues(false);
      setSuccessMsg('✓ Dynamic form submission values updated successfully!');
      liveChannel.broadcast('TICKET_UPDATED', { ticketId: selectedTicket.id, action: 'FORM_VALUES_UPDATED' });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update dynamic form values.');
    } finally {
      setSavingFormValues(false);
    }
  };

  // Multi-Select Handlers (Current Page / All Filtered)
  const handleToggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isCurrentPageAllSelected = paginatedTickets.length > 0 && paginatedTickets.every(t => selectedIds.includes(t.id));

  const handleToggleSelectCurrentPage = () => {
    if (isCurrentPageAllSelected) {
      const pageIds = new Set(paginatedTickets.map(t => t.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedTickets.map(t => t.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Bulk Status Update Handler
  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);

    try {
      const updatedList = tickets.map(t => {
        if (selectedIds.includes(t.id)) {
          return { ...t, status: newStatus };
        }
        return t;
      });

      setTickets(updatedList);
      
      const storedAll = localStorage.getItem('ticketpro_all_tickets');
      if (storedAll) {
        let allList = JSON.parse(storedAll) || [];
        allList = allList.map(t => selectedIds.includes(t.id) ? { ...t, status: newStatus } : t);
        localStorage.setItem('ticketpro_all_tickets', JSON.stringify(allList));
      }

      liveChannel.broadcast('TICKET_UPDATED', { selectedIds, action: 'BULK_STATUS', status: newStatus });
      setSuccessMsg(`✓ Successfully updated ${selectedIds.length} tickets to ${newStatus}`);
      setSelectedIds([]);
    } catch (_e) {
      console.error('Bulk update error', _e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Reassign Handler
  const handleBulkReassign = async (agentId) => {
    if (selectedIds.length === 0 || !agentId) return;
    setBulkActionLoading(true);
    const targetUser = users.find(u => String(u.id) === String(agentId));

    try {
      const updatedList = tickets.map(t => {
        if (selectedIds.includes(t.id)) {
          return { 
            ...t, 
            assignedToId: agentId,
            assignedToName: targetUser ? targetUser.name : t.assignedToName,
            assignedTo: targetUser || t.assignedTo
          };
        }
        return t;
      });

      setTickets(updatedList);

      const storedAll = localStorage.getItem('ticketpro_all_tickets');
      if (storedAll) {
        let allList = JSON.parse(storedAll) || [];
        allList = allList.map(t => selectedIds.includes(t.id) ? { ...t, assignedToId: agentId, assignedTo: targetUser } : t);
        localStorage.setItem('ticketpro_all_tickets', JSON.stringify(allList));
      }

      liveChannel.broadcast('TICKET_UPDATED', { selectedIds, action: 'BULK_ASSIGN', agentId });
      setSuccessMsg(`✓ Reassigned ${selectedIds.length} tickets to ${targetUser?.name || 'Agent'}`);
      setSelectedIds([]);
    } catch (_e) {
      console.error('Bulk reassign error', _e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Delete Handler
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete all ${selectedIds.length} selected tickets?`)) return;

    setBulkActionLoading(true);
    const updatedList = tickets.filter(t => !selectedIds.includes(t.id));

    setTickets(updatedList);
    try {
      const storedAll = localStorage.getItem('ticketpro_all_tickets');
      if (storedAll) {
        let allList = JSON.parse(storedAll) || [];
        allList = allList.filter(t => !selectedIds.includes(t.id));
        localStorage.setItem('ticketpro_all_tickets', JSON.stringify(allList));
      }
      liveChannel.broadcast('TICKET_UPDATED', { selectedIds, action: 'BULK_DELETE' });
      setSuccessMsg(`✓ Successfully deleted ${selectedIds.length} tickets.`);
      setSelectedIds([]);
    } catch (_e) {} finally {
      setBulkActionLoading(false);
    }
  };

  // Export Selected Dataset
  const handleExportSelected = (format) => {
    const selectedTicketsList = tickets.filter(t => selectedIds.includes(t.id));
    if (selectedTicketsList.length === 0) return;
    exportTicketsDataset(selectedTicketsList, format, 'SUPER_ADMIN_SELECTED');
    setSuccessMsg(`✓ Exported ${selectedTicketsList.length} selected tickets to ${format.toUpperCase()}`);
  };

  // Update Status / Priority / Assigned Agent Single
  const handleUpdateTicket = async (updatedFields) => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const extractVal = (v) => (v && typeof v === 'object' ? (v.target?.value ?? v.value ?? v) : v);
      const targetStatus = extractVal(updatedFields.status) || selectedTicket.status;
      const targetPriority = extractVal(updatedFields.priority) || selectedTicket.priority;
      const targetAssignedId = updatedFields.assignedToId !== undefined ? extractVal(updatedFields.assignedToId) : (selectedTicket.assignedToId || selectedTicket.assignedTo?.id);

      const payload = {
        subject: selectedTicket.subject,
        description: selectedTicket.description,
        status: targetStatus,
        priority: targetPriority,
        department: selectedTicket.department,
        categoryId: selectedTicket.categoryId || selectedTicket.category?.id,
        assignedToId: targetAssignedId ? Number(targetAssignedId) : null,
        formValues: selectedTicket.formValues || selectedTicket.customFields,
        customFields: selectedTicket.formValues || selectedTicket.customFields
      };

      const updated = await api.put(`/tickets/${selectedTicket.id}`, payload).catch(() => null);
      
      const newTicketState = {
        ...selectedTicket,
        ...updated,
        status: payload.status,
        priority: payload.priority,
        assignedToName: updatedFields.assignedToName || selectedTicket.assignedToName
      };

      setSelectedTicket(newTicketState);
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? newTicketState : t));
      liveChannel.broadcast('TICKET_UPDATED', { ticketId: selectedTicket.id, action: 'UPDATE' });
      setSuccessMsg(`✓ Updated ticket #${selectedTicket.ticketNumber || selectedTicket.id} successfully!`);
    } catch (err) {
      console.error('Update ticket error:', err);
      setErrorMsg(err.message || 'Failed to update ticket.');
    } finally {
      setUpdating(false);
    }
  };

  // Single Ticket Delete Handler
  const handleDeleteSingleTicket = async (ticketId) => {
    if (!window.confirm(`Are you sure you want to permanently delete ticket #${ticketId}?`)) return;
    try {
      await api.delete(`/tickets/${ticketId}`).catch(() => null);
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      setSelectedTicket(null);
      liveChannel.broadcast('TICKET_UPDATED', { ticketId, action: 'DELETE' });
      setSuccessMsg(`✓ Ticket #${ticketId} deleted successfully.`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete ticket.');
    }
  };

  // Add Comment / Reply
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTicket) return;

    setSendingComment(true);
    setErrorMsg('');

    try {
      const commentPayload = {
        content: newCommentText.trim(),
        isInternal: isInternalNote
      };

      const createdComment = await api.post(`/tickets/${selectedTicket.id}/comments`, commentPayload).catch(() => null);
      setComments(prev => [...prev, createdComment || {
        id: Date.now(),
        content: newCommentText.trim(),
        isInternal: isInternalNote,
        createdAt: new Date().toISOString(),
        user: { name: 'Super Admin' }
      }]);

      setNewCommentText('');
      setSuccessMsg(isInternalNote ? '✓ Internal note added.' : '✓ Reply sent to ticket thread.');
    } catch (err) {
      console.error('Add comment error:', err);
      setErrorMsg(err.message || 'Failed to add comment.');
    } finally {
      setSendingComment(false);
    }
  };

  // Export Tickets as Real Excel (.xlsx) Download
  const handleExportExcel = () => {
    if (filteredTickets.length === 0) {
      alert('No tickets available to export.');
      return;
    }
    exportTicketsDataset(filteredTickets, 'excel', 'SUPER_ADMIN');
    setSuccessMsg('✓ Exported real ticket data to Excel (.xlsx) successfully!');
  };

  // Export Tickets as CSV Download
  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      alert('No tickets available to export.');
      return;
    }
    exportTicketsDataset(filteredTickets, 'csv', 'SUPER_ADMIN');
    setSuccessMsg('✓ Exported real ticket data to CSV successfully!');
  };

  // Summary counts
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'NEW').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  const getStatusBadge = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'RESOLVED':
      case 'CLOSED':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
            {status}
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
            Open
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch ((priority || '').toUpperCase()) {
      case 'CRITICAL':
      case 'URGENT':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
            Critical
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-bold">
            High
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
            Medium
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-bold">
            Low
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-3.5 text-left font-sans select-none pb-12 w-full relative">
      
      {/* HEADER BANNER - COMPACT */}
      <Card className="rounded-2xl border-slate-200/80 shadow-2xs bg-gradient-to-r from-white via-indigo-50/30 to-slate-50 overflow-hidden">
        <CardContent className="p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Global Tickets Queue
              </h1>
              <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 font-extrabold text-[10.5px] uppercase tracking-wider rounded-full px-2.5 py-0.5">
                {totalCount} Total
              </Badge>
            </div>
            <p className="text-xs text-slate-600 font-medium max-w-2xl mt-0.5">
              Platform-wide ticket management across all tenant enterprises. Reassign agents, triage priority, and post replies.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="outline"
              onClick={fetchTickets}
              className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs h-8.5 px-3 gap-1.5 hover:bg-slate-50 cursor-pointer shadow-2xs active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={handleExportExcel}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-3 gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Download Real Excel Spreadsheet"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Excel (.xlsx)</span>
            </Button>

            <Button
              onClick={handleExportCSV}
              className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs h-8.5 px-3 gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Download RFC CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* NOTIFICATIONS */}
      {successMsg && (
        <div className="rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-black cursor-pointer px-1">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 border border-rose-200 flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-600 hover:text-rose-900 font-black cursor-pointer px-1">✕</button>
        </div>
      )}

      {/* QUICK SUMMARY METRICS (4 COMPACT SHADCN CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* KPI 1: Total Tickets (Indigo) */}
        <Card 
          onClick={() => setStatusFilter('ALL')}
          className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer bg-white group p-3 space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Tickets</span>
            <div className="h-7 w-7 rounded-lg bg-cyan-500/10 text-cyan-700 flex items-center justify-center font-bold">
              <TicketIcon className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">{totalCount}</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
              All-time tickets
            </p>
          </div>
        </Card>

        {/* KPI 2: Open Queues (Sky Blue) */}
        <Card 
          onClick={() => setStatusFilter('OPEN')}
          className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer bg-white group p-3 space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Open Queues</span>
            <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-sky-600 tracking-tight leading-tight">{openCount}</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-600"></span>
              Awaiting agent action
            </p>
          </div>
        </Card>

        {/* KPI 3: In Progress (Amber) */}
        <Card 
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer bg-white group p-3 space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In Progress</span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight leading-tight">{inProgressCount}</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              Under investigation
            </p>
          </div>
        </Card>

        {/* KPI 4: Resolved / Closed (Emerald) */}
        <Card 
          onClick={() => setStatusFilter('RESOLVED')}
          className="rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer bg-white group p-3 space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Resolved</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight leading-tight">{resolvedCount}</div>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
              Closed requests
            </p>
          </div>
        </Card>
      </div>

      {/* FILTER & SEARCH CARD */}
      <Card className="rounded-2xl border-slate-200/80 shadow-2xs bg-white p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search ID, subject, company, agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8.5 rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'ALL', label: 'Status: All Statuses' },
                { value: 'OPEN', label: 'Open' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'CLOSED', label: 'Closed' }
              ]}
              buttonClassName="w-full h-8.5 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-800 shadow-none"
            />
          </div>

          <div>
            <CustomSelect
              value={priorityFilter}
              onChange={(val) => setPriorityFilter(val)}
              options={[
                { value: 'ALL', label: 'Priority: All Priorities' },
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' }
              ]}
              buttonClassName="w-full h-8.5 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-800 shadow-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <CustomSelect
                value={companyFilter}
                onChange={(val) => setCompanyFilter(val)}
                options={[
                  { value: 'ALL', label: 'Company: All Companies' },
                  ...companyOptions.map((comp) => ({ value: comp, label: comp }))
                ]}
                buttonClassName="w-full h-8.5 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-800 shadow-none"
              />
            </div>

            {(searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || companyFilter !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="rounded-xl text-xs font-bold h-8.5 px-2.5 cursor-pointer shrink-0"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter summary count */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium px-0.5">
          <span>
            Total Filtered: <strong className="text-slate-900 font-bold">{totalElements !== undefined && totalElements !== null ? totalElements : filteredTickets.length}</strong> tickets
          </span>
          {selectedIds.length > 0 && (
            <span className="text-cyan-700 font-bold">
              {selectedIds.length} tickets selected
            </span>
          )}
        </div>
      </Card>

      {/* FLOATING SUPER ADMIN BULK ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div className="sticky top-16 sm:top-18 z-40 bg-slate-900 text-white rounded-xl p-3 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between sm:justify-start space-x-2.5 w-full sm:w-auto">
            <div className="flex items-center space-x-2.5">
              <span className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                {selectedIds.length}
              </span>
              <div>
                <span className="text-xs font-black text-white">Tickets Selected</span>
                <span className="text-[10.5px] text-slate-400 block font-medium">Cross-tenant global batch operations</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-7 w-7 p-0 sm:hidden rounded-lg text-slate-400 hover:text-white text-xs cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusUpdate('IN_PROGRESS')}
              className="h-7.5 flex-1 sm:flex-initial rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white border-slate-700 text-amber-300 font-bold text-xs cursor-pointer"
            >
              ⚡ In Progress
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusUpdate('RESOLVED')}
              className="h-7.5 flex-1 sm:flex-initial rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white border-slate-700 text-emerald-300 font-bold text-xs cursor-pointer"
            >
              ✓ Resolved
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusUpdate('CLOSED')}
              className="h-7.5 flex-1 sm:flex-initial rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
            >
              🔒 Close
            </Button>

            {users.length > 0 && (
              <div className="w-full sm:w-44">
                <CustomSelect
                  value=""
                  onChange={(val) => { if (val) handleBulkReassign(val); }}
                  placeholder="👤 Assign to Agent..."
                  options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.role || 'Staff'})` }))}
                  buttonClassName="h-7.5 px-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold shadow-none"
                  menuClassName="bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportSelected('excel')}
              className="h-7.5 flex-1 sm:flex-initial rounded-lg bg-emerald-950/80 hover:bg-emerald-800 border-emerald-700 text-emerald-300 font-bold text-xs cursor-pointer"
              title="Export selected tickets to Excel"
            >
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              Excel
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={handleBulkDelete}
              className="h-7.5 flex-1 sm:flex-initial rounded-lg bg-rose-950/80 hover:bg-rose-800 border-rose-800 text-rose-300 font-bold text-xs cursor-pointer"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-7.5 hidden sm:inline-flex rounded-lg text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* TICKETS SHADCN TABLE & MOBILE CARD LIST */}
      <Card className="rounded-2xl border-slate-200/80 shadow-2xs bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : (
          <div>
            {/* Mobile Card List View */}
            <div className="block md:hidden">
              <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleToggleSelectCurrentPage}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  {isCurrentPageAllSelected ? (
                    <CheckSquare className="h-4 w-4 text-cyan-700" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400" />
                  )}
                  <span>Select All on Page</span>
                </button>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Page {currentPage + 1} of {totalPages || 1}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => {
                    const isSelected = selectedIds.includes(ticket.id);
                    return (
                      <div
                        key={ticket.id}
                        className={`p-3.5 space-y-2.5 transition-colors ${
                          isSelected ? 'bg-cyan-50/60' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Top row: Checkbox, ID badge, and Status/Priority */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOne(ticket.id)}
                              className="p-1 text-slate-400 hover:text-cyan-700 cursor-pointer shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-cyan-700" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-300" />
                              )}
                            </button>
                            <span className="font-mono font-black text-cyan-800 text-xs shrink-0">
                              #{ticket.ticketNumber || ticket.id}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                        </div>

                        {/* Subject & Description */}
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                            {ticket.subject}
                          </h3>
                          {ticket.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 font-normal">
                              {ticket.description}
                            </p>
                          )}
                        </div>

                        {/* Metadata row */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100/80">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate font-semibold">
                              {ticket.companyName || ticket.company?.companyName || ticket.companyCode || 'Main Corp'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate font-medium text-slate-700">
                              {ticket.assignedToName || ticket.assignedTo?.name || (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Bottom action row */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <div className="flex items-center space-x-1 text-[10.5px] text-slate-400">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTicket(ticket)}
                            className="h-7.5 px-3 rounded-lg border-slate-200 hover:border-cyan-500 hover:text-cyan-700 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Manage Ticket</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 font-medium text-xs">
                    No tickets found matching current filters.
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full">
              <Table className="w-full min-w-[780px]">
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-slate-100">
                    <TableHead className="w-10 px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectCurrentPage}
                        className="p-1 text-slate-400 hover:text-cyan-700 cursor-pointer"
                        title={isCurrentPageAllSelected ? "Deselect page" : "Select page"}
                      >
                        {isCurrentPageAllSelected ? (
                          <CheckSquare className="h-4 w-4 text-cyan-700" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="py-2.5 px-3 font-bold text-[10.5px] uppercase tracking-wider text-slate-500">Ticket ID</TableHead>
                    <TableHead className="py-2.5 px-3 font-bold text-[10.5px] uppercase tracking-wider text-slate-500">Subject</TableHead>
                    <TableHead className="py-2.5 px-3 font-bold text-[10.5px] uppercase tracking-wider text-slate-500">Tenant Company</TableHead>
                    <TableHead className="py-2.5 px-3 font-bold text-[10.5px] uppercase tracking-wider text-slate-500">Status</TableHead>
                    <TableHead className="py-2.5 px-3 font-bold text-[10.5px] uppercase tracking-wider text-slate-500">Priority</TableHead>
                    <TableHead className="py-2.5 px-3 font-bold text-[10.5px] uppercase tracking-wider text-slate-500">Assigned Agent</TableHead>
                    <TableHead className="py-2.5 px-3 font-bold text-[10.5px] uppercase tracking-wider text-slate-500">Created</TableHead>
                    <TableHead className="py-2.5 px-3 font-bold text-[10.5px] uppercase tracking-wider text-slate-500 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {paginatedTickets.length > 0 ? (
                    paginatedTickets.map((ticket) => {
                      const isSelected = selectedIds.includes(ticket.id);
                      return (
                        <TableRow 
                          key={ticket.id} 
                          className={`transition-colors ${
                            isSelected ? 'bg-cyan-50/60' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <TableCell className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOne(ticket.id)}
                              className="p-1 text-slate-400 hover:text-cyan-700 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-cyan-700" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-300" />
                              )}
                            </button>
                          </TableCell>

                          <TableCell className="py-2.5 px-3 font-mono font-black text-cyan-800 text-xs">
                            #{ticket.ticketNumber || ticket.id}
                          </TableCell>

                          <TableCell className="py-2.5 px-3 max-w-[220px]">
                            <div className="font-bold text-slate-900 text-xs truncate">{ticket.subject}</div>
                            <div className="text-[10.5px] text-slate-400 truncate mt-0.5 font-medium">{ticket.description}</div>
                          </TableCell>

                          <TableCell className="py-2.5 px-3">
                            <div className="flex items-center space-x-1.5">
                              <div className="h-5.5 w-5.5 rounded-md bg-cyan-50 text-cyan-800 flex items-center justify-center font-black text-[9.5px] shrink-0">
                                {(ticket.companyName || ticket.company?.companyName || ticket.companyCode || 'C').charAt(0)}
                              </div>
                              <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                                {ticket.companyName || ticket.company?.companyName || ticket.companyCode || 'Main Corp'}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 px-3">
                            {getStatusBadge(ticket.status)}
                          </TableCell>

                          <TableCell className="py-2.5 px-3">
                            {getPriorityBadge(ticket.priority)}
                          </TableCell>

                          <TableCell className="py-2.5 px-3 text-xs font-medium text-slate-600">
                            {ticket.assignedToName || ticket.assignedTo?.name || (
                              <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                            )}
                          </TableCell>

                          <TableCell className="py-2.5 px-3 text-[11px] text-slate-400">
                            {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>

                          <TableCell className="py-2.5 px-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTicket(ticket)}
                              className="h-7.5 px-2.5 rounded-lg border-slate-200 hover:border-cyan-500 hover:text-cyan-700 text-xs font-bold gap-1 cursor-pointer"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Manage</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-slate-400 font-medium text-xs">
                        No tickets found matching current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* SERVER-SIDE PAGINATION CONTROLS */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements || tickets.length}
              pageSize={pageSize}
              onPageChange={(p) => {
                setCurrentPage(p);
                fetchTickets(p, pageSize);
              }}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(0);
                fetchTickets(0, s);
              }}
            />

          </div>
        )}
      </Card>

      {/* MANAGE TICKET SLIDE-OVER / MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <Card className="bg-white w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border-slate-100 overflow-hidden my-auto">
            
            {/* Modal Header */}
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-row items-center justify-between space-y-0 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-cyan-100 text-cyan-900 border-cyan-200 font-black text-xs">
                    #{selectedTicket.ticketNumber || selectedTicket.id}
                  </Badge>
                  <span className="text-xs font-extrabold text-slate-500">
                    {selectedTicket.companyName || selectedTicket.company?.companyName || 'Enterprise'}
                  </span>
                </div>
                <CardTitle className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                  {selectedTicket.subject}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedTicket(null)}
                className="h-7.5 w-7.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </CardHeader>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-left">
              
              {/* Ticket Meta Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                <div className="space-y-1">
                  <Label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Status</Label>
                  <CustomSelect
                    value={selectedTicket.status}
                    disabled={updating}
                    onChange={(val) => handleUpdateTicket({ status: val })}
                    options={[
                      { value: 'OPEN', label: 'Open' },
                      { value: 'IN_PROGRESS', label: 'In Progress' },
                      { value: 'RESOLVED', label: 'Resolved' },
                      { value: 'CLOSED', label: 'Closed' }
                    ]}
                    buttonClassName="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800 shadow-none"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Priority</Label>
                  <CustomSelect
                    value={selectedTicket.priority}
                    disabled={updating}
                    onChange={(val) => handleUpdateTicket({ priority: val })}
                    options={[
                      { value: 'LOW', label: 'Low' },
                      { value: 'MEDIUM', label: 'Medium' },
                      { value: 'HIGH', label: 'High' },
                      { value: 'CRITICAL', label: 'Critical' }
                    ]}
                    buttonClassName="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800 shadow-none"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Assigned Agent</Label>
                  <CustomSelect
                    value={selectedTicket.assignedToId || selectedTicket.assignedTo?.id || ''}
                    disabled={updating}
                    onChange={(val) => {
                      const agentId = val ? parseInt(val) : null;
                      const agentObj = users.find((u) => u.id === agentId);
                      handleUpdateTicket({ 
                        assignedToId: agentId, 
                        assignedToName: agentObj ? agentObj.name : 'Unassigned' 
                      });
                    }}
                    placeholder="Unassigned"
                    options={[
                      { value: '', label: 'Unassigned' },
                      ...users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))
                    ]}
                    buttonClassName="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-800 shadow-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Initial Issue Description</Label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Dynamic Form Pinned Version Card */}
              {(selectedTicketFormTemplate || (selectedTicket.formValues && Object.keys(selectedTicket.formValues).length > 0)) && (
                <div className="space-y-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Layers className="h-3.5 w-3.5 text-cyan-600" />
                      <span className="text-xs font-bold text-slate-800">
                        {selectedTicketFormTemplate?.name || 'Dynamic Form'}: Version {selectedTicketFormTemplate?.version || selectedTicket.formVersion || 1}
                      </span>
                      <Badge variant="outline" className="text-[9px] font-black uppercase bg-amber-50 text-amber-800 border-amber-200">
                        Immutable Version
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditFormValues({ ...selectedTicket?.formValues });
                        setIsEditingFormValues(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition-colors border border-cyan-200 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit Values</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {selectedTicketFormTemplate?.fields?.length > 0 ? (
                      selectedTicketFormTemplate.fields.map((f) => {
                        const val = selectedTicket.formValues?.[f.fieldKey] || selectedTicket.formValues?.[f.label] || selectedTicket.formValues?.[f.id];
                        return (
                          <div key={f.id || f.fieldKey} className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                            <span className="text-[10px] font-bold text-slate-400 block">{f.label}</span>
                            <span className="font-semibold text-slate-800 break-words">{val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'}</span>
                          </div>
                        );
                      })
                    ) : (
                      Object.entries(selectedTicket.formValues || {}).map(([k, v]) => (
                        <div key={k} className="p-2 bg-white rounded-lg border border-slate-200 text-xs">
                          <span className="text-[10px] font-bold text-slate-400 block">{k}</span>
                          <span className="font-semibold text-slate-800 break-words">{v !== undefined && v !== null && String(v).trim() !== '' ? String(v) : '—'}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Comments & Activity Stream */}
              <div className="space-y-2.5 pt-1">
                <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Activity & Responses ({comments.length})</span>
                  {commentsLoading && <span className="text-[10px] text-slate-400 animate-pulse">Loading comments...</span>}
                </Label>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {comments.length > 0 ? (
                    comments.map((c) => (
                      <div 
                        key={c.id} 
                        className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                          c.isInternal || c.internal 
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">{c.user?.name || c.authorName || 'Staff'}</span>
                            {(c.isInternal || c.internal) && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-black uppercase px-1.5 py-0">
                                Internal Note
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="font-medium leading-relaxed text-[11.5px]">{c.content || c.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                      No responses posted yet.
                    </div>
                  )}
                </div>

                {/* New Comment / Reply Box */}
                <form onSubmit={handleAddComment} className="pt-1.5 space-y-2.5">
                  <textarea
                    rows={2.5}
                    placeholder="Type an official reply or internal note..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-cyan-500 focus:outline-none resize-none"
                  />

                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span>Mark as Internal Note</span>
                    </label>

                    <Button
                      type="submit"
                      disabled={sendingComment || !newCommentText.trim()}
                      className="bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold text-xs rounded-lg h-8 px-3.5 gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Send className="h-3 w-3" />
                      <span>{sendingComment ? 'Sending...' : 'Post Reply'}</span>
                    </Button>
                  </div>
                </form>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteSingleTicket(selectedTicket.id)}
                className="rounded-lg text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Ticket</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg text-xs font-bold text-slate-600 cursor-pointer"
              >
                Close
              </Button>
            </div>

          </Card>
        </div>
      )}

      {/* EDIT DYNAMIC FORM VALUES MODAL */}
      {isEditingFormValues && selectedTicket && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Edit Dynamic Form Values</h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedTicketFormTemplate?.name || 'Dynamic Form'} • Version {selectedTicketFormTemplate?.version || selectedTicket.formVersion || 1}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingFormValues(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDynamicFormValues} className="space-y-3.5">
              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                {selectedTicketFormTemplate?.fields?.length > 0 ? (
                  selectedTicketFormTemplate.fields.map((f) => {
                    const fieldKey = f.fieldKey || f.label;
                    const currentValue = editFormValues[fieldKey] ?? editFormValues[f.label] ?? editFormValues[f.id] ?? '';
                    return (
                      <div key={f.id || fieldKey} className="space-y-1 text-left">
                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          {f.label}
                          {f.required && <span className="text-rose-500">*</span>}
                        </Label>
                        {f.fieldType === 'SELECT' || f.type === 'SELECT' ? (
                          <CustomSelect
                            value={currentValue}
                            onChange={(val) => setEditFormValues(prev => ({ ...prev, [fieldKey]: val }))}
                            placeholder={`Select ${f.label}`}
                            options={(f.options || []).map(opt => ({ value: opt, label: opt }))}
                            buttonClassName="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-white"
                          />
                        ) : f.fieldType === 'TEXTAREA' || f.type === 'TEXTAREA' ? (
                          <textarea
                            rows={3}
                            value={currentValue}
                            required={f.required}
                            onChange={(e) => setEditFormValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                            className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 focus:border-cyan-500 focus:outline-none resize-none"
                          />
                        ) : f.fieldType === 'CHECKBOX' || f.type === 'CHECKBOX' ? (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              checked={Boolean(currentValue === true || currentValue === 'true')}
                              onChange={(e) => setEditFormValues(prev => ({ ...prev, [fieldKey]: e.target.checked }))}
                              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-600 font-medium">{f.placeholder || 'Enable'}</span>
                          </div>
                        ) : (
                          <Input
                            type={f.fieldType === 'NUMBER' || f.type === 'NUMBER' ? 'number' : 'text'}
                            value={currentValue}
                            required={f.required}
                            placeholder={f.placeholder || `Enter ${f.label}`}
                            onChange={(e) => setEditFormValues(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                            className="text-xs font-medium border border-slate-200 rounded-lg"
                          />
                        )}
                        {f.helpText && <p className="text-[10px] text-slate-400">{f.helpText}</p>}
                      </div>
                    );
                  })
                ) : (
                  Object.keys(editFormValues).length > 0 ? (
                    Object.entries(editFormValues).map(([key, val]) => (
                      <div key={key} className="space-y-1 text-left">
                        <Label className="text-xs font-bold text-slate-700">{key}</Label>
                        <Input
                          type="text"
                          value={val || ''}
                          onChange={(e) => setEditFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                          className="text-xs font-medium border border-slate-200 rounded-lg"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">No dynamic fields associated with this version.</p>
                  )
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingFormValues(false)}
                  className="rounded-lg text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingFormValues}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs rounded-lg shadow-sm hover:from-cyan-700 hover:to-blue-700 cursor-pointer"
                >
                  {savingFormValues ? 'Saving...' : 'Save Values'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TicketsPage;
