import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { createNotification } from '../utils/notify';
import { liveChannel } from '../utils/liveChannel';
import { audioNotifier } from '../utils/audioNotify';
import { triggerUndoableAction } from '../components/common/UndoToast';
import ConfirmModal from '@/components/common/ConfirmModal';
import CsatRatingModal from '../components/common/CsatRatingModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { 
  ArrowLeft, 
  MessageSquare, 
  Lock, 
  User, 
  Calendar, 
  Activity,
  Send,
  MoreVertical,
  Paperclip,
  UploadCloud,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  Edit2,
  Trash2,
  Zap,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  CornerDownRight,
  ListOrdered,
  Tag,
  ThumbsUp,
  Building,
  FileText,
  Bold,
  Italic,
  Code,
  Quote,
  List,
  Eye,
  Printer,
  Users2,
  AlertTriangle,
  Layers,
  X
} from 'lucide-react';

const AVAILABLE_CSAT_TAGS = [
  '⚡ Fast Resolution',
  '🤝 Helpful & Polite',
  '💡 Solved First Time',
  '📝 Clear Explanation',
  '⚙️ Technical Depth',
  '⏳ Took Too Long'
];

const TicketDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [backendAttachments, setBackendAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentAttachment, setCommentAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Agent Collision / Live Presence State
  const [activeViewers, setActiveViewers] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status/Assignee Edit States
  const [statusVal, setStatusVal] = useState('');
  const [assigneeVal, setAssigneeVal] = useState('');
  const [departmentVal, setDepartmentVal] = useState('IT & Infrastructure');
  const [activeTab, setActiveTab] = useState('details');

  // Dynamic Form Immutable Version State
  const [formTemplate, setFormTemplate] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [isEditingFormValues, setIsEditingFormValues] = useState(false);
  const [editFormValues, setEditFormValues] = useState({});
  const [savingFormValues, setSavingFormValues] = useState(false);

  // Comment Form State & Rich Formatting
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [commentViewMode, setCommentViewMode] = useState('write'); // 'write' | 'preview'

  // CSAT Rating State
  const [csatRating, setCsatRating] = useState(0);
  const [csatHover, setCsatHover] = useState(0);
  const [csatFeedback, setCsatFeedback] = useState('');
  const [csatTags, setCsatTags] = useState([]);
  const [csatSubmitted, setCsatSubmitted] = useState(false);
  const [submittingCsat, setSubmittingCsat] = useState(false);
  const [isCsatModalOpen, setIsCsatModalOpen] = useState(false);

  const isSupportStaff = user?.role === 'COMPANY_ADMIN' || user?.role === 'MANAGER' || user?.role === 'AGENT' || user?.role === 'SUPER_ADMIN';
  const isAgent = user?.role === 'AGENT';
  const isEndUser = !isSupportStaff;

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Pre-fill rating from URL query parameter
  useEffect(() => {
    const rateParam = searchParams.get('rate');
    if (rateParam) {
      const parsedRate = parseInt(rateParam, 10);
      if (parsedRate >= 1 && parsedRate <= 5) {
        setCsatRating(parsedRate);
      }
    }
  }, [searchParams]);

  const fetchTicketDetails = useCallback(async () => {
    try {
      let ticketData = null;

      try {
        ticketData = await api.get(`/tickets/${id}`);
      } catch (_apiErr) {
        // Backend API fallback
      }

      if (!ticketData && user?.id) {
        try {
          const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();
          const userKey = `tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`;
          const stored = sessionStorage.getItem(userKey);
          if (stored) {
            const list = JSON.parse(stored);
            if (Array.isArray(list)) {
              const found = list.find(t => String(t.id) === String(id) || t.ticketNumber === id);
              if (found) ticketData = found;
            }
          }
        } catch (_e) {}
      }

      if (ticketData) {
        setTicket(ticketData);
        setFormValues(ticketData.formValues || {});
        setStatusVal(ticketData.status || 'OPEN');
        setAssigneeVal(ticketData.assignedTo ? (ticketData.assignedTo.id || ticketData.assignedToId) : (ticketData.assignedToId || ''));
        setDepartmentVal(ticketData.department || ticketData.category?.targetDepartment || 'IT & Infrastructure');
        setError(null);

        // Fetch pinned immutable form version if associated with ticket (NEVER load latest category version)
        if (ticketData.formTemplateId) {
          try {
            const templateData = await api.get(`/form-templates/${ticketData.formTemplateId}`).catch(() => null);
            if (templateData) {
              setFormTemplate(templateData);
            }
          } catch (_tplErr) {}
        }

        if (ticketData.satisfactionRating) {
          setCsatRating(ticketData.satisfactionRating);
          setCsatFeedback(ticketData.satisfactionFeedback || '');
          if (ticketData.satisfactionTags) {
            setCsatTags(ticketData.satisfactionTags.split(',').map(t => t.trim()).filter(Boolean));
          }
          setCsatSubmitted(true);
        } else {
          const isTicketResolved = ticketData.status === 'RESOLVED' || ticketData.status === 'CLOSED';
          if (isTicketResolved) {
            try {
              const fb = await api.get(`/tickets/${ticketData.id || id}/feedback`).catch(() => null);
              if (fb && fb.rating) {
                setCsatRating(fb.rating);
                setCsatFeedback(fb.feedback || '');
                if (fb.tags) {
                  setCsatTags(Array.isArray(fb.tags) ? fb.tags : String(fb.tags).split(',').map(t => t.trim()).filter(Boolean));
                }
                setCsatSubmitted(true);
              }
            } catch (_fbErr) {}
          }

          const storedCsat = localStorage.getItem(`csat_rating_${ticketData.id || id}`);
          if (storedCsat) {
            try {
              const parsedCsat = JSON.parse(storedCsat);
              if (parsedCsat && parsedCsat.rating) {
                setCsatRating(prev => prev || parsedCsat.rating);
                setCsatFeedback(prev => prev || parsedCsat.feedback || '');
                if (parsedCsat.tags) {
                  setCsatTags(prev => prev.length ? prev : (Array.isArray(parsedCsat.tags) ? parsedCsat.tags : parsedCsat.tags.split(',').map(t => t.trim())));
                }
                setCsatSubmitted(true);
              }
            } catch (_e) {}
          }
        }
      } else {
        setError('Ticket not found in local workspace or remote server.');
      }

      try {
        const commentsData = await api.get(`/tickets/${id}/comments`);
        const commentsList = Array.isArray(commentsData) ? commentsData : (commentsData?.content || []);
        if (commentsList.length > 0) {
          setComments(commentsList);
        }
      } catch (_commentsErr) {
        if (comments.length === 0) {
          setComments([
            {
              id: 101,
              comment: 'Support ticket registered. An automated SLA response target has been initiated for this department.',
              internal: false,
              createdAt: ticketData?.createdAt || new Date().toISOString(),
              user: { name: 'Automated System' }
            }
          ]);
        }
      }

      try {
        const targetAttId = ticketData?.id || (id && String(id).match(/^\d+$/) ? id : null);
        const attData = targetAttId ? await api.get(`/tickets/${targetAttId}/attachments`) : await api.get(`/tickets/${id}/attachments`);
        const attList = Array.isArray(attData) ? attData : (attData?.content || []);
        if (attList.length > 0) {
          setBackendAttachments(attList);
        }
      } catch (_attErr) {}

      if (isSupportStaff) {
        try {
          const agentsData = await api.get('/users/agents');
          if (Array.isArray(agentsData)) {
            setAgents(agentsData);
          }
        } catch (_agentsErr) {
          setAgents([]);
        }
      }
    } catch (_err) {
      console.error('Error fetching ticket details:', _err);
      setError('Could not load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [id, isSupportStaff]);

  useEffect(() => {
    fetchTicketDetails();

    const unsubscribe = liveChannel.subscribe('TICKET_UPDATED', (payload) => {
      if (payload?.action === 'ATTACHMENT' && payload?.originTab === (window.name || 'self')) {
        return;
      }
      if (!payload || !payload.ticketId || String(payload.ticketId) === String(id)) {
        fetchTicketDetails();
      }
    });

    const handleRealtimeDomEvent = (e) => {
      const { destination, payload } = e?.detail || {};
      if (destination && (destination.includes('/tickets') || destination.includes('/feedback') || destination.includes('/notifications'))) {
        if (!payload || !payload.id || String(payload.id) === String(id) || payload.ticketNumber === id || destination.includes('/feedback') || destination.includes('/tickets')) {
          fetchTicketDetails();
        }
      }
    };

    // Zendesk standard: always re-fetch ticket from DB when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTicketDetails();
      }
    };

    const handleWindowFocus = () => {
      fetchTicketDetails();
    };

    window.addEventListener('ticketpro_realtime_event', handleRealtimeDomEvent);
    window.addEventListener('storage', fetchTicketDetails);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('ticketpro_realtime_event', handleRealtimeDomEvent);
      window.removeEventListener('storage', fetchTicketDetails);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchTicketDetails, id]);

  // Agent Collision / Live Presence Heartbeat
  useEffect(() => {
    if (!user || !id) return;
    const currentSessionId = Math.random().toString(36).substring(2, 9);
    
    const sendHeartbeat = () => {
      liveChannel.broadcast('AGENT_PRESENCE', {
        ticketId: id,
        sessionId: currentSessionId,
        userName: user.name || 'Support Agent',
        userRole: user.role || 'AGENT',
        timestamp: Date.now()
      });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 3500);

    const unsub = liveChannel.subscribe('AGENT_PRESENCE', (data) => {
      if (data && String(data.ticketId) === String(id) && data.sessionId !== currentSessionId) {
        setActiveViewers(prev => {
          const filtered = prev.filter(v => v.sessionId !== data.sessionId && (Date.now() - v.timestamp < 8000));
          return [...filtered, data];
        });
      }
    });

    const cleanupInterval = setInterval(() => {
      setActiveViewers(prev => prev.filter(v => (Date.now() - v.timestamp < 8000)));
    }, 3500);

    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
      unsub();
    };
  }, [id, user]);
  const updateSessionTicketCache = (updatedTicket) => {
    try {
      if (!user?.id) return;
      const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();
      const userKey = `tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`;
      const stored = sessionStorage.getItem(userKey);
      if (stored) {
        let list = JSON.parse(stored);
        if (Array.isArray(list)) {
          list = list.map(t => (String(t.id) === String(id) || t.ticketNumber === id || t.ticketNumber === updatedTicket?.ticketNumber) ? updatedTicket : t);
          sessionStorage.setItem(userKey, JSON.stringify(list));
        }
      }
    } catch (_e) {}
  };

  const removeSessionTicketCache = () => {
    try {
      if (!user?.id) return;
      const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();
      const userKey = `tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`;
      const stored = sessionStorage.getItem(userKey);
      if (stored) {
        let list = JSON.parse(stored);
        if (Array.isArray(list)) {
          list = list.filter(t => String(t.id) !== String(id) && t.ticketNumber !== id);
          sessionStorage.setItem(userKey, JSON.stringify(list));
        }
      }
    } catch (_e) {}
  };

  const handleClaimTicket = async () => {
    if (!user || !ticket) return;
    try {
      await api.put(`/tickets/${id}`, { assignedToId: user.id }).catch(() => null);
      
      const updatedTicket = { 
        ...ticket, 
        assignedToId: user.id,
        assignedAgent: user.name,
        assignedTo: { id: user.id, name: user.name, role: user.role }
      };
      setTicket(updatedTicket);
      setAssigneeVal(user.id);

      updateSessionTicketCache(updatedTicket);

      audioNotifier.playChime();
      liveChannel.broadcast('TICKET_UPDATED', { ticketId: id, action: 'CLAIM' });
      triggerToast(`⚡ You successfully claimed Ticket #${ticket?.ticketNumber || id}!`);
    } catch (_err) {
      setError('Failed to claim ticket.');
    }
  };

  const handleStatusChange = async (e) => {
    const prevStatus = statusVal;
    const newStatus = typeof e === 'object' && e?.target ? e.target.value : e;
    setStatusVal(newStatus);

    try {
      await api.put(`/tickets/${id}`, { status: newStatus }).catch(() => null);
      const updated = { ...ticket, status: newStatus };
      setTicket(updated);

      updateSessionTicketCache(updated);

      if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
        audioNotifier.playChime();
        if (!csatSubmitted && !ticket?.satisfactionRating) {
          setTimeout(() => setIsCsatModalOpen(true), 500);
        }
      }
      liveChannel.broadcast('TICKET_UPDATED', { ticketId: id, action: 'STATUS', status: newStatus });
      
      // Trigger interactive 5-second Grace Window Undo Toast
      triggerUndoableAction(`Status updated to ${newStatus}`, async () => {
        setStatusVal(prevStatus);
        const reverted = { ...ticket, status: prevStatus };
        setTicket(reverted);
        updateSessionTicketCache(reverted);
        await api.put(`/tickets/${id}`, { status: prevStatus }).catch(() => null);
        liveChannel.broadcast('TICKET_UPDATED', { ticketId: id, action: 'STATUS', status: prevStatus });
        triggerToast(`↩️ Reverted status back to ${prevStatus}`);
      });
    } catch (_err) {
      setError('Failed to update status.');
    }
  };

  const handleAssigneeChange = async (e) => {
    const newAssigneeId = typeof e === 'object' && e?.target ? e.target.value : e;
    setAssigneeVal(newAssigneeId);
    try {
      await api.put(`/tickets/${id}`, { assignedToId: newAssigneeId || null }).catch(() => null);
      const selectedAgentObj = agents.find(a => String(a.id) === String(newAssigneeId));
      const updated = { 
        ...ticket, 
        assignedToId: newAssigneeId,
        assignedAgent: selectedAgentObj ? selectedAgentObj.name : 'Unassigned',
        assignedTo: selectedAgentObj || null 
      };
      setTicket(updated);

      updateSessionTicketCache(updated);

      liveChannel.broadcast('TICKET_UPDATED', { ticketId: id, action: 'ASSIGN', assigneeId: newAssigneeId });
      triggerToast('Assignee updated successfully');
    } catch (_err) {
      setError('Failed to update assignee.');
    }
  };

  const handleDepartmentReRoute = async (e) => {
    const newDept = typeof e === 'object' && e?.target ? e.target.value : e;
    setDepartmentVal(newDept);
    try {
      await api.put(`/tickets/${id}`, { department: newDept }).catch(() => null);
      const updated = { ...ticket, department: newDept };
      setTicket(updated);

      updateSessionTicketCache(updated);

      liveChannel.broadcast('TICKET_UPDATED', { ticketId: id, action: 'DEPARTMENT', department: newDept });
      triggerToast(`Re-routed to ${newDept}`);
    } catch (_err) {
      setError('Failed to re-route department.');
    }
  };

  const cannedMacros = [
    { label: '⚡ Fast Resolution Acknowledgment', text: 'Hello, thank you for reaching out. We have investigated this issue and verified that all systems are back to standard operation. Please let us know if you need further help!' },
    { label: '🔍 Requesting More Information / Logs', text: 'Hi, to help us diagnose this faster, could you please provide additional screenshots, error codes, or timestamp of when this occurred?' },
    { label: '⏳ Investigating with DevOps / Infrastructure', text: 'Hello, our engineering and infrastructure team is actively looking into this. We will update you with resolution details shortly.' }
  ];

  const handleMacroSelect = (text) => {
    setSelectedMacro(text);
    if (text) {
      setNewComment(text);
    }
  };

  const insertFormatting = (prefix, suffix = '') => {
    const textarea = document.getElementById('ticket-comment-textarea');
    if (!textarea) {
      setNewComment(prev => `${prev}${prefix}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newComment.substring(start, end) || 'text';
    const replacement = `${prefix}${selectedText}${suffix}`;
    
    setNewComment(
      newComment.substring(0, start) + replacement + newComment.substring(end)
    );

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const handleUploadNewAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(`File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 10MB.`);
      if (e.target) e.target.value = '';
      return;
    }

    const name = file.name || '';
    const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')).toLowerCase() : '';
    const type = (file.type || '').toLowerCase();

    if (type.startsWith('video/') || ext.match(/\.(mp4|mov|avi|mkv|wmv|flv|webm|3gp|m4v|mpg|mpeg|m4p|ogv|ts)$/i)) {
      alert(`Video files (${ext || 'video'}) are not allowed. Please upload documents or images.`);
      if (e.target) e.target.value = '';
      return;
    }

    if (type.includes('zip') || type.includes('x-rar') || type.includes('7z') || type.includes('tar') || type.includes('compressed') || type.includes('archive') || ext.match(/\.(zip|rar|7z|tar|gz|bz2|xz|iso|cab|tgz)$/i)) {
      alert(`ZIP and compressed archive files (${ext || 'archive'}) are not allowed. Please upload documents or images.`);
      if (e.target) e.target.value = '';
      return;
    }

    try {
      setUploadingAttachment(true);
      setUploadingFileName(file.name);

      // Cache base64 locally for instant offline preview
      const reader = new FileReader();
      reader.onload = (re) => {
        const b64 = re.target.result;
        try {
          localStorage.setItem('ticket_file_id_' + (ticket?.id || id), b64);
          localStorage.setItem('ticket_file_latest', b64);
        } catch (_e) {}
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('file', file);
      if (user?.email) {
        formData.append('uploaderEmail', user.email);
      }
      const targetAttId = ticket?.id || (id && String(id).match(/^\d+$/) ? id : null);
      const newAtt = await api.post(`/tickets/${targetAttId || id}/attachments`, formData);
      if (newAtt) {
        setBackendAttachments(prev => [newAtt, ...prev.filter(a => a.id !== newAtt.id)]);
        triggerToast(`✓ File "${file.name}" uploaded successfully!`);
        liveChannel.broadcast('TICKET_UPDATED', { ticketId: id, action: 'ATTACHMENT', originTab: window.name || 'self' });
      }
    } catch (err) {
      alert(err.message || 'Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
      setUploadingFileName('');
      if (e.target) e.target.value = '';
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !commentAttachment) return;
    if (isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      const commentText = newComment.trim() || (commentAttachment ? `Attached file: ${commentAttachment.name}` : '');
      const payload = {
        comment: commentText,
        internal: isInternal,
        ticketId: ticket?.id || id
      };

      const res = await api.post(`/tickets/${ticket?.id || id}/comments`, payload).catch(() => null);

      const newCommentObj = res || {
        id: Date.now(),
        comment: commentText,
        internal: isInternal,
        createdAt: new Date().toISOString(),
        user: { name: user?.name || 'Support Staff' }
      };

      if (commentAttachment) {
        try {
          const formData = new FormData();
          formData.append('file', commentAttachment);
          if (user?.email) {
            formData.append('uploaderEmail', user.email);
          }
          const attResp = await api.post(`/tickets/${ticket?.id || id}/attachments`, formData);
          if (attResp) {
            setBackendAttachments(prev => [attResp, ...prev]);
          }
        } catch (_attErr) {
          console.warn('Comment attachment upload error:', _attErr);
        }
        setCommentAttachment(null);
      }

      setComments(prev => [...prev, newCommentObj]);
      setNewComment('');
      setIsInternal(false);
      setSelectedMacro('');
      setCommentViewMode('write');
      audioNotifier.playChime();
      liveChannel.broadcast('TICKET_UPDATED', { ticketId: id, action: 'COMMENT' });
      triggerToast(isInternal ? '🔒 Internal note saved (hidden from customer)' : '✓ Public reply posted & dispatched!');
    } catch (_err) {
      setError('Failed to post comment reply.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const toggleCsatTag = (tag) => {
    if (csatSubmitted) return;
    setCsatTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleCsatSubmit = async (e) => {
    e.preventDefault();
    if (isSupportStaff) {
      triggerToast('⚠️ Only the customer who raised this ticket can submit CSAT ratings.');
      return;
    }
    if (csatRating === 0) {
      triggerToast('Please choose a star rating (1 to 5).');
      return;
    }

    setSubmittingCsat(true);
    const tagsJoined = csatTags.join(', ');

    const payload = {
      rating: csatRating,
      feedback: csatFeedback,
      tags: csatTags,
      customerName: user?.name || ticket?.createdBy?.name || 'Customer',
      customerEmail: user?.email || ticket?.createdBy?.email || ''
    };

    try {
      await api.post(`/tickets/${ticket?.id || id}/feedback`, payload);

      const csatData = {
        ticketId: ticket?.id || id,
        rating: csatRating,
        feedback: csatFeedback,
        tags: csatTags,
        submittedBy: user?.name || 'Customer',
        submittedAt: new Date().toISOString()
      };
      localStorage.setItem(`csat_rating_${ticket?.id || id}`, JSON.stringify(csatData));
      
      const updatedTicket = {
        ...ticket,
        satisfactionRating: csatRating,
        satisfactionFeedback: csatFeedback,
        satisfactionTags: tagsJoined
      };
      setTicket(updatedTicket);

      updateSessionTicketCache(updatedTicket);

      // Send live notification to assigned agent and company admin
      const agentEmail = ticket?.assignedTo?.email || ticket?.assignedAgentEmail;
      const cleanNum = (ticket?.ticketNumber || `#TK-${id}`).replace(/^[#]+/, '');
      const recipients = [];
      if (agentEmail) recipients.push(agentEmail);
      if (ticket?.companyCode) recipients.push(`admin@${ticket.companyCode.toLowerCase()}.com`);

      createNotification({
        title: csatRating <= 2 ? `⚠️ Low CSAT Alert (${csatRating}/5 Stars)` : `🌟 CSAT Review: ${csatRating}/5 Stars Received`,
        message: `Customer ${user?.name || 'Customer'} submitted a ${csatRating}-Star rating for Ticket #${cleanNum}${csatFeedback ? `: "${csatFeedback}"` : '.'}`,
        type: csatRating <= 2 ? 'CSAT_WARNING' : 'CSAT_RATING',
        link: `/tickets/${ticket?.id || id}`,
        targetRole: 'AGENT',
        recipients
      });

      setCsatSubmitted(true);
      audioNotifier.playChime();
      liveChannel.broadcast('TICKET_UPDATED', { ticketId: id, action: 'CSAT', rating: csatRating });
      triggerToast(`⭐ Thank you! Your ${csatRating}-Star rating has been recorded.`);
    } catch (_err) {
      triggerToast('CSAT feedback saved locally.');
      setCsatSubmitted(true);
    } finally {
      setSubmittingCsat(false);
    }
  };

  const handlePrintAuditReport = () => {
    window.print();
  };

  const getImageForFile = (filename) => {
    if (filename && filename.startsWith('data:image')) {
      return filename;
    }
    try {
      const byId = localStorage.getItem('ticket_file_id_' + id);
      if (byId) return byId;

      const byNum = ticket?.ticketNumber ? localStorage.getItem('ticket_file_num_' + ticket.ticketNumber) : null;
      if (byNum) return byNum;

      const latest = localStorage.getItem('ticket_file_latest');
      if (latest) return latest;
    } catch (_e) {}

    return null;
  };

  const handleDownloadAttachment = (filename) => {
    const dataUrl = getImageForFile(filename);
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename.includes('.') ? filename : `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast(`Downloading ${filename}...`);
      return;
    }

    // Check backend attachments list or direct download URL
    const foundBackend = backendAttachments.find(a => a.fileName === filename || (a.fileUrl && a.fileUrl.includes(filename)));
    const downloadTarget = foundBackend
      ? (foundBackend.id ? `/api/attachments/${foundBackend.id}/download` : (foundBackend.fileUrl || `/api/attachments/download/${foundBackend.fileName}`))
      : (filename ? `/api/attachments/download/${filename}` : null);

    if (downloadTarget) {
      const link = document.createElement('a');
      link.href = downloadTarget;
      link.download = filename || 'attachment';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast(`Downloading ${filename}...`);
      return;
    }

    alert('No attachment found for this ticket.');
  };

  const handleRenameCurrentTicket = () => {
    if (!ticket) return;
    const newSubj = window.prompt('Rename / Edit Ticket Subject:', ticket.subject);
    if (!newSubj || !newSubj.trim() || newSubj.trim() === ticket.subject) return;

    const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();
    const updated = { ...ticket, subject: newSubj.trim() };
    setTicket(updated);

    try {
      updateSessionTicketCache(updated);
      liveChannel.broadcast('TICKET_UPDATED', { ticketId: id, action: 'RENAME' });
    } catch (_e) {}

    api.put(`/tickets/${id}`, { subject: newSubj.trim() }).catch(() => null);
  };

  const handleDeleteCurrentTicket = () => {
    if (!ticket) return;
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteTicket = async () => {
    if (!ticket) return;
    setIsDeleting(true);
    const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();
    try {
      removeSessionTicketCache();
      liveChannel.broadcast('TICKET_UPDATED', { ticketId: id, action: 'DELETE' });
    } catch (_e) {}

    api.delete(`/tickets/${id}`).catch(() => null);
    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    navigate('/tickets');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <Card className="rounded-3xl border-rose-200 bg-rose-50/60 p-8 text-center max-w-md mx-auto mt-12 shadow-sm space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <div>
          <CardTitle className="text-base font-black text-rose-900">Ticket Not Found</CardTitle>
          <CardDescription className="text-xs font-medium text-rose-600 mt-1">{error || 'This support request might have been moved or removed.'}</CardDescription>
        </div>
        <Button onClick={() => navigate('/tickets')} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4">
          Back to Tickets
        </Button>
      </Card>
    );
  }

  const getAttachedFiles = () => {
    if (!ticket || !ticket.description) return [];
    const files = [];
    const lines = ticket.description.split('\n');
    lines.forEach(line => {
      if (line.toLowerCase().includes('attachment') || line.toLowerCase().includes('file upload') || line.toLowerCase().includes('proof') || line.toLowerCase().includes('file') || line.includes(':')) {
        const parts = line.split(':');
        if (parts.length > 1) {
          const key = parts[0].trim().toLowerCase();
          if (key.includes('attach') || key.includes('file') || key.includes('proof') || key.includes('upload') || key.includes('image')) {
            const val = parts.slice(1).join(':').trim();
            if (val && val !== '' && val !== 'None' && val !== 'null') {
              files.push({ name: val, size: 'Original Quality', date: ticket.createdAt });
            }
          }
        }
      }
    });
    return files;
  };

  const attachedFiles = getAttachedFiles();
  const visibleComments = isSupportStaff ? comments : comments.filter(c => !c.internal);

  const currentStatus = (ticket.status || 'OPEN').toUpperCase();
  const isAssigned = !!(ticket.assignedTo?.name || ticket.assignedAgent || ticket.assignedToId);
  const isProgress = currentStatus === 'IN_PROGRESS' || currentStatus === 'ON_HOLD' || currentStatus === 'RESOLVED' || currentStatus === 'CLOSED';
  const isResolved = currentStatus === 'RESOLVED' || currentStatus === 'CLOSED';

  const isAssignedToMe = String(ticket.assignedToId || '') === String(user?.id || '') || 
                         (ticket.assignedTo?.name && user?.name && ticket.assignedTo.name.toLowerCase() === user.name.toLowerCase());
  const canClaim = isSupportStaff && !isAssignedToMe;

  return (
    <div className="space-y-6 text-left font-sans text-slate-900 pb-12 relative w-full">
      
      {/* Toast Alert Popup */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-bounce print:hidden">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* AGENT COLLISION PRESENCE WARNING BANNER */}
      {activeViewers.length > 0 && (
        <div className="rounded-2xl bg-amber-500 text-slate-950 p-3.5 px-4.5 font-sans shadow-md border border-amber-400 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <Users2 className="h-5 w-5 text-slate-950 shrink-0" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-700 animate-ping"></span>
            </div>
            <div>
              <span className="text-xs font-black block leading-tight">Agent Collision Warning</span>
              <span className="text-[11px] font-semibold text-slate-900 block">
                {activeViewers.map(v => v.userName).join(', ')} {activeViewers.length === 1 ? 'is' : 'are'} also actively viewing/editing this ticket right now.
              </span>
            </div>
          </div>

          <Badge variant="outline" className="bg-white/80 text-slate-900 border-amber-600 font-extrabold text-[10px] uppercase tracking-wider shrink-0">
            Live Concurrency Shield
          </Badge>
        </div>
      )}

      {/* Back button */}
      <div className="print:hidden">
        <Button 
          variant="ghost"
          onClick={() => navigate('/tickets')}
          className="text-xs font-black text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider cursor-pointer p-0 h-auto gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to tickets</span>
        </Button>
      </div>

      {/* Ticket Title Header Panel */}
      <Card className="rounded-3xl border-slate-200/80 shadow-sm p-5 sm:p-6 bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{ticket.subject}</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRenameCurrentTicket}
                className="h-7 w-7 text-slate-400 hover:text-cyan-700 rounded-lg cursor-pointer print:hidden"
                title="Rename ticket subject"
                aria-label="Rename ticket subject"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteCurrentTicket}
                className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer print:hidden"
                title="Delete ticket"
                aria-label="Delete ticket"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-3 text-xs font-semibold text-slate-500 flex-wrap gap-y-1">
              <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 font-extrabold text-[11px] rounded-md">
                #{ticket.ticketNumber || id}
              </Badge>
              {!isEndUser && (ticket.assignedTo?.name || ticket.assignedAgent || ticket.assignedToId) && (
                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800 font-extrabold text-[11px] rounded-md gap-1 shadow-2xs">
                  <span>⚡</span> Auto-Assigned
                </Badge>
              )}
              <div className="flex items-center space-x-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Created by <strong className="text-slate-800 font-bold">{ticket.createdBy?.name || ticket.creatorName || user?.name || 'Customer'}</strong></span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{new Date(ticket.createdAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden w-full md:w-auto">
            {isResolved && !isSupportStaff && (
              <Button
                onClick={() => setIsCsatModalOpen(true)}
                className={`rounded-2xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 gap-1.5 h-10 px-4 ${
                  csatSubmitted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-amber-200 animate-pulse'
                }`}
              >
                <Star className={`h-4 w-4 ${csatSubmitted ? 'text-emerald-600 fill-emerald-600' : 'text-white fill-white'}`} />
                <span>{csatSubmitted ? `Rated ${csatRating}/5 ⭐ (Edit)` : '⭐ Rate Support (CSAT)'}</span>
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handlePrintAuditReport}
              className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-1.5 h-10 px-3.5 cursor-pointer shadow-xs"
              title="Print official audit trail or save as PDF"
              aria-label="Print or download audit report"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Print / PDF Report</span>
            </Button>

            {canClaim && (
              <Button
                onClick={handleClaimTicket}
                className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 gap-1.5 h-10 px-4"
              >
                <Zap className="h-4 w-4" />
                <span>Claim Ticket</span>
              </Button>
            )}

            {isSupportStaff ? (
              <div className="w-full sm:w-36">
                <CustomSelect
                  value={statusVal}
                  onChange={handleStatusChange}
                  aria-label="Change ticket status"
                  options={[
                    { value: 'OPEN', label: '⚪ Open' },
                    { value: 'IN_PROGRESS', label: '🟡 In Progress' },
                    { value: 'RESOLVED', label: '🟢 Resolved' },
                    { value: 'CLOSED', label: '🔒 Closed' }
                  ]}
                  buttonClassName="border-2 border-cyan-200 bg-cyan-50/70 text-indigo-900 font-extrabold"
                />
              </div>
            ) : (
              <Badge variant="outline" className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-xs font-black">
                Status: {ticket.status || 'OPEN'}
              </Badge>
            )}

            {isSupportStaff && (
              <div className="w-full sm:w-44">
                <CustomSelect
                  value={assigneeVal}
                  onChange={handleAssigneeChange}
                  aria-label="Assign ticket to agent"
                  placeholder="👤 Unassigned"
                  options={[
                    { value: '', label: '👤 Unassigned' },
                    ...agents.map((a) => ({ value: a.id, label: `${a.name} (${a.department || 'Support'})` }))
                  ]}
                />
              </div>
            )}

            {isSupportStaff && (
              <div className="w-full sm:w-48">
                <CustomSelect
                  value={departmentVal}
                  onChange={handleDepartmentReRoute}
                  aria-label="Re-route ticket to department"
                  options={[
                    { value: 'IT & Infrastructure', label: '🏢 IT & Infrastructure' },
                    { value: 'Human Resources (HR)', label: '🏢 Human Resources (HR)' },
                    { value: 'Finance & Accounting', label: '🏢 Finance & Accounting' },
                    { value: 'Operations & Logistics', label: '🏢 Operations & Logistics' },
                    { value: 'Customer Support', label: '🏢 Customer Support' },
                    { value: 'Billing & Payments', label: '🏢 Billing & Payments' }
                  ]}
                  buttonClassName="border border-cyan-200 bg-cyan-50/40 text-indigo-900 font-extrabold"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* AUTOMATED CSAT 1-5 STAR RATING & FEEDBACK SURVEY */}
      {isResolved && (!isSupportStaff ? true : (csatSubmitted && csatRating > 0)) && (
        <Card className="rounded-3xl p-5 sm:p-6 border-2 border-cyan-200 bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/90 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-slate-900">Customer Satisfaction Survey (CSAT)</h3>
                  <Badge variant="outline" className="bg-cyan-100 text-cyan-800 text-[10px] font-bold uppercase">
                    Automated Survey
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {csatSubmitted 
                    ? 'Customer satisfaction feedback has been recorded for this support ticket.' 
                    : 'How would you rate your support experience? Your feedback helps us improve.'}
                </p>
              </div>
            </div>

            {csatSubmitted && (
              <Badge variant="outline" className="self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center space-x-1.5 border border-emerald-200 shadow-2xs">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>CSAT Response Verified ({csatRating}/5 ⭐)</span>
              </Badge>
            )}
          </div>

          {isSupportStaff ? (
            <div className="p-4 bg-white/90 rounded-2xl border border-cyan-100 text-xs text-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-amber-400 font-black text-sm">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= csatRating ? 'fill-current' : 'text-slate-200'}`} />
                  ))}
                  <span className="text-slate-800 ml-1.5 font-bold">({csatRating}/5 Stars)</span>
                </div>
                <span className="text-[10px] text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded-full">Customer Evaluation</span>
              </div>
              <p className="italic font-medium text-slate-600">
                "{csatFeedback || 'Customer submitted rating without written comments.'}"
              </p>
              {csatTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {csatTags.map((t, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 bg-cyan-50 text-cyan-800 rounded-md text-[10px] font-bold border border-cyan-100">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <form onSubmit={handleCsatSubmit} className="space-y-4 pt-1">
            
            {/* 1-5 Star Selection */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-white/80 rounded-2xl border border-cyan-100">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    disabled={csatSubmitted}
                    onClick={() => setCsatRating(star)}
                    onMouseEnter={() => !csatSubmitted && setCsatHover(star)}
                    onMouseLeave={() => !csatSubmitted && setCsatHover(0)}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      (csatHover || csatRating) >= star 
                        ? 'text-amber-400 scale-110' 
                        : 'text-slate-300 hover:text-slate-400'
                    } ${csatSubmitted ? 'cursor-default' : ''}`}
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <Star className="h-7 w-7 fill-current" />
                  </button>
                ))}
              </div>

              <div className="pl-2 text-xs font-black text-slate-700">
                {(csatHover || csatRating) === 5 && '🤩 5/5 — Outstanding & Exceptional!'}
                {(csatHover || csatRating) === 4 && '😊 4/5 — Very Good & Helpful'}
                {(csatHover || csatRating) === 3 && '😐 3/5 — Satisfactory / Average'}
                {(csatHover || csatRating) === 2 && '🙁 2/5 — Below Expectations'}
                {(csatHover || csatRating) === 1 && '😡 1/5 — Needs Major Improvement'}
                {!(csatHover || csatRating) && <span className="text-slate-400 font-medium">Click to select 1 to 5 stars</span>}
              </div>
            </div>

            {/* Quick Feedback Reason Tags */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                What stood out most? (Optional Tags)
              </Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_CSAT_TAGS.map((tag) => {
                  const isSelected = csatTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      disabled={csatSubmitted}
                      onClick={() => toggleCsatTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-cyan-500 shadow-2xs scale-102'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-300'
                      } ${csatSubmitted ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remarks & Submit Button */}
            {!csatSubmitted ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <Input
                  type="text"
                  value={csatFeedback}
                  onChange={(e) => setCsatFeedback(e.target.value)}
                  placeholder="Share any comments or suggestions regarding your resolution experience..."
                  className="flex-1 rounded-2xl border-slate-200 text-xs font-medium bg-white focus:border-cyan-500 shadow-2xs h-10"
                />
                <Button
                  type="submit"
                  disabled={submittingCsat}
                  className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0 gap-1.5 h-10 px-5"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>{submittingCsat ? 'Submitting...' : 'Submit CSAT Survey'}</span>
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-white/90 rounded-2xl border border-cyan-100 text-xs text-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Customer Feedback:</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Saved in Database & Analytics</span>
                </div>
                <p className="italic font-medium text-slate-600">
                  "{csatFeedback || '5-star rating submitted with satisfaction.'}"
                </p>
                {csatTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {csatTags.map((t, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 bg-cyan-50 text-cyan-800 rounded-md text-[10px] font-bold border border-cyan-100">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
          )}
        </Card>
      )}

      {/* Horizontal Tabs Menu */}
      <div className="flex border-b border-slate-200 text-xs font-bold text-slate-400 print:hidden overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { key: 'details', label: 'Details' },
          { key: 'conversations', label: `Conversations (${visibleComments.length})` },
          { key: 'files', label: `Files (${backendAttachments.length > 0 ? backendAttachments.length : attachedFiles.length})` },
          { key: 'timeline', label: 'Timeline & History' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-4 border-b-2 transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-cyan-500 text-cyan-700 font-extrabold'
                : 'border-transparent hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side: Detail panel */}
        <div className="lg:col-span-6 space-y-6">
          {activeTab === 'files' ? (
            <Card className="rounded-3xl p-6 border-slate-200/80 shadow-xs space-y-5 bg-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-wider">Attached Proofs & Documents</CardTitle>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">View, upload, and download ticket proofs or attachments for this support case</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">
                  <FileText className="h-3.5 w-3.5 text-cyan-700" />
                  <span>{(backendAttachments?.length || attachedFiles?.length || 0)} File(s)</span>
                </div>
              </div>

              {/* UPLOAD ATTACHMENT ACTION CARD */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/40 hover:bg-cyan-50/70 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                      <Paperclip className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">Upload Ticket Attachment / Proof</h4>
                      <p className="text-[10px] text-slate-500 font-medium">PNG, JPG, PDF, Word, Excel, Text (Max 10MB)</p>
                    </div>
                  </div>

                  <div>
                    <input
                      id="ticket-details-file-upload-input"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      onChange={handleUploadNewAttachment}
                      disabled={uploadingAttachment}
                      className="hidden"
                    />
                    <label
                      htmlFor="ticket-details-file-upload-input"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black cursor-pointer shadow-xs transition-all active:scale-95 ${
                        uploadingAttachment ? 'pointer-events-none opacity-60' : ''
                      }`}
                    >
                      {uploadingAttachment ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-3.5 w-3.5 shrink-0" />
                          <span>Choose File to Upload</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {uploadingAttachment && (
                  <div className="mt-3 p-3 bg-white border border-cyan-200 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-2xs">
                    <div className="flex items-center space-x-2.5 truncate">
                      <div className="h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span className="text-xs font-bold text-indigo-950 truncate">
                        Uploading: {uploadingFileName || 'Attachment'}...
                      </span>
                    </div>
                    <Badge className="bg-indigo-600 text-white text-[10px] font-bold shrink-0">
                      Uploading to Server
                    </Badge>
                  </div>
                )}
              </div>

              {backendAttachments.length > 0 ? (
                backendAttachments.map((att, aIdx) => {
                  const isImg = att.fileType?.startsWith('image') || (att.fileName && att.fileName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i));
                  const downloadUrl = att.id ? `/api/attachments/${att.id}/download` : (att.fileUrl || `/api/attachments/download/${att.fileName}`);

                  return (
                    <div key={att.id || aIdx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 transition-all space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 truncate mr-2">
                          <div className="h-10 w-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0">
                            {isImg ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-black text-slate-900 block truncate">{att.fileName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Attached File'} • {att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString() : 'Uploaded'}
                            </span>
                          </div>
                        </div>

                        <a
                          href={downloadUrl}
                          download={att.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center gap-1.5 h-9 px-3 shrink-0"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </a>
                      </div>

                      {isImg ? (
                        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white p-3 text-center space-y-2">
                          <img
                            src={downloadUrl}
                            alt={att.fileName}
                            className="max-h-96 w-full object-contain mx-auto rounded-xl shadow-xs"
                            onError={(e) => {
                              const fb = getImageForFile(att.fileName);
                              if (fb && e.target.src !== fb) e.target.src = fb;
                            }}
                          />
                          <div className="flex items-center justify-center space-x-1 text-emerald-600 text-xs font-bold pt-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Server Verified Attachment</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : attachedFiles.length > 0 ? (
                attachedFiles.map((file, fIdx) => {
                  const realDataUrl = getImageForFile(file.name);

                  return (
                    <div key={fIdx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 transition-all space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block">{file.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">User Uploaded Image File</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => handleDownloadAttachment(file.name)}
                          className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 gap-1.5 h-9 px-3"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </Button>
                      </div>

                      {realDataUrl ? (
                        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white p-3 text-center space-y-2">
                          <img
                            src={realDataUrl}
                            alt={file.name}
                            className="max-h-96 w-full object-contain mx-auto rounded-xl shadow-xs"
                          />
                          <div className="flex items-center justify-center space-x-1 text-emerald-600 text-xs font-bold pt-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Attachment Loaded</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 border border-slate-200 bg-white rounded-2xl text-center text-xs font-semibold text-slate-400">
                          No file preview available for this document.
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-center text-xs font-semibold text-slate-400 space-y-3">
                  <Paperclip className="h-8 w-8 text-slate-300 mx-auto" />
                  <p>No attachments uploaded for this ticket yet.</p>
                  <div>
                    <label
                      htmlFor="ticket-details-file-upload-input"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black cursor-pointer shadow-xs transition-all active:scale-95"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Upload Attachment Now</span>
                    </label>
                  </div>
                </div>
              )}
            </Card>
          ) : activeTab === 'timeline' ? (
            <Card className="rounded-3xl p-6 border-slate-200/80 shadow-xs space-y-6 bg-white">
              <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Clock className="h-4 w-4 text-cyan-700" />
                <span>Ticket Audit & Lifecycle History</span>
              </CardTitle>

              <div className="relative pl-6 border-l-2 border-cyan-100 space-y-6">
                
                {/* Event 1: Creation */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-indigo-600 border-4 border-white shadow-xs"></div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block">{new Date(ticket.createdAt || Date.now()).toLocaleString()}</span>
                    <h4 className="text-xs font-black text-slate-900">Ticket Created & Registered</h4>
                    <p className="text-xs text-slate-500">Initiated by {ticket.createdBy?.name || ticket.creatorName || 'Customer'}</p>
                  </div>
                </div>

                {/* Event 2: Assignment */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-4 border-white shadow-xs"></div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block">{new Date(ticket.createdAt || Date.now()).toLocaleDateString()}</span>
                    <h4 className="text-xs font-black text-slate-900">Assigned to {ticket.assignedTo?.name || ticket.assignedAgent || 'Support Specialist'}</h4>
                    <p className="text-xs text-slate-500">{ticket.autoAssignedReason || 'Auto-assigned by Enterprise Routing Engine'}</p>
                  </div>
                </div>

                {/* Event 3: Current Status */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full bg-amber-500 border-4 border-white shadow-xs"></div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block">Current Status</span>
                    <h4 className="text-xs font-black text-slate-900">{ticket.status} — In {ticket.department || 'IT Operations'}</h4>
                    <p className="text-xs text-slate-500">Active SLA timer monitoring response and resolution</p>
                  </div>
                </div>

              </div>
            </Card>
          ) : (
            <Card className="rounded-3xl p-6 border-slate-200/80 shadow-xs space-y-6 bg-white">
              
              <div className="space-y-2">
                <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-wider">Ticket Description</CardTitle>
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {ticket.description || 'No detailed description provided for this support ticket.'}
                </div>
              </div>

              {/* DYNAMIC FORM SUBMISSION SECTION (Pinned Immutable Form Version) */}
              {(formTemplate || (ticket.formValues && Object.keys(ticket.formValues).length > 0) || ticket.formTemplateId) && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Layers className="h-4 w-4 text-cyan-600" />
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Dynamic Form Submission: {formTemplate?.name || 'Custom Intake Form'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <span>v{formTemplate?.version || ticket.formVersion || 1}</span>
                        <span className="text-amber-600 font-normal">• Immutable Version</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditFormValues({ ...(ticket?.formValues || formValues || {}) });
                        setIsEditingFormValues(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition-colors border border-cyan-200 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit Form Values</span>
                    </button>
                  </div>

                  {/* Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70">
                    {formTemplate?.fields && formTemplate.fields.length > 0 ? (
                      formTemplate.fields.map((field) => {
                        const val = formValues[field.fieldKey] !== undefined
                          ? formValues[field.fieldKey]
                          : (formValues[field.label] !== undefined ? formValues[field.label] : formValues[field.id]);
                        return (
                          <div key={field.id || field.fieldKey || field.label} className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                              <span>
                                {field.label} {field.required && <span className="text-rose-500">*</span>}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                {field.type || 'text'}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-900 break-words">
                              {val !== null && val !== undefined && String(val).trim() !== '' ? (
                                String(val)
                              ) : (
                                <span className="text-slate-400 italic font-normal">Not provided</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      Object.entries(formValues || {}).map(([key, val]) => (
                        <div key={key} className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                          <div className="text-[11px] font-bold text-slate-500">{key}</div>
                          <div className="text-xs font-semibold text-slate-900 break-words">
                            {val !== null && val !== undefined && String(val).trim() !== '' ? (
                              String(val)
                            ) : (
                              <span className="text-slate-400 italic font-normal">Not provided</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Attached Documents & File Previews directly on the Details View */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-cyan-700" />
                    <span>Attached Files & Documents ({backendAttachments.length || attachedFiles.length})</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="details-tab-file-upload-input"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      onChange={handleUploadNewAttachment}
                      disabled={uploadingAttachment}
                      className="hidden"
                    />
                    <label
                      htmlFor="details-tab-file-upload-input"
                      className={`text-[11px] font-bold text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-lg cursor-pointer transition-all active:scale-95 ${
                        uploadingAttachment ? 'pointer-events-none opacity-50' : ''
                      }`}
                    >
                      {uploadingAttachment ? 'Uploading...' : '+ Upload File'}
                    </label>
                    {(backendAttachments.length > 0 || attachedFiles.length > 0) && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('files')}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        View All Files →
                      </button>
                    )}
                  </div>
                </div>

                {uploadingAttachment && (
                  <div className="mb-3 p-3.5 bg-cyan-50 border-2 border-dashed border-cyan-300 rounded-2xl flex items-center justify-between gap-3 animate-pulse shadow-xs">
                    <div className="flex items-center space-x-3 truncate">
                      <div className="h-9 w-9 bg-gradient-to-tr from-[#0284c7] to-[#2563eb] text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                      <div className="truncate text-left">
                        <span className="text-xs font-black text-indigo-950 block truncate">
                          Uploading: {uploadingFileName || 'File'}
                        </span>
                        <span className="text-[10px] text-cyan-700 font-bold">
                          Uploading in progress...
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-indigo-600 text-white border-none text-[10px] font-extrabold uppercase px-2 py-0.5 shrink-0">
                      Uploading
                    </Badge>
                  </div>
                )}

                {backendAttachments.length === 0 && attachedFiles.length === 0 && !uploadingAttachment && (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 text-xs text-slate-400 font-medium">
                      <Paperclip className="h-4 w-4 text-slate-300 shrink-0" />
                      <span>No files attached to this ticket yet.</span>
                    </div>
                    <label
                      htmlFor="details-tab-file-upload-input"
                      className="text-xs font-black text-cyan-700 hover:text-cyan-800 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-cyan-100 shadow-2xs transition-all active:scale-95"
                    >
                      Attach File
                    </label>
                  </div>
                )}

                {(backendAttachments.length > 0 || attachedFiles.length > 0) && (
                  <div className="space-y-3">
                    {backendAttachments.length > 0 ? (
                      backendAttachments.map((att, aIdx) => {
                        const isImg = att.fileType?.startsWith('image') || (att.fileName && att.fileName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i));
                        const downloadUrl = att.id ? `/api/attachments/${att.id}/download` : (att.fileUrl || `/api/attachments/download/${att.fileName}`);

                        return (
                          <div key={att.id || aIdx} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center space-x-3 truncate">
                                <div className="h-9 w-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0">
                                  {isImg ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                </div>
                                <div className="truncate text-left">
                                  <span className="text-xs font-black text-slate-900 block truncate">{att.fileName}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB • ` : ''}Verified Attachment
                                  </span>
                                </div>
                              </div>

                              <a
                                href={downloadUrl}
                                download={att.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center gap-1.5 h-8 px-3 shrink-0"
                              >
                                <Download className="h-3 w-3" />
                                <span>Download</span>
                              </a>
                            </div>

                            {isImg && (
                              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white p-2 text-center">
                                <img
                                  src={downloadUrl}
                                  alt={att.fileName}
                                  className="max-h-64 w-full object-contain mx-auto rounded-lg"
                                  onError={(e) => {
                                    const fb = getImageForFile(att.fileName);
                                    if (fb && e.target.src !== fb) e.target.src = fb;
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      attachedFiles.map((file, fIdx) => {
                        const realDataUrl = getImageForFile(file.name);
                        return (
                          <div key={fIdx} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center space-x-3 truncate">
                                <div className="h-9 w-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold shrink-0">
                                  {realDataUrl ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                </div>
                                <span className="text-xs font-black text-slate-900 block truncate">{file.name}</span>
                              </div>
                              <Button
                                type="button"
                                onClick={() => handleDownloadAttachment(file.name)}
                                className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 gap-1.5 h-8 px-3 shrink-0"
                              >
                                <Download className="h-3 w-3" />
                                <span>Download</span>
                              </Button>
                            </div>
                            {realDataUrl && (
                              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white p-2 text-center">
                                <img
                                  src={realDataUrl}
                                  alt={file.name}
                                  className="max-h-64 w-full object-contain mx-auto rounded-lg"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Department & Assignment Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Target Department</span>
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800">
                    <Building className="h-3.5 w-3.5 text-cyan-700" />
                    <span>{ticket.department || ticket.category?.targetDepartment || 'IT & Infrastructure'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assigned Staff</span>
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800">
                    <User className="h-3.5 w-3.5 text-cyan-700" />
                    <span>{ticket.assignedTo?.name || ticket.assignedAgent || 'Support Specialist'}</span>
                  </div>
                </div>
              </div>

            </Card>
          )}
        </div>

        {/* Right Side: Conversation / Reply Box */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="rounded-3xl border-slate-200/80 shadow-xs overflow-hidden flex flex-col bg-white">
            
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-cyan-700" />
                <span className="text-xs font-black text-slate-900">Communication & Activity Log</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-600">
                {visibleComments.length} messages
              </Badge>
            </div>

            {/* Conversation messages thread */}
            <div className="p-5 space-y-4 max-h-[420px] overflow-y-auto">
              {visibleComments.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-400">No replies yet. Start the conversation below.</p>
                </div>
              ) : (
                visibleComments.map((c, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border transition-all ${
                    c.internal 
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
                      : 'bg-slate-50/80 border-slate-200/80 text-slate-800'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                          {c.user?.name ? c.user.name.charAt(0) : 'U'}
                        </div>
                        <span className="text-xs font-bold text-slate-900">{c.user?.name || 'Support Agent'}</span>
                        {c.internal && (
                          <Badge className="bg-amber-500 text-white text-[9px] font-bold py-0 px-1.5">
                            Internal Note
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(c.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-medium whitespace-pre-wrap leading-relaxed">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Quick Macro Dropdown for Staff */}
            {isSupportStaff && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center space-x-2 print:hidden">
                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Quick Macro:</span>
                <div className="flex-1">
                  <CustomSelect
                    value={selectedMacro}
                    onChange={(val) => handleMacroSelect(val)}
                    placeholder="Insert canned response template..."
                    options={cannedMacros.map((m) => ({ value: m.text, label: m.label }))}
                    buttonClassName="py-1 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg shadow-none"
                  />
                </div>
              </div>
            )}

            {/* Rich Markdown Formatting Toolbar */}
            <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 flex items-center justify-between gap-2 print:hidden">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**')}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                  title="Bold (**text**)"
                  aria-label="Format Bold"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*')}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                  title="Italic (*text*)"
                  aria-label="Format Italic"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('`', '`')}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                  title="Code snippet (`code`)"
                  aria-label="Format Code"
                >
                  <Code className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('> ')}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                  title="Quote (> quote)"
                  aria-label="Format Quote"
                >
                  <Quote className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('• ')}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                  title="Bullet list"
                  aria-label="Format Bullet list"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center space-x-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setCommentViewMode('write')}
                  className={`px-2 py-1 rounded-md cursor-pointer ${
                    commentViewMode === 'write' ? 'bg-white text-cyan-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setCommentViewMode('preview')}
                  className={`px-2 py-1 rounded-md cursor-pointer flex items-center space-x-1 ${
                    commentViewMode === 'preview' ? 'bg-white text-cyan-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Comment Form Input / Live Preview */}
            <form onSubmit={handleCommentSubmit} className="p-4 border-t border-slate-200 bg-white space-y-3 print:hidden">
              {commentAttachment && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-50/80 border border-cyan-200 text-xs font-bold text-indigo-950">
                  <div className="flex items-center space-x-2 truncate">
                    <Paperclip className="h-4 w-4 text-cyan-700 shrink-0" />
                    <span className="truncate">{commentAttachment.name} ({(commentAttachment.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCommentAttachment(null)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Remove attachment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {commentViewMode === 'write' ? (
                <textarea
                  id="ticket-comment-textarea"
                  aria-label="Write response or comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={isInternal ? "Write private internal note (visible only to agents & admins)..." : "Write a public reply to the customer..."}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-medium focus:border-cyan-500 focus:outline-none resize-none bg-slate-50/50"
                />
              ) : (
                <div className="w-full rounded-2xl border border-cyan-100 p-3 text-xs font-medium bg-cyan-50/30 min-h-[75px] max-h-40 overflow-y-auto whitespace-pre-wrap text-slate-800">
                  {newComment.trim() ? newComment : <span className="text-slate-400 italic">No comment text to preview.</span>}
                </div>
              )}

              <div className="flex items-center justify-between">
                {isSupportStaff ? (
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
                    />
                    <span className="text-xs font-bold text-amber-700 flex items-center space-x-1">
                      <Lock className="h-3 w-3" />
                      <span>Internal Note (Private)</span>
                    </span>
                  </label>
                ) : <div></div>}

                <div className="flex items-center space-x-2">
                  <label
                    htmlFor="comment-file-attach-input"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-cyan-700 cursor-pointer inline-flex items-center justify-center transition-colors"
                    title="Attach file to reply"
                  >
                    <Paperclip className="h-4 w-4" />
                  </label>
                  <input
                    id="comment-file-attach-input"
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 10 * 1024 * 1024) {
                        alert(`File size exceeds 10MB limit (${(f.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 10MB.`);
                        e.target.value = '';
                        return;
                      }
                      const name = f.name || '';
                      const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')).toLowerCase() : '';
                      const type = (f.type || '').toLowerCase();
                      if (type.startsWith('video/') || ext.match(/\.(mp4|mov|avi|mkv|wmv|flv|webm|3gp|m4v|mpg|mpeg|m4p|ogv|ts)$/i)) {
                        alert(`Video files (${ext || 'video'}) are not allowed. Please upload documents or images.`);
                        e.target.value = '';
                        return;
                      }
                      if (type.includes('zip') || type.includes('x-rar') || type.includes('7z') || type.includes('tar') || type.includes('compressed') || type.includes('archive') || ext.match(/\.(zip|rar|7z|tar|gz|bz2|xz|iso|cab|tgz)$/i)) {
                        alert(`ZIP and compressed archive files (${ext || 'archive'}) are not allowed. Please upload documents or images.`);
                        e.target.value = '';
                        return;
                      }
                      setCommentAttachment(f);
                    }}
                  />

                  <Button
                    type="submit"
                    disabled={(!newComment.trim() && !commentAttachment) || isSubmittingComment}
                    className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md cursor-pointer gap-1.5 h-9 px-4 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingComment ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{commentAttachment ? `Uploading ${commentAttachment.name}...` : 'Sending...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Reply</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>

          </Card>
        </div>

      </div>

      {/* MODERN UI DELETE CONFIRMATION MODAL */}
      {!isSupportStaff && (
        <CsatRatingModal
          isOpen={isCsatModalOpen}
          onClose={() => setIsCsatModalOpen(false)}
          ticket={ticket}
          onSubmitSuccess={(data) => {
            setCsatRating(data.rating);
            setCsatFeedback(data.feedback);
            setCsatTags(data.tags);
            setCsatSubmitted(true);
            triggerToast(`⭐ CSAT rating (${data.rating}/5) recorded!`);
          }}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteTicket}
        title="Delete Support Ticket"
        message="Are you sure you want to delete this ticket? All conversation timeline, resolution metrics, and attachments will be deleted permanently."
        itemName={ticket?.ticketNumber || `#${id}`}
        itemSubtext={ticket?.subject || 'Support Request'}
        confirmText="Yes, Delete Ticket"
        cancelText="Keep Ticket"
        isLoading={isDeleting}
        type="danger"
      />

      {/* EDIT DYNAMIC FORM VALUES MODAL */}
      {isEditingFormValues && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Edit Dynamic Form Values</h3>
                <p className="text-xs text-slate-500">
                  Form: {formTemplate?.name || 'Intake Form'} • Version {formTemplate?.version || ticket?.formVersion || 1} (Historical Immutable Schema)
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

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!ticket?.id) return;
                setSavingFormValues(true);
                try {
                  const payload = {
                    subject: ticket.subject,
                    description: ticket.description,
                    priority: ticket.priority,
                    status: ticket.status,
                    department: ticket.department,
                    categoryId: ticket.categoryId || ticket.category?.id,
                    assignedToId: ticket.assignedToId || ticket.assignedTo?.id,
                    formValues: editFormValues,
                    customFields: editFormValues
                  };
                  const updated = await api.put(`/tickets/${ticket.id}`, payload);
                  const newVals = updated?.formValues || editFormValues;
                  setTicket(prev => ({ ...prev, ...updated, formValues: newVals }));
                  setFormValues(newVals);
                  setIsEditingFormValues(false);
                  triggerToast('✓ Dynamic form submission values updated successfully!');
                  liveChannel.broadcast('TICKET_UPDATED', { ticketId: ticket.id, action: 'FORM_VALUES_UPDATED' });
                } catch (err) {
                  alert(err.message || 'Failed to update dynamic form values.');
                } finally {
                  setSavingFormValues(false);
                }
              }}
              className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
            >
              {formTemplate?.fields && formTemplate.fields.length > 0 ? (
                formTemplate.fields.map((field) => {
                  const key = field.fieldKey || field.label;
                  const currentVal = editFormValues[key] !== undefined ? editFormValues[key] : (editFormValues[field.label] !== undefined ? editFormValues[field.label] : '');
                  return (
                    <div key={field.id || key} className="space-y-1.5 text-left">
                      <label className="block text-xs font-bold text-slate-700">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={currentVal}
                          required={field.required}
                          placeholder={field.placeholder || ''}
                          onChange={(e) => setEditFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500"
                        />
                      ) : (field.type === 'select' || field.type === 'dropdown') ? (
                        <select
                          value={currentVal}
                          required={field.required}
                          onChange={(e) => setEditFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500 bg-white"
                        >
                          <option value="">Select option...</option>
                          {(field.options || []).map((opt) => {
                            const optVal = typeof opt === 'string' ? opt : (opt.value || opt.label);
                            const optLabel = typeof opt === 'string' ? opt : (opt.label || opt.value);
                            return (
                              <option key={optVal} value={optVal}>
                                {optLabel}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : (field.type === 'date' ? 'date' : 'text')}
                          value={currentVal}
                          required={field.required}
                          placeholder={field.placeholder || ''}
                          onChange={(e) => setEditFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500"
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                Object.entries(editFormValues).map(([key, val]) => (
                  <div key={key} className="space-y-1.5 text-left">
                    <label className="block text-xs font-bold text-slate-700">{key}</label>
                    <input
                      type="text"
                      value={val || ''}
                      onChange={(e) => setEditFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                ))
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingFormValues(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFormValues}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingFormValues ? 'Saving...' : 'Save Form Values'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetails;
