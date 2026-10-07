import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import {
  Check,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit2,
  FileSpreadsheet,
  Filter,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Square,
  Tag,
  Ticket,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { createNotification } from '../utils/notify';
import { resolveAutoAssignedAgent } from '../utils/dynamicIndustryEngine';
import { exportTicketsDataset } from '../utils/excelExporter';
import { liveChannel } from '../utils/liveChannel';
import { wsService } from '../services/websocket';
import DragDropUploader from '../components/common/DragDropUploader';
import { triggerUndoableAction } from '../components/common/UndoToast';
import ConfirmModal from '@/components/common/ConfirmModal';
import Pagination from '../components/common/Pagination';
import { extractPageData } from '../utils/paginationHelper';
import CsatRatingModal from '../components/common/CsatRatingModal';

const TicketsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = (user?.role || 'END_USER').toUpperCase();
  const isAgent = role === 'AGENT';
  const isAdmin = role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER';
  const isEndUser = !isAgent && !isAdmin && (role === 'USER' || role === 'END_USER' || role === 'CUSTOMER');

  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [agents, setAgents] = useState([]);
  const [companyFields, setCompanyFields] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Multi-Select & Bulk Operations State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Modern UI Delete Modal State
  const [ratingModalTicket, setRatingModalTicket] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    mode: 'single', // 'single' | 'bulk'
    ticketId: null,
    itemName: '',
    itemSubtext: '',
    isDeleting: false
  });

  // Creation Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [createFormData, setCreateFormData] = useState({
    subject: '',
    description: '',
    priority: 'MEDIUM',
    categoryId: '',
    assignedToId: '',
  });

  // Dynamic custom fields & uploaded file state
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [lastUploadedBase64, setLastUploadedBase64] = useState('');
  const [selectedFileObj, setSelectedFileObj] = useState(null);
  const [selectedFilesMap, setSelectedFilesMap] = useState({});

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null); // 'status' | 'priority' | 'category' | 'department' | null
  const [agentQueueTab, setAgentQueueTab] = useState('ALL'); // 'ALL' | 'MINE' | 'UNASSIGNED'
  const [claimingTicketId, setClaimingTicketId] = useState(null);
  const filterDropdownsRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (filterDropdownsRef.current && !filterDropdownsRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Server-side Pagination States (0-indexed default, size 20 default)
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeCategoryFormTemplate, setActiveCategoryFormTemplate] = useState(null);

  const getIndustryFallbackFields = (comp) => {
    const textToSearch = `${comp?.companyName || user?.companyName || ''} ${comp?.email || ''} ${comp?.website || ''} ${comp?.companyCode || user?.companyCode || ''}`.toLowerCase();
    
    if (textToSearch.includes('bank') || textToSearch.includes('fin') || textToSearch.includes('hdfc') || textToSearch.includes('pay')) {
      return [
        { label: 'Account / Card Number', type: 'text', placeholder: 'e.g. 5432-xxxx-xxxx', required: true },
        { label: 'Transaction Reference ID', type: 'text', placeholder: 'e.g. TXN-9988234', required: false },
        { label: 'Transaction Amount (INR)', type: 'number', placeholder: 'e.g. 5000', required: false },
        { label: 'Attach Proof', type: 'file', required: false }
      ];
    } else if (textToSearch.includes('health') || textToSearch.includes('med') || textToSearch.includes('care') || textToSearch.includes('apollo')) {
      return [
        { label: 'Patient Medical ID (UHID)', type: 'text', placeholder: 'e.g. UHID-9921', required: true },
        { label: 'Attending Doctor / Specialist', type: 'text', placeholder: 'e.g. Dr. Verma', required: false },
        { label: 'Ward / Room Number', type: 'text', placeholder: 'e.g. Room 402-B', required: false },
        { label: 'Lab Prescription Proof', type: 'file', required: false }
      ];
    } else if (textToSearch.includes('oil') || textToSearch.includes('energy') || textToSearch.includes('solar') || textToSearch.includes('refinery')) {
      return [
        { label: 'Rig / Terminal Unit ID', type: 'text', placeholder: 'e.g. RIG-UNIT-04', required: true },
        { label: 'Sensor Code / Hardware Tag', type: 'text', placeholder: 'e.g. PRS-TAG-108', required: true },
        { label: 'Pressure Reading (PSI)', type: 'number', placeholder: 'e.g. 1450', required: false },
        { label: 'Site Inspection Report', type: 'file', required: false }
      ];
    }
    return [
      { label: 'Device / System ID', type: 'text', placeholder: 'e.g. LAPTOP-IN-88', required: false },
      { label: 'Error Code', type: 'text', placeholder: 'e.g. ERR-502-GATEWAY', required: false },
      { label: 'Attach Screenshot', type: 'file', required: false }
    ];
  };

  const isInitialLoadRef = useRef(true);
  const isCreateOpenRef = useRef(isCreateOpen);
  // Zendesk enterprise pattern: prevent duplicate concurrent fetches
  const isFetchingRef = useRef(false);
  // Abort controller: cancel stale in-flight requests when new fetch starts
  const abortControllerRef = useRef(null);
  // Last synced timestamp for live "Updated X ago" indicator
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncLabel, setSyncLabel] = useState('');

  // Update the "Synced X ago" label every 30s
  useEffect(() => {
    const updateSyncLabel = () => {
      if (!lastSyncedAt) { setSyncLabel(''); return; }
      const diffMs = Date.now() - lastSyncedAt;
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 10) setSyncLabel('Synced just now');
      else if (diffSec < 60) setSyncLabel(`Synced ${diffSec}s ago`);
      else if (diffSec < 3600) setSyncLabel(`Synced ${Math.floor(diffSec / 60)}m ago`);
      else setSyncLabel(`Synced ${Math.floor(diffSec / 3600)}h ago`);
    };
    updateSyncLabel();
    const t = setInterval(updateSyncLabel, 30000);
    return () => clearInterval(t);
  }, [lastSyncedAt]);

  useEffect(() => {
    isCreateOpenRef.current = isCreateOpen;
  }, [isCreateOpen]);

  const fetchInitialData = useCallback(async (isSilent = false, pageToFetch = currentPage, sizeToFetch = itemsPerPage) => {
    // Zendesk enterprise: skip if a fetch is already in-flight (request deduplication)
    if (isFetchingRef.current && isSilent) return;

    // AbortController: cancel any previous stale in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    isFetchingRef.current = true;

    try {
      // Zendesk standard: initial mount always shows loading spinner, not stale cache.
      // Silent re-fetches (polling/focus/ws) update data without UI flicker.
      if (!isSilent) {
        setLoading(true);
      }
      setError('');

      const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();
      const compId = user?.companyId;
      const compQuery = compId ? `companyId=${compId}` : `companyCode=${tenantCode}`;

      let ticketsEndpoint = `/tickets?page=${pageToFetch}&size=${sizeToFetch}&sortBy=createdAt&direction=desc`;
      if (searchQuery || (statusFilter && statusFilter !== 'ALL') || (priorityFilter && priorityFilter !== 'ALL') || (departmentFilter && departmentFilter !== 'ALL')) {
        const params = new URLSearchParams();
        params.append('page', String(pageToFetch));
        params.append('size', String(sizeToFetch));
        params.append('sortBy', 'createdAt');
        params.append('direction', 'desc');
        if (searchQuery) params.append('search', searchQuery);
        if (statusFilter && statusFilter !== 'ALL') params.append('statuses', statusFilter);
        if (priorityFilter && priorityFilter !== 'ALL') params.append('priorities', priorityFilter);
        if (departmentFilter && departmentFilter !== 'ALL') params.append('department', departmentFilter);
        ticketsEndpoint = `/tickets/search?${params.toString()}`;
      }

      const [ticketsData, categoriesData, agentsData] = await Promise.all([
        api.get(ticketsEndpoint).catch(() => null),
        api.get(`/categories?${compQuery}`).catch(() => null),
        api.get('/users/agents').catch(() => null),
      ]);

      let finalTickets = [];
      const pageData = extractPageData(ticketsData, pageToFetch, sizeToFetch);

      const isEndUserRole = user?.role === 'END_USER' || user?.role === 'CUSTOMER' || user?.role === 'USER';
      if (ticketsData !== null) {
        const rawTicketsList = pageData.content;
        // Authoritative live backend response:
        // SUPER_ADMIN has global visibility.
        // END_USER/CUSTOMER: backend already strictly returns only this customer's tickets.
        finalTickets = (user?.role === 'SUPER_ADMIN' || isEndUserRole) ? rawTicketsList : rawTicketsList.filter(t => {
          const tCompId = t.company?.id || t.companyId;
          const tCompCode = (t.company?.companyCode || t.company?.code || t.companyCode || t.tenantId || '').toUpperCase();
          if (compId && tCompId) return Number(tCompId) === Number(compId);
          if (tenantCode && tCompCode) return tCompCode === tenantCode;
          return true; // Keep tickets instead of dropping if tenantCode format differs
        });
        setTotalElements(pageData.totalElements);
        setTotalPages(pageData.totalPages);
        setCurrentPage(pageData.page);
      } else {
        // Fallback to user-scoped session storage ONLY when backend network call failed completely (offline)
        const userScopedKey = `tp_tickets_${user?.id || 'guest'}_${user?.role || 'USER'}_${tenantCode}`;
        const stored = sessionStorage.getItem(userScopedKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              finalTickets = parsed;
            }
          } catch (_e) {}
        }
      }

      setTickets(finalTickets);
      // Record successful sync timestamp (Zendesk "last updated" indicator)
      setLastSyncedAt(Date.now());
      setSyncLabel('Synced just now');

      // Write to sessionStorage as offline-fallback ONLY — never read back as initial state
      if (user?.id) {
        try {
          const userScopedKey = `tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`;
          sessionStorage.setItem(userScopedKey, JSON.stringify(finalTickets));
        } catch (_e) {}
      }

      // Categories with Complete Merged Live Form Builder Schemas
      const storedCatsRaw = localStorage.getItem(`ticketpro_categories_${tenantCode}`) || localStorage.getItem('ticketpro_categories');
      let localCats = [];
      if (storedCatsRaw) {
        try {
          const parsed = JSON.parse(storedCatsRaw);
          if (Array.isArray(parsed)) localCats = parsed;
        } catch (_e) {}
      }

      const mergedCatsMap = new Map();

      // 1. Populate all local categories first (preserves user-created categories & custom fields)
      localCats.forEach(lc => {
        const idKey = String(lc.id || lc.name);
        mergedCatsMap.set(idKey, lc);
      });

      // 2. Augment / merge with backend categories
      if (Array.isArray(categoriesData) && categoriesData.length > 0) {
        categoriesData.forEach(bc => {
          const idKey = String(bc.id);
          // Check if local has matching ID or Name
          let localMatch = null;
          for (const val of mergedCatsMap.values()) {
            if (String(val.id) === idKey || (val.name && bc.name && val.name.trim().toLowerCase() === bc.name.trim().toLowerCase())) {
              localMatch = val;
              break;
            }
          }

          // Prioritize MySQL database fields so cross-device and cross-browser updates are instant
          const bcFields = resolveCategoryCustomFields(bc);
          const localFields = localMatch ? resolveCategoryCustomFields(localMatch) : [];
          const customFields = (bcFields && bcFields.length > 0) ? bcFields : localFields;

          const merged = {
            ...(localMatch || {}),
            ...bc,
            name: bc.name || localMatch?.name,
            customFields: (customFields && customFields.length > 0) ? customFields : (bc.customFields || []),
            isPublished: bc.isPublished !== undefined ? bc.isPublished : (localMatch?.isPublished !== undefined ? localMatch.isPublished : true),
            targetDepartment: bc.targetDepartment || localMatch?.targetDepartment
          };

          mergedCatsMap.set(idKey, merged);
        });
      }

      // Convert back to category list
      const cats = Array.from(mergedCatsMap.values());

      try {
        localStorage.setItem(`ticketpro_categories_${tenantCode}`, JSON.stringify(cats));
      } catch(_e) {}

      setCategories(cats);
      if (cats.length > 0 && !isCreateOpenRef.current) {
        setActiveCategory(prev => {
          if (prev && cats.some(c => String(c.id) === String(prev.id) || c.name === prev.name)) {
            return cats.find(c => String(c.id) === String(prev.id) || c.name === prev.name);
          }
          return cats[0];
        });
        setCreateFormData(prev => {
          const stillValid = cats.some(c => String(c.id) === String(prev.categoryId));
          return { ...prev, categoryId: stillValid ? prev.categoryId : cats[0].id };
        });
      }

      // Agents - for ticket assignment dropdowns
      setAgents(Array.isArray(agentsData) ? agentsData : []);

      // Company custom fields from company record
      if (user?.companyId) {
        const compDetails = await api.get(`/companies/${user.companyId}`).catch(() => null);
        if (compDetails?.customFields) {
          try {
            const parsed = JSON.parse(compDetails.customFields);
            if (Array.isArray(parsed)) setCompanyFields(parsed);
            else setCompanyFields(getIndustryFallbackFields(compDetails));
          } catch (_e) {
            setCompanyFields(getIndustryFallbackFields(compDetails));
          }
        } else {
          setCompanyFields(getIndustryFallbackFields(compDetails));
        }
      }
    } catch (_err) {
      if (_err?.name === 'AbortError') return; // Cancelled — don't update state
      console.error('Tickets load error:', _err);
      setError('Failed to load tickets. Please refresh the page.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();

    // Subscribe to multi-tab real-time live channel broadcasts
    const unsubTicket = liveChannel.subscribe('TICKET_UPDATED', () => {
      fetchInitialData(true);
    });

    // Real-time synchronization when Super Admin or Admin customizes categories or form schemas
    const unsubCategory = liveChannel.subscribe('CATEGORY_UPDATED', (payload) => {
      const myCompCode = (user?.companyCode || 'DEFAULT').toUpperCase();
      const myCompId = user?.companyId;
      if (!payload || !payload.companyCode || payload.companyCode.toUpperCase() === myCompCode || (myCompId && payload.companyId === myCompId) || user?.role === 'SUPER_ADMIN') {
        if (!isCreateOpenRef.current) fetchInitialData(true);
      }
    });

    const unsubForm = liveChannel.subscribe('FORM_UPDATED', (payload) => {
      const myCompCode = (user?.companyCode || 'DEFAULT').toUpperCase();
      const myCompId = user?.companyId;
      if (!payload || !payload.companyCode || payload.companyCode.toUpperCase() === myCompCode || (myCompId && payload.companyId === myCompId) || user?.role === 'SUPER_ADMIN') {
        if (!isCreateOpenRef.current) fetchInitialData(true);
      }
    });

    const handleWindowCategoryEvent = (e) => {
      const myCompCode = (user?.companyCode || 'DEFAULT').toUpperCase();
      const eventCode = e?.detail?.companyCode;
      if (!eventCode || eventCode.toUpperCase() === myCompCode || (user?.companyId && e?.detail?.companyId === user.companyId) || user?.role === 'SUPER_ADMIN') {
        if (!isCreateOpenRef.current) fetchInitialData(true);
      }
    };

    const handleStorageEvent = (e) => {
      if (e.key && (e.key.startsWith('ticketpro_categories') || e.key.startsWith('ticketpro_form'))) {
        if (!isCreateOpenRef.current) fetchInitialData(true);
      }
    };

    // Auto-refresh from DB when tab gains focus (Zendesk standard behavior)
    const handleWindowFocus = () => {
      if (isCreateOpenRef.current) return;
      fetchInitialData(true);
    };

    // Refresh from DB when tab becomes visible again (e.g. switching between browser tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isCreateOpenRef.current) {
        fetchInitialData(true);
      }
    };

    // Real-time WebSocket subscriptions for live updates (tenant-scoped; GLOBAL only for SUPER_ADMIN)
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const compCode = (user?.companyCode || 'DEFAULT').toUpperCase();

    const unsubWsGlobal = isSuperAdmin ? wsService.subscribe('/topic/tickets/GLOBAL', () => {
      fetchInitialData(true);
    }) : () => {};

    const unsubWsComp = wsService.subscribe(`/topic/tickets/${compCode}`, () => {
      fetchInitialData(true);
    });

    const unsubWsDelGlobal = isSuperAdmin ? wsService.subscribe('/topic/tickets/GLOBAL/deleted', (deletedId) => {
      if (deletedId) {
        setTickets(prev => prev.filter(t => t.id !== Number(deletedId)));
      }
    }) : () => {};

    const unsubWsDelComp = wsService.subscribe(`/topic/tickets/${compCode}/deleted`, (deletedId) => {
      if (deletedId) {
        setTickets(prev => prev.filter(t => t.id !== Number(deletedId)));
      }
    });

    const handleRealtimeDomEvent = (e) => {
      const dest = e?.detail?.destination;
      if (dest && dest.includes('/topic/tickets')) {
        fetchInitialData(true);
      }
    };

    window.addEventListener('ticketpro_realtime_event', handleRealtimeDomEvent);
    window.addEventListener('ticketpro_categories_updated', handleWindowCategoryEvent);
    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Enterprise Zendesk/Jira standard: 45s smooth background heartbeat polling
    const pollingInterval = setInterval(() => {
      if (!isCreateOpenRef.current) fetchInitialData(true);
    }, 45000);

    return () => {
      clearInterval(pollingInterval);
      unsubTicket();
      unsubCategory();
      unsubForm();
      if (typeof unsubWsGlobal === 'function') unsubWsGlobal();
      if (typeof unsubWsComp === 'function') unsubWsComp();
      if (typeof unsubWsDelGlobal === 'function') unsubWsDelGlobal();
      if (typeof unsubWsDelComp === 'function') unsubWsDelComp();
      window.removeEventListener('ticketpro_realtime_event', handleRealtimeDomEvent);
      window.removeEventListener('ticketpro_categories_updated', handleWindowCategoryEvent);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchInitialData, user]);

  // Handle Category Select change in creation modal
  const handleCategorySelectChange = async (catId) => {
    const selected = categories.find(c => String(c.id) === String(catId)) || categories.find(c => c.name === catId);
    setActiveCategory(selected || null);
    setCreateFormData(prev => ({ ...prev, categoryId: catId }));
    setActiveCategoryFormTemplate(null);
    
    // Check if there is an active Dynamic Form Template for this category on backend
    if (catId) {
      try {
        const tpl = await api.get(`/form-templates/category/${catId}`).catch(() => null);
        if (tpl && tpl.fields && tpl.fields.length > 0) {
          setActiveCategoryFormTemplate(tpl);
          const defaults = {};
          tpl.fields.forEach(f => {
            if ((f.type === 'select' || f.type === 'dropdown' || f.type === 'radio') && f.options) {
              const opts = Array.isArray(f.options) ? f.options : (typeof f.options === 'string' ? f.options.split(',').map(o => o.trim()).filter(Boolean) : []);
              if (opts.length > 0) defaults[f.fieldKey || f.label] = opts[0];
            }
          });
          setCustomFieldValues(defaults);
          return;
        }
      } catch (_e) {}
    }

    if (selected) {
      const resolved = resolveCategoryCustomFields(selected);
      const defaults = {};
      resolved.forEach(f => {
        if ((f.type === 'select' || f.type === 'dropdown' || f.type === 'radio') && f.options) {
          const opts = Array.isArray(f.options) ? f.options : (typeof f.options === 'string' ? f.options.split(',').map(o => o.trim()).filter(Boolean) : []);
          if (opts.length > 0) defaults[f.label] = opts[0];
        }
      });
      setCustomFieldValues(defaults);
    }
  };

  const handleOpenCreateModal = () => {
    const tenantCode = (user?.companyCode || 'WORKSPACE').toUpperCase();
    const compId = user?.companyId;
    const compQuery = compId ? `companyId=${compId}&companyCode=${tenantCode}` : `companyCode=${tenantCode}`;

    // Background refresh from backend MySQL database to ensure freshest custom intake fields
    api.get(`/categories?${compQuery}`).then(freshApiCats => {
      if (Array.isArray(freshApiCats) && freshApiCats.length > 0) {
        const mapped = freshApiCats.map(c => {
          let fields = [];
          if (c.description && c.description.includes('FIELDS:')) {
            try {
              fields = JSON.parse(c.description.substring(c.description.indexOf('FIELDS:') + 7));
            } catch(e) {}
          }
          return {
            ...c,
            customFields: fields.length > 0 ? fields : (c.customFields || []),
            fieldCount: fields.length > 0 ? fields.length : (c.fieldCount || 0)
          };
        });
        setCategories(mapped);
      }
    }).catch(() => {});
    let liveCats = (Array.isArray(categories) && categories.length > 0) ? [...categories] : [];
    
    // Only fall back to local storage if state is empty
    if (liveCats.length === 0) {
      const storedCatsRaw = localStorage.getItem(`ticketpro_categories_${tenantCode}`) || localStorage.getItem('ticketpro_categories');
      if (storedCatsRaw) {
        try {
          const parsed = JSON.parse(storedCatsRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            liveCats = parsed;
            setCategories(parsed);
          }
        } catch (_e) {}
      }
    }

    if (liveCats.length > 0) {
      const currentCat = activeCategory && liveCats.some(c => String(c.id) === String(activeCategory.id) || c.name === activeCategory.name)
        ? liveCats.find(c => String(c.id) === String(activeCategory.id) || c.name === activeCategory.name)
        : liveCats[0];

      setActiveCategory(currentCat);
      setCreateFormData({
        subject: '',
        description: '',
        priority: 'MEDIUM',
        categoryId: currentCat.id,
        assignedToId: '',
      });
      const resolved = resolveCategoryCustomFields(currentCat);
      const defaults = {};
      resolved.forEach(f => {
        if ((f.type === 'select' || f.type === 'dropdown' || f.type === 'radio') && f.options) {
          const opts = Array.isArray(f.options) ? f.options : (typeof f.options === 'string' ? f.options.split(',').map(o => o.trim()).filter(Boolean) : []);
          if (opts.length > 0) defaults[f.label] = opts[0];
        }
      });
      setCustomFieldValues(defaults);
    } else {
      setCreateFormData({
        subject: '',
        description: '',
        priority: 'MEDIUM',
        categoryId: '',
        assignedToId: '',
      });
      setCustomFieldValues({});
    }
    setLastUploadedBase64('');
    setSelectedFileObj(null);
    setSelectedFilesMap({});
    setIsCreateOpen(true);
  };

    // Robust helper to resolve category custom fields from any source
  const resolveCategoryCustomFields = (cat) => {
    if (!cat) return [];

    // 1. Direct customFields array
    if (Array.isArray(cat.customFields) && cat.customFields.length > 0) {
      return cat.customFields;
    }

    // 2. Stringified array
    if (typeof cat.customFields === 'string' && cat.customFields.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(cat.customFields);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_e) {}
    }

    // 3. Description with FIELDS: prefix
    if (cat.description && typeof cat.description === 'string' && cat.description.includes('FIELDS:')) {
      try {
        const jsonStr = cat.description.substring(cat.description.indexOf('FIELDS:') + 7);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_e) {}
    }

    // 4. LocalStorage cached keys by ID / Name / Lowercase / Trimmed
    try {
      const candidateKeys = [
        cat.id ? `ticketpro_form_${cat.id}` : null,
        cat.name ? `ticketpro_form_${cat.name}` : null,
        cat.name ? `ticketpro_form_${cat.name.trim()}` : null,
        cat.name ? `ticketpro_form_${cat.name.trim().toLowerCase()}` : null,
      ].filter(Boolean);

      for (const key of candidateKeys) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch(_e) {}
        }
      }

      // 5. Scan all ticketpro_categories_* in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ticketpro_categories')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const found = list.find(c => 
                  (cat.id != null && String(c.id) === String(cat.id)) ||
                  (cat.name && c.name && c.name.trim().toLowerCase() === cat.name.trim().toLowerCase())
                );
                if (found) {
                  if (Array.isArray(found.customFields) && found.customFields.length > 0) return found.customFields;
                  if (found.description && found.description.includes('FIELDS:')) {
                    const jsonStr = found.description.substring(found.description.indexOf('FIELDS:') + 7);
                    const parsed = JSON.parse(jsonStr);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                  }
                }
              }
            } catch(_e) {}
          }
        }
      }
    } catch (_e) {}

    return [];
  };

  // Helper for dynamic fields directly from Form Builder / Category configuration
  const getCategorySpecificFields = () => {
    if (activeCategoryFormTemplate?.fields?.length > 0) {
      return activeCategoryFormTemplate.fields;
    }
    let resolved = [];
    if (activeCategory) {
      resolved = resolveCategoryCustomFields(activeCategory);
    }
    if (!resolved || resolved.length === 0) {
      if (createFormData.categoryId) {
        const matched = categories.find(c => String(c.id) === String(createFormData.categoryId) || c.name === createFormData.categoryId);
        if (matched) resolved = resolveCategoryCustomFields(matched);
      }
    }
    if (resolved && resolved.length > 0) {
      return resolved;
    }
    if (companyFields && companyFields.length > 0) {
      return companyFields;
    }
    return [];
  };

  const getActiveBranch = (field, allFields, values) => {
    if (!Array.isArray(field.branches) || field.branches.length === 0) return null;

    // 1. Check if user explicitly selected a dropdown / radio option in form that controls this branch
    const depName = (field.dependsOn || '').trim().toLowerCase();
    const parentField = allFields.find(f => {
      if (f.type !== 'select' && f.type !== 'dropdown' && f.type !== 'radio') return false;
      const fLabel = (f.label || '').trim().toLowerCase();
      if (depName && (fLabel === depName || fLabel.includes(depName) || depName.includes(fLabel))) return true;
      // Or if dropdown options overlap with branch values
      const opts = Array.isArray(f.options) ? f.options : [];
      return opts.some(opt => field.branches.some(b => {
        const bClean = (b.value || b.label || '').toLowerCase().trim().replace(/\s*form$/, '');
        const optClean = opt.toLowerCase().trim().replace(/\s*form$/, '');
        return bClean === optClean || bClean.includes(optClean) || optClean.includes(bClean);
      }));
    });

    if (parentField) {
      const selectedVal = values[parentField.label] || values[parentField.id] || values[parentField.label?.replace(/\s*\*$/, '')];
      if (selectedVal) {
        const cleanSelected = selectedVal.toString().trim().toLowerCase().replace(/\s*form$/, '');
        const matched = field.branches.find(b => {
          const bVal = (b.value || b.label || '').toString().trim().toLowerCase().replace(/\s*form$/, '');
          return bVal === cleanSelected || cleanSelected.includes(bVal) || bVal.includes(cleanSelected);
        });
        if (matched) return matched;
      }
    }

    // 2. Direct branch tab selected by user in modal
    const directSelectedBranch = values[field.id + '_activeBranch'];
    if (directSelectedBranch) {
      const cleanDirect = directSelectedBranch.trim().toLowerCase().replace(/\s*form$/, '');
      const found = field.branches.find(b => {
        const bClean = (b.value || b.label || '').trim().toLowerCase().replace(/\s*form$/, '');
        return bClean === cleanDirect || cleanDirect.includes(bClean) || bClean.includes(cleanDirect);
      });
      if (found) return found;
    }

    // 3. If field has activeBranchTab set
    if (field.activeBranchTab) {
      const cleanTab = field.activeBranchTab.trim().toLowerCase().replace(/\s*form$/, '');
      const found = field.branches.find(b => {
        const bClean = (b.value || b.label || '').trim().toLowerCase().replace(/\s*form$/, '');
        return bClean === cleanTab || cleanTab.includes(bClean) || bClean.includes(cleanTab);
      });
      if (found) return found;
    }

    // 4. Default fallback to the first branch so subform is ALWAYS accessible
    return field.branches[0];
  };

  const handleDragDropFile = (fileInput, fieldLabel = 'Attachment') => {
    const rawLabel = fieldLabel || 'Attachment';
    const trimmedLabel = rawLabel.trim();

    if (!fileInput) {
      setSelectedFilesMap(prev => {
        const next = { ...prev };
        delete next[rawLabel];
        delete next[trimmedLabel];
        const remaining = Object.values(next).filter(Boolean);
        setSelectedFileObj(remaining.length > 0 ? remaining[0] : null);
        if (remaining.length === 0) {
          setLastUploadedBase64('');
          try {
            localStorage.removeItem('ticket_file_latest');
          } catch (_err) {}
        }
        return next;
      });
      setCustomFieldValues(prev => {
        const next = { ...prev };
        delete next[rawLabel];
        delete next[trimmedLabel];
        if (rawLabel === 'Attachment' || trimmedLabel === 'Attachment') {
          delete next['Attachment'];
        }
        return next;
      });
      return;
    }

    const normalizeFile = (value) => {
      if (!value) return null;
      if (value instanceof File) return value;
      if (value.file instanceof File) return value.file;
      if (value.target && value.target.files && value.target.files[0]) return value.target.files[0];
      return null;
    };

    const file = normalizeFile(fileInput);
    const fileName = file?.name || fileInput?.name || 'attachment';

    setCustomFieldValues(prev => ({
      ...prev,
      [rawLabel]: fileName,
      [trimmedLabel]: fileName,
      ...(rawLabel.toLowerCase().includes('attach') || rawLabel === 'Attachment' ? { Attachment: fileName } : {})
    }));

    if (file) {
      setSelectedFileObj(file);
      setSelectedFilesMap(prev => ({
        ...prev,
        [rawLabel]: file,
        [trimmedLabel]: file
      }));

      try {
        const reader = new FileReader();
        reader.onload = (re) => {
          const b64 = re.target?.result;
          if (b64) {
            setLastUploadedBase64(b64);
            try {
              localStorage.setItem('ticket_file_latest', b64);
            } catch (_e) {}
          }
        };
        reader.readAsDataURL(file);
      } catch (_err) {}
    }
  };

  const handleFileChange = (fieldLabel, e) => {
    const file = e.target.files?.[0];
    if (file) {
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
      setSelectedFileObj(file);
      setCustomFieldValues(prev => ({ ...prev, [fieldLabel]: file.name }));
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target.result;
        setLastUploadedBase64(base64Data);
        try {
          localStorage.setItem('ticket_file_latest', base64Data);
        } catch (_err) {}
      };
      reader.readAsDataURL(file);
    }
  };

  // Rename single ticket
  const handleRenameTicket = (ticket, e) => {
    e.stopPropagation();
    const newSubject = window.prompt('Rename Ticket Subject:', ticket.subject);
    if (!newSubject || !newSubject.trim() || newSubject.trim() === ticket.subject) return;

    const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();
    const updatedList = tickets.map(t => t.id === ticket.id ? { ...t, subject: newSubject.trim() } : t);
    setTickets(updatedList);

    try {
      if (user?.id) {
        sessionStorage.setItem(`tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`, JSON.stringify(updatedList));
      }
      liveChannel.broadcast('TICKET_UPDATED', { ticketId: ticket.id, action: 'RENAME' });
    } catch(_e) {}

    api.put(`/tickets/${ticket.id}`, { subject: newSubject.trim() }).catch(() => null);
  };

  // Delete single ticket
  const handleDeleteTicket = (ticketId, e) => {
    if (e) e.stopPropagation();
    const t = tickets.find(item => item.id === ticketId);
    setDeleteModal({
      isOpen: true,
      mode: 'single',
      ticketId: ticketId,
      itemName: t?.ticketNumber || `#${ticketId}`,
      itemSubtext: t?.subject || 'Support Ticket',
      isDeleting: false
    });
  };

  const customFieldsToRender = getCategorySpecificFields();
  const subjectCustomField = customFieldsToRender.find(f => {
    const lbl = (f?.label || '').toLowerCase().trim();
    return lbl === 'subject' || lbl === 'issue summary' || lbl === 'ticket subject';
  });
  const descCustomField = customFieldsToRender.find(f => {
    const lbl = (f?.label || '').toLowerCase().trim();
    return lbl === 'description' || lbl === 'issue description' || lbl === 'details' || lbl === 'problem details';
  });

  const hasCustomFileField = customFieldsToRender.some(f => {
    const t = (f?.type || f?.fieldType || '').toLowerCase();
    if (t === 'file') return true;
    if (t === 'conditional_section' && Array.isArray(f.branches)) {
      return f.branches.some(b => Array.isArray(b.fields) && b.fields.some(sf => (sf?.type || sf?.fieldType || '').toLowerCase() === 'file'));
    }
    return false;
  });

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingTicket) return;
    setIsSubmittingTicket(true);

    try {
      // Check required file fields from Form Builder (both top-level and conditional sub-branches)
      for (const f of customFieldsToRender) {
        const t = (f?.type || f?.fieldType || '').toLowerCase();
        if (f.required && t === 'file') {
          const rawLbl = f.label || '';
          const trimmedLbl = rawLbl.trim();
          const hasFile = selectedFileObj ||
                          selectedFilesMap[rawLbl] ||
                          selectedFilesMap[trimmedLbl] ||
                          customFieldValues[rawLbl] ||
                          customFieldValues[trimmedLbl] ||
                          (selectedFilesMap && Object.values(selectedFilesMap).some(Boolean));
          if (!hasFile) {
            alert(`Please upload a file/document for required field: "${rawLbl}"`);
            setIsSubmittingTicket(false);
            return;
          }
        }
        if (t === 'conditional_section' && Array.isArray(f.branches)) {
          const activeBranch = getActiveBranch(f, customFieldsToRender, customFieldValues);
          const subFields = (activeBranch && Array.isArray(activeBranch.fields)) ? activeBranch.fields : (Array.isArray(f.fields) ? f.fields : []);
          for (const sub of subFields) {
            const st = (sub?.type || sub?.fieldType || '').toLowerCase();
            if (sub.required && st === 'file') {
              const rawSubLbl = sub.label || '';
              const trimmedSubLbl = rawSubLbl.trim();
              const hasSubFile = selectedFileObj ||
                                 selectedFilesMap[rawSubLbl] ||
                                 selectedFilesMap[trimmedSubLbl] ||
                                 customFieldValues[rawSubLbl] ||
                                 customFieldValues[trimmedSubLbl] ||
                                 (selectedFilesMap && Object.values(selectedFilesMap).some(Boolean));
              if (!hasSubFile) {
                alert(`Please upload a file/document for required field: "${rawSubLbl}"`);
                setIsSubmittingTicket(false);
                return;
              }
            }
          }
        }
      }

      const formSubject = subjectCustomField ? customFieldValues[subjectCustomField.label] : '';
      const finalSubject = formSubject || createFormData.subject || `Support Request - ${activeCategory?.name || 'General'}`;

      const formDesc = descCustomField ? customFieldValues[descCustomField.label] : '';
      let finalDescription = formDesc || createFormData.description || `Ticket created for ${activeCategory?.name || 'General Support'}`;
      
      if (customFieldsToRender.length > 0) {
        finalDescription += '\n\n--- DYNAMIC FORM BUILDER FIELDS ---';
        customFieldsToRender.forEach(f => {
          const fieldType = (f.type || '').toLowerCase();
          if (fieldType === 'conditional_section') {
            const activeBranch = getActiveBranch(f, customFieldsToRender, customFieldValues);
            if (activeBranch && Array.isArray(activeBranch.fields)) {
              finalDescription += `

[Section: ${activeBranch.label || activeBranch.value}]`;
              activeBranch.fields.forEach(sub => {
                const fieldSubFile = selectedFilesMap[sub.label] || selectedFilesMap[(sub.label || '').trim()];
                const val = (customFieldValues[sub.label] !== undefined && customFieldValues[sub.label] !== '') ? customFieldValues[sub.label] : (fieldSubFile ? fieldSubFile.name : '');
                finalDescription += `
${sub.label}: ${val}`;
              });
            }
          } else {
            const fieldFile = selectedFilesMap[f.label] || selectedFilesMap[(f.label || '').trim()];
            const val = (customFieldValues[f.label] !== undefined && customFieldValues[f.label] !== '') ? customFieldValues[f.label] : (fieldFile ? fieldFile.name : '');
            finalDescription += `
${f.label}: ${val}`;
          }
        });
      }

      const attachedFileName = selectedFileObj?.name || customFieldValues['Attachment'] || customFieldValues['Attach Proof'] || customFieldValues['File Upload'];
      if (attachedFileName) {
        finalDescription += `

Attachment: ${attachedFileName}`;
      }

      const compCode = (user?.companyCode || 'WORKSPACE').toUpperCase();
      const issueTypeStr = customFieldValues['Issue Type'] || customFieldValues['Issue Category'] || customFieldValues['Fault Type'] || customFieldValues['Device Category'] || customFieldValues['Hardware Fault Code'] || '';
      const autoAssignedObj = resolveAutoAssignedAgent(activeCategory?.name, createFormData.priority, issueTypeStr, customFieldValues, compCode, user?.companyName);

      const catNameLower = (activeCategory?.name || '').toLowerCase();
      const targetDept = activeCategory?.targetDepartment || (
        catNameLower.includes('kyc') || catNameLower.includes('onboard') || catNameLower.includes('hr') || catNameLower.includes('leave') || catNameLower.includes('payroll') || catNameLower.includes('employee') || catNameLower.includes('verification') ? 'Human Resources (HR)' :
        catNameLower.includes('loan') || catNameLower.includes('payment') || catNameLower.includes('card') || catNameLower.includes('finance') || catNameLower.includes('billing') || catNameLower.includes('reimbursement') || catNameLower.includes('salary') ? 'Finance & Accounting' :
        catNameLower.includes('sales') || catNameLower.includes('marketing') || catNameLower.includes('lead') ? 'Sales & Marketing' :
        catNameLower.includes('ops') || catNameLower.includes('fleet') || catNameLower.includes('logistics') || catNameLower.includes('tanker') || catNameLower.includes('terminal') || catNameLower.includes('vehicle') || catNameLower.includes('route') || catNameLower.includes('geofence') ? 'Fleet & Telematics (Control Room)' :
        catNameLower.includes('hardware') || catNameLower.includes('iot') || catNameLower.includes('device') || catNameLower.includes('sensor') || catNameLower.includes('gps') ? 'Hardware & IoT Engineering' :
        catNameLower.includes('supply') || catNameLower.includes('chain') || catNameLower.includes('plant') || catNameLower.includes('distributor') || catNameLower.includes('toll') ? 'Supply Chain & Terminal Ops' :
        catNameLower.includes('user') || catNameLower.includes('identity') || catNameLower.includes('account') || catNameLower.includes('tech') || catNameLower.includes('net') || catNameLower.includes('access') || catNameLower.includes('it') || catNameLower.includes('software') || catNameLower.includes('system') || catNameLower.includes('ssl') || catNameLower.includes('portal') || catNameLower.includes('login') || catNameLower.includes('password') ? 'IT & Digital Infrastructure' :
        'Customer Support'
      );

      const newTicket = await api.post('/tickets', {
        subject: finalSubject,
        description: finalDescription,
        priority: createFormData.priority,
        categoryId: createFormData.categoryId ? parseInt(createFormData.categoryId) : (activeCategory?.id ? parseInt(activeCategory.id) : null),
        department: targetDept,
        assignedToId: createFormData.assignedToId ? parseInt(createFormData.assignedToId) : null,
        companyCode: compCode,
        creatorEmail: user?.email,
        createdById: user?.id,
        formValues: customFieldValues,
        customFields: customFieldValues,
      });

      if (!newTicket || !newTicket.id) {
        throw new Error('Server did not return a valid ticket response.');
      }

      if (newTicket) {
        newTicket.companyCode = compCode;
        newTicket.tenantId = compCode;
        newTicket.creatorEmail = user?.email || newTicket.createdBy?.email || 'customer@company.com';
        newTicket.creatorName = user?.name || newTicket.createdBy?.name || 'Customer';
        newTicket.createdById = user?.id || newTicket.createdBy?.id;
        newTicket.createdBy = newTicket.createdBy || { id: user?.id, email: user?.email, name: user?.name };
        if (!newTicket.ticketNumber || !newTicket.ticketNumber.includes(compCode)) {
          newTicket.ticketNumber = `#${compCode}-TK-${newTicket.id || Math.floor(1000 + Math.random() * 9000)}`;
        }
        newTicket.status = newTicket.status || 'NEW';
        newTicket.department = newTicket.department || targetDept;
        newTicket.categoryName = activeCategory?.name || 'General Support';
        newTicket.category = activeCategory || { id: createFormData.categoryId || 1, name: activeCategory?.name || 'General Operations', targetDepartment: targetDept };
        
        if (newTicket.assignedTo && (newTicket.assignedTo.name || newTicket.assignedTo.email)) {
          newTicket.agentName = newTicket.assignedTo.name || newTicket.assignedTo.email;
          newTicket.assignedToId = newTicket.assignedTo.id || newTicket.assignedToId;
          newTicket.assignedAgent = newTicket.assignedTo.name || newTicket.agentName;
          newTicket.autoAssignedReason = `⚡ Auto-Assigned (${newTicket.department || targetDept} Least-Loaded)`;
        } else {
          newTicket.agentName = null;
          newTicket.assignedTo = null;
          newTicket.assignedToId = null;
          newTicket.assignedAgent = null;
          newTicket.autoAssignedReason = null;
        }
      }

      // Collect all selected files to upload to backend attachments
      const rawFiles = [...Object.values(selectedFilesMap || {}).filter(Boolean)];
      if (selectedFileObj && !rawFiles.some(f => f.name === selectedFileObj.name && f.size === selectedFileObj.size)) {
        rawFiles.push(selectedFileObj);
      }
      // Deduplicate files by filename and size
      const uniqueFilesMap = new Map();
      rawFiles.forEach(f => {
        if (f && f.name) {
          const key = `${f.name}_${f.size || 0}`;
          if (!uniqueFilesMap.has(key)) uniqueFilesMap.set(key, f);
        }
      });
      const filesToUpload = Array.from(uniqueFilesMap.values());

      if (newTicket?.id && filesToUpload.length > 0) {
        const uploadedAttachments = [];
        for (const fileItem of filesToUpload) {
          try {
            const formData = new FormData();
            formData.append('file', fileItem);
            if (user?.email) {
              formData.append('uploaderEmail', user.email);
            }
            const attResp = await api.post(`/tickets/${newTicket.id}/attachments`, formData);
            if (attResp) {
              uploadedAttachments.push(attResp);
            }
          } catch (uploadErr) {
            console.error(`Backend attachment upload warning for ${fileItem.name}:`, uploadErr);
            alert(`Attachment Notice: Ticket #${newTicket.ticketNumber || newTicket.id} was created, but attachment "${fileItem.name}" had an upload issue: ${uploadErr.message || 'Server error'}`);
          }
        }
        if (uploadedAttachments.length > 0) {
          newTicket.attachments = uploadedAttachments;
        }
      }

      if (lastUploadedBase64) {
        try {
          if (newTicket.id) {
            localStorage.setItem('ticket_file_id_' + newTicket.id, lastUploadedBase64);
          }
          if (newTicket.ticketNumber) {
            localStorage.setItem('ticket_file_num_' + newTicket.ticketNumber, lastUploadedBase64);
          }
          localStorage.setItem('ticket_file_latest', lastUploadedBase64);
        } catch (_err) {}
      }
      setSelectedFileObj(null);
      setSelectedFilesMap({});

      const updatedList = [newTicket, ...tickets.filter(t => t.id !== newTicket.id)];
      setTickets(updatedList);

      try {
        if (user?.id) {
          sessionStorage.setItem(`tp_tickets_${user.id}_${user.role || 'USER'}_${compCode}`, JSON.stringify(updatedList));
        }
        liveChannel.broadcast('TICKET_UPDATED', { ticketId: newTicket.id, action: 'CREATE' });
      } catch(_e) {}
      
      const companyCodeLower = compCode.toLowerCase();
      const creatorEmail = user?.email || `user@${companyCodeLower}.com`;
      const adminEmail = `admin@${companyCodeLower}.com`;

      let cleanNum = (newTicket?.ticketNumber || '').replace(/^[#]+/, '');
      if (!cleanNum) {
        cleanNum = `TK-${compCode}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const finalAgentName = newTicket.assignedTo?.name || newTicket.agentName || autoAssignedObj.agentName || 'Assigned Specialist';
      createNotification({
        title: `Ticket #${cleanNum} Created`,
        message: `Subject: "${newTicket.subject}" | Assigned: ${finalAgentName}`,
        type: 'TICKET_ASSIGNED',
        link: `/tickets`,
        targetRole: 'COMPANY_ADMIN',
        tenantId: compCode,
        recipients: [creatorEmail, adminEmail]
      });

      // Reload fresh tickets from backend with attachments silently (no full page unmount)
      try {
        await fetchInitialData(true);
      } catch (_e) {}

      // Close modal and reset state ONLY after successful creation & attachment upload
      setIsCreateOpen(false);
      setSelectedFileObj(null);
      setSelectedFilesMap({});
      setCreateFormData({
        subject: '',
        description: '',
        priority: 'MEDIUM',
        categoryId: '',
        assignedToId: '',
      });
      setCustomFieldValues({});
      setLastUploadedBase64('');

    } catch (_err) {
      console.error('Create ticket error:', _err);
      alert(_err.message || 'Failed to create ticket. Please check required fields.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Base list of tickets accessible to current user/agent role
  const roleFilteredTickets = tickets.filter((t) => {
    if (user?.role === 'AGENT' && user?.department) {
      const agentDeptLower = (user.department || '').toLowerCase();
      const userEmailLower = (user?.email || '').toLowerCase();
      const userNameLower = (user?.name || '').toLowerCase();
      const ticketDeptLower = (t.department || t.categoryName || t.category?.name || t.category?.targetDepartment || '').toLowerCase();
      
      const isMyCreatedTicket = (t.creatorEmail && t.creatorEmail.toLowerCase() === userEmailLower) ||
                                (t.userEmail && t.userEmail.toLowerCase() === userEmailLower) ||
                                (t.createdById && String(t.createdById) === String(user?.id));

      const isAssignedToAgent = (t.assignedTo?.id && String(t.assignedTo.id) === String(user?.id)) ||
                                (t.assignedToId && String(t.assignedToId) === String(user?.id)) ||
                                (t.assignedTo?.email && t.assignedTo.email.toLowerCase() === userEmailLower) ||
                                (t.assignedTo?.name && userNameLower && t.assignedTo.name.toLowerCase().includes(userNameLower)) ||
                                (t.assignee || '').toLowerCase().includes(userNameLower) ||
                                (t.assignedAgent || '').toLowerCase().includes(userNameLower);
      
      // If the ticket is assigned directly to this agent, or created by them, ALWAYS show it!
      if (isAssignedToAgent || isMyCreatedTicket) return true;

      // Department matching with cross-compatibility (e.g. IT & Infrastructure vs IT & Digital Infrastructure)
      const matchesAgentDept = !ticketDeptLower ||
                               (ticketDeptLower && agentDeptLower && (
                                 ticketDeptLower.includes(agentDeptLower.substring(0, 4)) || 
                                 agentDeptLower.includes(ticketDeptLower.substring(0, 4)) ||
                                 (agentDeptLower.includes('it') && ticketDeptLower.includes('it')) ||
                                 (agentDeptLower.includes('fleet') && ticketDeptLower.includes('fleet')) ||
                                 (agentDeptLower.includes('iot') && ticketDeptLower.includes('iot')) ||
                                 (agentDeptLower.includes('supply') && ticketDeptLower.includes('supply'))
                               ));
      
      if (!matchesAgentDept) return false;
    }

    if (user?.role === 'USER' || user?.role === 'END_USER' || user?.role === 'CUSTOMER') {
      const userEmailLower = (user?.email || '').toLowerCase();
      const userNameLower = (user?.name || '').toLowerCase();
      const userIdStr = String(user?.id || '');

      const isMyCreatedTicket = (userIdStr && t.createdBy?.id && String(t.createdBy.id) === userIdStr) ||
                                (userIdStr && t.createdById && String(t.createdById) === userIdStr) ||
                                (userEmailLower && t.createdBy?.email && t.createdBy.email.toLowerCase() === userEmailLower) ||
                                (userEmailLower && t.creatorEmail && t.creatorEmail.toLowerCase() === userEmailLower) ||
                                (userEmailLower && t.userEmail && t.userEmail.toLowerCase() === userEmailLower) ||
                                (userEmailLower && t.customerEmail && t.customerEmail.toLowerCase() === userEmailLower) ||
                                (userNameLower && t.createdBy?.name && t.createdBy.name.toLowerCase() === userNameLower) ||
                                (userNameLower && t.creatorName && t.creatorName.toLowerCase() === userNameLower) ||
                                (!t.createdBy && !t.createdById); // If backend already returned scoped tickets without full creator object

      // End users must ONLY see tickets created by themselves (privacy & security)
      if (!isMyCreatedTicket) return false;
    }

    return true;
  });

  const myAssignedTicketsCount = roleFilteredTickets.filter(t => 
    (t.assignedTo?.id && String(t.assignedTo.id) === String(user?.id)) ||
    (t.assignedToId && String(t.assignedToId) === String(user?.id)) ||
    (t.assignedTo?.email && user?.email && t.assignedTo.email.toLowerCase() === user.email.toLowerCase()) ||
    (t.assignedTo?.name && user?.name && t.assignedTo.name.toLowerCase().includes(user.name.toLowerCase())) ||
    (t.assignedAgent && user?.name && t.assignedAgent.toLowerCase().includes(user.name.toLowerCase()))
  ).length;

  const unassignedTicketsCount = roleFilteredTickets.filter(t => 
    !t.assignedTo?.id && !t.assignedToId && !t.assignedAgent && !t.assignedTo?.name
  ).length;

  const handleClaimTicket = async (ticket, e) => {
    if (e) e.stopPropagation();
    try {
      setClaimingTicketId(ticket.id);
      const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();
      const updatedList = tickets.map(t => t.id === ticket.id ? { 
        ...t, 
        assignedToId: user.id, 
        assignedAgent: user.name, 
        assignedTo: { id: user.id, name: user.name },
        status: t.status === 'NEW' ? 'OPEN' : t.status 
      } : t);
      setTickets(updatedList);
      try {
        if (user?.id) {
          sessionStorage.setItem(`tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`, JSON.stringify(updatedList));
        }
      } catch (_e) {}

      liveChannel.broadcast('TICKET_UPDATED', { ticketId: ticket.id, action: 'CLAIM', assignedToId: user.id });
      await api.put(`/tickets/${ticket.id}`, {
        assignedToId: user.id,
        status: ticket.status === 'NEW' ? 'OPEN' : ticket.status
      }).catch(() => null);
    } catch (_err) {
      console.error('Claim ticket error', _err);
    } finally {
      setClaimingTicketId(null);
    }
  };

  // Filtering Tickets with Toolbar Filters
  const filteredTickets = roleFilteredTickets.filter((t) => {

    const matchesSearch =
      (t.ticketNumber && t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = !statusFilter || t.status === statusFilter;
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    const matchesCategory = !categoryFilter || (t.category && t.category.id.toString() === categoryFilter);
    const matchesDepartment = !departmentFilter || (
      (t.department && t.department === departmentFilter) ||
      (t.category && (t.category.targetDepartment === departmentFilter || t.category.name?.toLowerCase().includes(departmentFilter.toLowerCase().substring(0, 4))))
    );

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesDepartment;
  });

  // Server-side paginated tickets
  const paginatedTickets = filteredTickets;

  // Reset page to 0 and refetch on filter change
  useEffect(() => {
    setCurrentPage(0);
    fetchInitialData(true, 0, itemsPerPage);
  }, [searchQuery, statusFilter, priorityFilter, departmentFilter]);

  // Multi-Select Handlers
  const handleToggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllCurrentPageSelected = paginatedTickets.length > 0 && paginatedTickets.every(t => selectedIds.includes(t.id));

  const handleToggleSelectAllPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(paginatedTickets.map(t => t.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedTickets.map(t => t.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Bulk Status Update Handler with 5-Second Undo Grace Window
  const handleBulkStatusUpdate = async (newStatus) => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();
    const previousSnapshot = [...tickets];
    const affectedIds = [...selectedIds];

    try {
      const updatedList = tickets.map(t => {
        if (affectedIds.includes(t.id)) {
          return { ...t, status: newStatus };
        }
        return t;
      });

      setTickets(updatedList);
      try {
        if (user?.id) {
          sessionStorage.setItem(`tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`, JSON.stringify(updatedList));
        }
      } catch (_e) {}

      liveChannel.broadcast('TICKET_UPDATED', { selectedIds: affectedIds, action: 'BULK_STATUS', status: newStatus });
      setSelectedIds([]);

      // Trigger Undo Action Toast
      triggerUndoableAction(`${affectedIds.length} tickets marked as ${newStatus}`, () => {
        setTickets(previousSnapshot);
        try {
          if (user?.id) {
            sessionStorage.setItem(`tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`, JSON.stringify(previousSnapshot));
          }
        } catch (_e) {}
        liveChannel.broadcast('TICKET_UPDATED', { action: 'UNDO_BULK' });
      });

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
    const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();
    const targetAgent = agents.find(a => String(a.id) === String(agentId));

    try {
      const updatedList = tickets.map(t => {
        if (selectedIds.includes(t.id)) {
          return { 
            ...t, 
            assignedToId: agentId,
            assignedAgent: targetAgent ? targetAgent.name : t.assignedAgent,
            assignedTo: targetAgent || t.assignedTo
          };
        }
        return t;
      });

      setTickets(updatedList);
      try {
        if (user?.id) {
          sessionStorage.setItem(`tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`, JSON.stringify(updatedList));
        }
      } catch (_e) {}

      liveChannel.broadcast('TICKET_UPDATED', { selectedIds, action: 'BULK_ASSIGN', agentId });
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
    setDeleteModal({
      isOpen: true,
      mode: 'bulk',
      ticketId: null,
      itemName: `${selectedIds.length} Selected Tickets`,
      itemSubtext: 'All selected ticket records will be permanently removed.',
      isDeleting: false
    });
  };

  const handleConfirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();

    if (deleteModal.mode === 'bulk') {
      try {
        const updatedList = tickets.filter(t => !selectedIds.includes(t.id));
        setTickets(updatedList);
        if (user?.id) {
          sessionStorage.setItem(`tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`, JSON.stringify(updatedList));
        }

        liveChannel.broadcast('TICKET_UPDATED', { selectedIds, action: 'BULK_DELETE' });
        setSelectedIds([]);
      } catch (_e) {
        console.error('Bulk delete error', _e);
      }
    } else {
      const ticketId = deleteModal.ticketId;
      const updatedList = tickets.filter(t => t.id !== ticketId);
      setTickets(updatedList);
      setSelectedIds(prev => prev.filter(id => id !== ticketId));

      try {
        if (user?.id) {
          sessionStorage.setItem(`tp_tickets_${user.id}_${user.role || 'USER'}_${tenantCode}`, JSON.stringify(updatedList));
        }
        liveChannel.broadcast('TICKET_UPDATED', { ticketId, action: 'DELETE' });
      } catch(_e) {}

      api.delete(`/tickets/${ticketId}`).catch(() => null);
    }

    setDeleteModal({ isOpen: false, mode: 'single', ticketId: null, itemName: '', itemSubtext: '', isDeleting: false });
  };

  // Handle Export of only Selected tickets
  const handleExportSelected = (format = 'excel') => {
    const selectedTickets = tickets.filter(t => selectedIds.includes(t.id));
    if (selectedTickets.length === 0) return;
    exportTicketsDataset(selectedTickets, format, `${user?.companyCode || 'WORKSPACE'}_SELECTED_${selectedTickets.length}`);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3 text-slate-500 font-semibold text-xs">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></span>
          <span>Loading Enterprise Tickets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans select-none pb-16 relative">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isEndUser ? 'My Support Requests' : isAgent ? 'Support Ticket Queue' : 'Support Tickets Hub'}
            </h1>
            <Badge variant="outline" className="bg-cyan-50 border-cyan-200/60 text-cyan-800 font-bold text-[10px] uppercase tracking-wider rounded-full px-2.5 py-0.5">
              Live Hub
            </Badge>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            {isEndUser 
              ? 'View live updates, replies, and status of your submitted support inquiries.'
              : isAgent 
              ? 'Active department tickets and resolution queues requiring agent response.'
              : 'Manage, triage, and resolve organization service requests in real time.'}
          </p>
        </div>

        {/* ACTIONS / EXPORTS & CTA BUTTON */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {(isAdmin || isAgent) && (
            <>
              <Button
                variant="outline"
                onClick={() => exportTicketsDataset(roleFilteredTickets, 'excel', user?.companyCode || user?.tenantId || 'WORKSPACE')}
                className="border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-bold rounded-xl gap-1.5 cursor-pointer h-10 px-3.5 shadow-xs"
                title="Download complete ticket data in Excel format (.xlsx / .xls)"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">Excel</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => exportTicketsDataset(roleFilteredTickets, 'csv', user?.companyCode || user?.tenantId || 'WORKSPACE')}
                className="border-cyan-200 bg-cyan-50/70 text-cyan-800 hover:bg-cyan-100 hover:text-cyan-900 font-bold rounded-xl gap-1.5 cursor-pointer h-10 px-3.5 shadow-xs"
                title="Download complete ticket data in CSV format (.csv)"
              >
                <Download className="h-4 w-4 text-cyan-700" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            </>
          )}

          <Button
            onClick={handleOpenCreateModal}
            className="bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white font-bold shadow-md shadow-cyan-500/20 rounded-xl gap-1.5 cursor-pointer h-10 px-4 active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Ticket</span>
          </Button>
        </div>
      </div>

      {/* Zendesk-style: Live Queue Sync Status Indicator */}
      {syncLabel && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 px-0.5 -mt-1 mb-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-600">{syncLabel}</span>
          <span className="text-slate-300">·</span>
          <span>Live Queue</span>
        </div>
      )}

      {/* TOP STATS COUNTER BADGES using shadcn Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-2.5 sm:p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Tickets</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{roleFilteredTickets.length}</span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
              <Ticket className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-2.5 sm:p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">New / Open</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 leading-tight">
                {roleFilteredTickets.filter(t => {
                  const s = (t.status || '').toUpperCase();
                  return s === 'NEW' || s === 'OPEN';
                }).length}
              </span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-2.5 sm:p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">In Progress</span>
              <span className="text-xl sm:text-2xl font-black text-amber-700 leading-tight">
                {roleFilteredTickets.filter(t => {
                  const s = (t.status || '').toUpperCase();
                  return s === 'IN_PROGRESS' || s === 'ON_HOLD';
                }).length}
              </span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
              <Zap className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-2.5 sm:p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 block">Resolved</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-800 leading-tight">
                {roleFilteredTickets.filter(t => {
                  const s = (t.status || '').toUpperCase();
                  return s === 'RESOLVED' || s === 'CLOSED';
                }).length}
              </span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-sm">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER CONTROLS TOOLBAR using Card */}
      <Card className="rounded-2xl border-slate-200/80 shadow-xs">
        <CardContent className="p-3 sm:p-3.5">
          <div ref={filterDropdownsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2 lg:col-span-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search ticket #, subject, text..."
                aria-label="Search tickets"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 text-xs font-semibold focus-visible:ring-cyan-600 h-10 w-full shadow-2xs"
              />
            </div>

            {/* Custom In-App Dropdown: Status Filter */}
            <div className="relative lg:col-span-2">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 hover:bg-slate-50 focus:border-cyan-500 focus:outline-none cursor-pointer h-10 transition-colors shadow-2xs"
              >
                <span className="truncate">
                  {statusFilter ? `Status: ${statusFilter}` : 'All Statuses'}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openDropdown === 'status' ? 'rotate-180 text-cyan-600' : ''} shrink-0 ml-1`} />
              </button>

              {openDropdown === 'status' && (
                <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl border border-slate-200 shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                  {[
                    { val: '', label: 'All Statuses' },
                    { val: 'NEW', label: 'New' },
                    { val: 'OPEN', label: 'Open' },
                    { val: 'IN_PROGRESS', label: 'In Progress' },
                    { val: 'RESOLVED', label: 'Resolved' },
                    { val: 'CLOSED', label: 'Closed' }
                  ].map(opt => (
                    <button
                      key={opt.val || 'all'}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.val);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                        statusFilter === opt.val 
                          ? 'bg-cyan-50 text-cyan-800 font-bold' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {statusFilter === opt.val && <Check className="h-3.5 w-3.5 text-cyan-700" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom In-App Dropdown: Priority Filter */}
            <div className="relative lg:col-span-2">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 hover:bg-slate-50 focus:border-cyan-500 focus:outline-none cursor-pointer h-10 transition-colors shadow-2xs"
              >
                <span className="truncate">
                  {priorityFilter ? `Priority: ${priorityFilter}` : 'All Priorities'}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openDropdown === 'priority' ? 'rotate-180 text-cyan-600' : ''} shrink-0 ml-1`} />
              </button>

              {openDropdown === 'priority' && (
                <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl border border-slate-200 shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                  {[
                    { val: '', label: 'All Priorities' },
                    { val: 'URGENT', label: 'Urgent' },
                    { val: 'HIGH', label: 'High' },
                    { val: 'MEDIUM', label: 'Medium' },
                    { val: 'LOW', label: 'Low' }
                  ].map(opt => (
                    <button
                      key={opt.val || 'all'}
                      type="button"
                      onClick={() => {
                        setPriorityFilter(opt.val);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                        priorityFilter === opt.val 
                          ? 'bg-cyan-50 text-cyan-800 font-bold' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {priorityFilter === opt.val && <Check className="h-3.5 w-3.5 text-cyan-700" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom In-App Dropdown: Category Filter */}
            <div className="relative lg:col-span-2">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 hover:bg-slate-50 focus:border-cyan-500 focus:outline-none cursor-pointer h-10 transition-colors shadow-2xs"
              >
                <span className="truncate">
                  {categoryFilter ? (categories.find(c => String(c.id) === String(categoryFilter))?.name || 'Category') : 'All Categories'}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${openDropdown === 'category' ? 'rotate-180 text-cyan-600' : ''} shrink-0 ml-1`} />
              </button>

              {openDropdown === 'category' && (
                <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl border border-slate-200 shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('');
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                      categoryFilter === '' 
                        ? 'bg-cyan-50 text-cyan-800 font-bold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>All Categories</span>
                    {categoryFilter === '' && <Check className="h-3.5 w-3.5 text-cyan-700" />}
                  </button>
                  {categories.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(c.id);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                        String(categoryFilter) === String(c.id)
                          ? 'bg-cyan-50 text-cyan-800 font-bold' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {String(categoryFilter) === String(c.id) && <Check className="h-3.5 w-3.5 text-cyan-700 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom In-App Dropdown: Department Filter */}
            <div className="relative lg:col-span-2">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'department' ? null : 'department')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-cyan-200 bg-cyan-50/70 text-xs font-black text-cyan-800 hover:bg-cyan-100/70 focus:border-cyan-500 focus:outline-none cursor-pointer h-10 transition-colors shadow-2xs"
              >
                <span className="truncate">
                  {departmentFilter ? `🏢 ${departmentFilter}` : '🏢 All Departments'}
                </span>
                <ChevronDown className={`h-4 w-4 text-cyan-700 transition-transform ${openDropdown === 'department' ? 'rotate-180' : ''} shrink-0 ml-1`} />
              </button>

              {openDropdown === 'department' && (
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-full sm:w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
                  {[
                    '',
                    'IT & Infrastructure',
                    'Human Resources (HR)',
                    'Finance & Accounting',
                    'Sales & Marketing',
                    'Operations & Logistics',
                    'Customer Support'
                  ].map(dept => (
                    <button
                      key={dept || 'all'}
                      type="button"
                      onClick={() => {
                        setDepartmentFilter(dept);
                        setOpenDropdown(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                        departmentFilter === dept 
                          ? 'bg-cyan-50 text-cyan-800 font-bold' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{dept ? `🏢 ${dept}` : '🏢 All Departments'}</span>
                      {departmentFilter === dept && <Check className="h-3.5 w-3.5 text-cyan-700 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FLOATING ENTERPRISE BULK ACTIONS BAR */}
      {!isEndUser && selectedIds.length > 0 && (
        <div className="sticky top-4 z-40 bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center space-x-3">
            <span className="h-7 w-7 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xs">
              {selectedIds.length}
            </span>
            <div>
              <span className="text-xs font-black text-white">Tickets Selected</span>
              <span className="text-[11px] text-slate-400 block font-medium">Apply batch operations in 1-click</span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusUpdate('IN_PROGRESS')}
              className="h-8 rounded-xl bg-slate-800 hover:bg-amber-600 hover:text-white border-slate-700 text-amber-300 font-bold text-xs cursor-pointer"
            >
              ⚡ Set In Progress
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusUpdate('RESOLVED')}
              className="h-8 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white border-slate-700 text-emerald-300 font-bold text-xs cursor-pointer"
            >
              ✓ Set Resolved
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusUpdate('CLOSED')}
              className="h-8 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
            >
              🔒 Close
            </Button>

            {(user?.role === 'COMPANY_ADMIN' || user?.role === 'MANAGER') && agents.length > 0 && (
              <div className="w-44">
                <CustomSelect
                  value=""
                  onChange={(val) => { if (val) handleBulkReassign(val); }}
                  placeholder="👤 Assign Selected..."
                  options={agents.map((a) => ({ value: a.id, label: a.name }))}
                  buttonClassName="h-8 px-2.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold shadow-none"
                  menuClassName="bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportSelected('excel')}
              className="h-8 rounded-xl bg-emerald-950/80 hover:bg-emerald-800 border-emerald-700 text-emerald-300 font-bold text-xs cursor-pointer"
              title="Export selected tickets to Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
              Excel
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={bulkActionLoading}
              onClick={handleBulkDelete}
              className="h-8 rounded-xl bg-rose-950/80 hover:bg-rose-800 border-rose-800 text-rose-300 font-bold text-xs cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-8 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* TICKETS TABLE VIEW using shadcn Table */}
      <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-cyan-700 font-bold text-xl">
              🔍
            </div>
            <h3 className="text-sm font-black text-slate-800">No Tickets Match Your Filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query, status, priority, or department filter to find tickets.
            </p>
            <Button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setPriorityFilter('');
                setCategoryFilter('');
                setDepartmentFilter('');
              }}
              className="bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              Reset All Filters
            </Button>
          </div>
        ) : (
          <>
            {/* MOBILE SCREEN CARD VIEW (visible only below md) - No horizontal scroll needed! */}
            <div className="block md:hidden divide-y divide-slate-100">
              {/* Select all header for mobile */}
              {isAdmin && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-600">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllPage}
                      className="p-1 text-slate-500 hover:text-cyan-700 cursor-pointer"
                    >
                      {isAllCurrentPageSelected ? (
                        <CheckSquare className="h-4 w-4 text-cyan-700" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    <span>Select All on Page</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold">{paginatedTickets.length} tickets</span>
                </div>
              )}

              {paginatedTickets.map((ticket) => {
                const isSelected = selectedIds.includes(ticket.id);
                const assignedName = ticket.assignedTo?.name || ticket.assignedAgent || ticket.agentName;

                return (
                  <div
                    key={`mobile-${ticket.id}`}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className={`p-3.5 space-y-2.5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-cyan-50/70' : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    {/* Top row: Checkbox + Ticket ID + Priority & Status Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectOne(ticket.id);
                            }}
                            className="p-1 text-slate-400 hover:text-cyan-700 shrink-0 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-cyan-700" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        )}
                        <span className="font-mono font-black text-xs text-cyan-800 tracking-tight shrink-0">
                          {ticket.ticketNumber || `#TK-${ticket.id}`}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <Badge variant="outline" className={`rounded-full text-[9px] font-black px-2 py-0.5 ${
                          ticket.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : ticket.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : ticket.priority === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                        }`}>
                          {ticket.priority || 'MEDIUM'}
                        </Badge>

                        <Badge variant="outline" className={`rounded-full text-[9px] font-black px-2 py-0.5 ${
                          ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : ticket.status === 'IN_PROGRESS'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {ticket.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Middle: Subject with attachment badge */}
                    <div className="text-left">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2">
                        {ticket.subject}
                      </p>
                      {((ticket.attachments && ticket.attachments.length > 0) || (ticket.description && (ticket.description.includes('Attachment:') || ticket.description.includes('Attachments:')))) && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-cyan-50 text-cyan-800 text-[9.5px] font-bold border border-cyan-200" title="Has attached file">
                          <Paperclip className="h-3 w-3 text-cyan-700" />
                          <span>Attachment</span>
                        </span>
                      )}
                      {!isEndUser && (
                        <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                          <span className="text-slate-400 font-normal">Requester: </span>
                          <strong className="text-slate-700 font-semibold">
                            {ticket.creatorName || ticket.customerName || ticket.userEmail || ticket.createdBy?.name || 'Customer'}
                          </strong>
                        </p>
                      )}
                    </div>

                    {/* Bottom: Department / Category + Agent & Action Button */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80 text-[11px]">
                      <div className="space-y-0.5 min-w-0 text-left">
                        <span className="text-slate-500 font-medium block truncate max-w-[170px]">
                          {ticket.department || ticket.category?.targetDepartment || ticket.categoryName || 'General Support'}
                        </span>
                        <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
                          <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '18/8/2026'}</span>
                          <span>•</span>
                          <span className="text-slate-600 font-semibold truncate max-w-[100px]">
                            {assignedName || 'Unassigned'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                          className="h-7 px-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200 text-[10px] font-bold cursor-pointer"
                        >
                          View →
                        </Button>
                        {isAgent && (!ticket.assignedTo?.id && !ticket.assignedToId && !ticket.assignedAgent && !ticket.assignedTo?.name) && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={claimingTicketId === ticket.id}
                            onClick={(e) => handleClaimTicket(ticket, e)}
                            className="h-7 px-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-[10px] font-bold border-cyan-200 cursor-pointer gap-1"
                            title="Claim ticket"
                          >
                            <Zap className="h-3 w-3 text-cyan-700" />
                            <span>{claimingTicketId === ticket.id ? '...' : 'Claim'}</span>
                          </Button>
                        )}
                        {isEndUser && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRatingModalTicket(ticket)}
                            className="h-7 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border-amber-200 cursor-pointer"
                            title="Rate experience"
                          >
                            <Sparkles className="h-3 w-3 text-amber-500 fill-amber-400" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteTicket(ticket.id, e)}
                            className="h-7 w-7 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete Ticket"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP SCREEN TABLE VIEW (hidden on mobile, visible from md:block) */}
            <div className="hidden md:block overflow-x-auto min-w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] hover:bg-slate-50/80">
                    {isAdmin && (
                      <TableHead className="w-8 px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAllPage}
                          className="p-1 text-slate-400 hover:text-cyan-700 cursor-pointer"
                          title={isAllCurrentPageSelected ? "Deselect page" : "Select all on page"}
                        >
                          {isAllCurrentPageSelected ? (
                            <CheckSquare className="h-3.5 w-3.5 text-cyan-700" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>
                      </TableHead>
                    )}
                    <TableHead className="py-2.5 px-2 w-[115px] whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ticket ID</TableHead>
                    <TableHead className="py-2.5 px-2 min-w-[150px] max-w-[220px] text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject</TableHead>
                    <TableHead className="py-2.5 px-2 w-[110px] whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</TableHead>
                    <TableHead className="py-2.5 px-2 w-[130px] whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Dept</TableHead>
                    <TableHead className="py-2.5 px-2 w-[115px] whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Staff</TableHead>
                    <TableHead className="py-2.5 px-1 w-[75px] text-center whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</TableHead>
                    <TableHead className="py-2.5 px-1 w-[85px] text-center whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="py-2.5 px-2 w-[80px] text-center whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wider">Created</TableHead>
                    <TableHead className="py-2.5 px-2 w-[65px] text-right whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTickets.map((ticket) => {
                    const isSelected = selectedIds.includes(ticket.id);
                    return (
                      <TableRow 
                        key={ticket.id} 
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                        className={`transition-colors border-b border-slate-100 cursor-pointer group ${
                          isSelected ? 'bg-cyan-50/60' : 'hover:bg-cyan-50/20'
                        }`}
                      >
                        {isAdmin && (
                          <TableCell className="w-8 px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOne(ticket.id)}
                              className="p-1 text-slate-400 hover:text-cyan-700 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-3.5 w-3.5 text-cyan-700" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </button>
                          </TableCell>
                        )}
                        <TableCell className="py-2 px-2 font-mono font-bold text-[11.5px] text-cyan-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{ticket.ticketNumber || `#TK-${ticket.id}`}</span>
                            {ticket.formVersion && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200" title={`Created with Dynamic Form Version ${ticket.formVersion}`}>
                                v{ticket.formVersion}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-2 font-bold text-slate-900 text-xs min-w-[150px] max-w-[220px]">
                          <div className="flex items-center gap-1.5">
                            <span className="line-clamp-2 leading-snug group-hover:text-cyan-700 transition-colors">{ticket.subject}</span>
                            {((ticket.attachments && ticket.attachments.length > 0) || (ticket.description && (ticket.description.includes('Attachment:') || ticket.description.includes('Attachments:')))) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-cyan-50 text-cyan-800 text-[10px] font-extrabold border border-cyan-200 shrink-0" title="Has attached file/document">
                                <Paperclip className="h-3 w-3 text-cyan-700" />
                                {ticket.attachments?.length ? ticket.attachments.length : 1}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-2 text-slate-600 text-xs font-semibold whitespace-nowrap max-w-[110px]">
                          <span className="truncate block max-w-[110px]" title={ticket.categoryName || ticket.category?.name || 'General Support'}>
                            {ticket.categoryName || ticket.category?.name || 'General Support'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 text-indigo-900 text-xs font-bold whitespace-nowrap max-w-[130px]">
                          <span className="px-2 py-0.5 bg-cyan-50 rounded-md border border-cyan-100 truncate block max-w-[130px]" title={ticket.department || ticket.category?.targetDepartment || 'IT & Infrastructure'}>
                            {ticket.department || ticket.category?.targetDepartment || 'IT & Infrastructure'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 px-2 text-slate-800 text-xs font-bold whitespace-nowrap max-w-[130px]">
                          {(() => {
                            const assignedName = ticket.assignedTo?.name || ticket.assignedAgent || ticket.agentName;
                            if (assignedName) {
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className="flex items-center space-x-1 truncate max-w-[85px]" title={assignedName}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                    <span className="truncate">{assignedName}</span>
                                  </span>
                                  {!isEndUser && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[9.5px] font-extrabold border border-amber-200/90 shrink-0 shadow-2xs" title="Auto-Assigned by Least-Loaded Routing Engine">
                                      ⚡ Auto
                                    </span>
                                  )}
                                </div>
                              );
                            }
                            return <span className="text-slate-400 font-normal italic text-[11px]">-- Unassigned --</span>;
                          })()}
                        </TableCell>
                        <TableCell className="py-2 px-1 text-center whitespace-nowrap">
                          <Badge variant="outline" className={`rounded-full text-[9.5px] font-bold px-1.5 py-0.5 ${
                            ticket.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : ticket.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : ticket.priority === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}>
                            {ticket.priority || 'MEDIUM'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 px-1 text-center whitespace-nowrap">
                          <Badge variant="outline" className={`rounded-full text-[9.5px] font-bold px-1.5 py-0.5 ${
                            ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : ticket.status === 'IN_PROGRESS'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 px-2 text-center text-slate-400 text-[11px] whitespace-nowrap">
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '18/8/2026'}
                        </TableCell>
                        <TableCell className="py-2 px-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/tickets/${ticket.id}`);
                              }}
                              className="h-6 px-2 rounded-md text-slate-700 hover:text-cyan-700 hover:bg-cyan-50 text-[10px] font-bold cursor-pointer"
                            >
                              View
                            </Button>
                            {isEndUser && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRatingModalTicket(ticket);
                                }}
                                className="h-6 px-1.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border-amber-200 cursor-pointer gap-0.5"
                                title="Rate your support experience"
                              >
                                <Sparkles className="h-2.5 w-2.5 text-amber-500 fill-amber-400" />
                                <span>Rate</span>
                              </Button>
                            )}
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => handleRenameTicket(ticket, e)}
                                  className="h-6 w-6 rounded-md text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 cursor-pointer"
                                  title="Rename / Edit Subject"
                                  aria-label="Rename / Edit Subject"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => handleDeleteTicket(ticket.id, e)}
                                  className="h-6 w-6 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="Delete Ticket"
                                  aria-label="Delete Ticket"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* SERVER-SIDE PAGINATION CONTROLS FOOTER */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements || filteredTickets.length}
              pageSize={itemsPerPage}
              onPageChange={(p) => {
                setCurrentPage(p);
                fetchInitialData(false, p, itemsPerPage);
              }}
              onPageSizeChange={(s) => {
                setItemsPerPage(s);
                setCurrentPage(0);
                fetchInitialData(false, 0, s);
              }}
            />
          </>
        )}
      </Card>

      {/* CREATE TICKET MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <Card className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl space-y-0 border-slate-100 max-h-[92vh] flex flex-col overflow-hidden my-auto">
            
            <CardHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0 shrink-0">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <span>Create New Ticket</span>
                  <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 font-black text-[10px]">
                    {(user?.companyCode || 'TENANT').toUpperCase()}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">
                  Submit a support request to the appropriate department
                </CardDescription>
              </div>
              <Button 
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => { setIsCreateOpen(false); setSelectedFileObj(null); setSelectedFilesMap({}); setLastUploadedBase64(''); }}
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>

            <form id="create-ticket-form" onSubmit={handleCreateSubmit} className="overflow-y-auto px-6 py-5 space-y-4 text-left flex-1">
              
              {/* Category Selection Dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="create-cat" className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Category *</span>
                  {activeCategory?.isPublished && (
                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ Published Live Form
                    </span>
                  )}
                </Label>
                <CustomSelect
                  id="create-cat"
                  value={createFormData.categoryId}
                  onChange={(val) => {
                    const actual = typeof val === 'object' && val?.target ? val.target.value : val;
                    handleCategorySelectChange(actual);
                  }}
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select Category..."
                  required
                  buttonClassName="border-2 border-cyan-100"
                />
              </div>

              {/* Standard Subject & Priority Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {!subjectCustomField ? (
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="create-subj" className="text-xs font-bold text-slate-800">Subject / Issue Summary *</Label>
                    <Input
                      id="create-subj"
                      type="text"
                      required
                      value={createFormData.subject}
                      onChange={(e) => setCreateFormData({ ...createFormData, subject: e.target.value })}
                      placeholder="Brief summary of the issue..."
                      className="rounded-2xl border-slate-200 text-xs font-bold text-slate-900 focus-visible:ring-indigo-600 h-10"
                    />
                  </div>
                ) : null}

                <div className={subjectCustomField ? "sm:col-span-3 space-y-1.5" : "space-y-1.5"}>
                  <Label htmlFor="create-prio" className="text-xs font-bold text-slate-800">Priority</Label>
                  <CustomSelect
                    id="create-prio"
                    value={createFormData.priority}
                    onChange={(val) => {
                      const actual = typeof val === 'object' && val?.target ? val.target.value : val;
                      setCreateFormData({ ...createFormData, priority: actual });
                    }}
                    options={[
                      { value: 'LOW', label: '🟢 Low' },
                      { value: 'MEDIUM', label: '🟡 Medium' },
                      { value: 'HIGH', label: '🟠 High' },
                      { value: 'URGENT', label: '🔴 Urgent' }
                    ]}
                  />
                </div>
              </div>

              {(user?.role === 'COMPANY_ADMIN' || user?.role === 'MANAGER') && (
                <div className="space-y-1.5">
                  <Label htmlFor="create-assign" className="text-xs font-bold text-slate-800">Assign Agent (Optional)</Label>
                  <CustomSelect
                    id="create-assign"
                    value={createFormData.assignedToId}
                    onChange={(val) => {
                      const actual = typeof val === 'object' && val?.target ? val.target.value : val;
                      setCreateFormData({ ...createFormData, assignedToId: actual });
                    }}
                    placeholder="⚡ Auto-Assign (Recommended)"
                    options={[
                      { value: '', label: '⚡ Auto-Assign (Recommended)' },
                      ...agents.map(a => ({ value: a.id, label: `${a.name} (${a.department || 'Support'})` }))
                    ]}
                  />
                </div>
              )}

              {/* Dynamic Live Form Fields Created in Form Builder */}
              {customFieldsToRender.length > 0 && (
                <div className="p-4 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-700" />
                      <span>{activeCategory?.name || 'Category'} Custom Form Questions</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold text-cyan-800 bg-cyan-50 border-cyan-200">
                      {customFieldsToRender.length} Questions
                    </Badge>
                  </div>

                  <div className="space-y-3.5">
                    {customFieldsToRender.map((f, idx) => {
                      const fieldType = (f.type || 'text').toLowerCase();
                      const isConditional = fieldType === 'conditional_section';
                      const opts = Array.isArray(f.options)
                        ? f.options
                        : (typeof f.options === 'string' ? f.options.split(',').map(o => o.trim()).filter(Boolean) : []);

                      if (isConditional) {
                        const activeBranch = getActiveBranch(f, customFieldsToRender, customFieldValues);
                        const branches = Array.isArray(f.branches) ? f.branches : [];
                        const activeBranchVal = activeBranch?.value || (branches[0]?.value) || '';
                        const subFields = (activeBranch && Array.isArray(activeBranch.fields)) ? activeBranch.fields : (Array.isArray(f.fields) ? f.fields : []);

                        return (
                          <div key={f.id || idx} className="p-4 rounded-2xl bg-white border border-cyan-200/90 shadow-sm space-y-3.5 animate-in fade-in duration-200">
                            
                            {/* Subform Card Header with Branch Tabs */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div className="flex items-center space-x-2">
                                <div className="h-7 w-7 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
                                  <Tag className="h-3.5 w-3.5 text-cyan-800" />
                                </div>
                                <div>
                                  <span className="text-xs font-black text-slate-900 block leading-tight">
                                    {f.label || 'Conditional Subform'}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {f.dependsOn ? `Linked to: ${f.dependsOn}` : 'Dynamic Form Section'}
                                  </span>
                                </div>
                              </div>

                              {/* Interactive Branch Switcher Tabs if multiple branches exist */}
                              {branches.length > 1 && (
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
                                  {branches.map((b, bIdx) => {
                                    const bValClean = (b.value || '').trim().toLowerCase().replace(/\s*form$/, '');
                                    const activeValClean = (activeBranchVal || '').trim().toLowerCase().replace(/\s*form$/, '');
                                    const isSelected = bValClean === activeValClean || activeValClean.includes(bValClean) || bValClean.includes(activeValClean);
                                    return (
                                      <button
                                        key={bIdx}
                                        type="button"
                                        onClick={() => {
                                          setCustomFieldValues(prev => {
                                            const next = {
                                              ...prev,
                                              [f.id + '_activeBranch']: b.value
                                            };
                                            // Also update the controlling dropdown so both stay in 100% sync
                                            customFieldsToRender.forEach(parentF => {
                                              if (parentF.type === 'select' || parentF.type === 'dropdown' || parentF.type === 'radio') {
                                                const opts = Array.isArray(parentF.options) ? parentF.options : [];
                                                const matchingOpt = opts.find(opt => {
                                                  const oClean = opt.toLowerCase().trim().replace(/\s*form$/, '');
                                                  return oClean === bValClean || bValClean.includes(oClean) || oClean.includes(bValClean);
                                                });
                                                if (matchingOpt) {
                                                  next[parentF.label] = matchingOpt;
                                                  next[parentF.id] = matchingOpt;
                                                }
                                              }
                                            });
                                            return next;
                                          });
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                                          isSelected
                                            ? 'bg-white text-cyan-800 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                      >
                                        {b.label || b.value}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Render Questions in this Branch */}
                            {subFields.length === 0 ? (
                              <p className="text-xs text-slate-400 font-medium italic py-2">No sub-questions configured in this branch.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                                {subFields.map((sub, sIdx) => {
                                  const subType = (sub.type || 'text').toLowerCase();
                                  const subOpts = Array.isArray(sub.options)
                                    ? sub.options
                                    : (typeof sub.options === 'string' ? sub.options.split(',').map(o => o.trim()).filter(Boolean) : []);

                                  return (
                                    <div key={sub.id || sIdx} className={subType === 'textarea' || subType === 'longtext' || subType === 'file' ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
                                      <Label className="text-[11px] font-bold text-slate-700">
                                        {sub.label} {sub.required && <span className="text-rose-500">*</span>}
                                      </Label>

                                      {subType === 'select' || subType === 'dropdown' || subType === 'radio' ? (
                                        <CustomSelect
                                          required={sub.required}
                                          value={customFieldValues[sub.label] || ''}
                                          onChange={(e) => setCustomFieldValues({ ...customFieldValues, [sub.label]: e.target.value })}
                                          placeholder={sub.placeholder || `-- Select ${sub.label} --`}
                                          options={subOpts.map(opt => ({ value: opt, label: opt }))}
                                        />
                                      ) : (subType === 'textarea' || subType === 'longtext') ? (
                                        <textarea
                                          rows={2}
                                          required={sub.required}
                                          placeholder={sub.placeholder || `Enter ${sub.label.toLowerCase()}...`}
                                          value={customFieldValues[sub.label] || ''}
                                          onChange={(e) => setCustomFieldValues({ ...customFieldValues, [sub.label]: e.target.value })}
                                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/50 focus:border-cyan-500 focus:outline-none resize-none"
                                        />
                                      ) : subType === 'file' ? (
                                        <DragDropUploader
                                          fieldId={`sub_file_${sub.id || sIdx}`}
                                          label={sub.label}
                                          required={sub.required}
                                          onFileSelected={(fileObj) => handleDragDropFile(fileObj, sub.label)}
                                          initialFilename={customFieldValues[sub.label] || ''}
                                          isUploading={isSubmittingTicket}
                                        />
                                      ) : (
                                        <Input
                                          type={subType === 'number' ? 'number' : subType === 'date' ? 'date' : 'text'}
                                          required={sub.required}
                                          placeholder={sub.placeholder || `Enter ${sub.label}`}
                                          value={customFieldValues[sub.label] || ''}
                                          onChange={(e) => setCustomFieldValues({ ...customFieldValues, [sub.label]: e.target.value })}
                                          className="rounded-xl border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/50 h-9"
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={f.id || idx} className="space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-800">
                              {f.label} {f.required && <span className="text-rose-500">*</span>}
                            </Label>
                            {f.tooltip && (
                              <span className="text-[10px] text-slate-400 font-medium">{f.tooltip}</span>
                            )}
                          </div>

                          {fieldType === 'select' || fieldType === 'dropdown' ? (
                            <CustomSelect
                              required={f.required}
                              value={customFieldValues[f.label] || (opts.length > 0 ? opts[0] : '')}
                              onChange={(e) => {
                                const selectedVal = typeof e === 'object' && e?.target ? e.target.value : e;
                                setCustomFieldValues(prev => {
                                  const next = {
                                    ...prev,
                                    [f.label]: selectedVal,
                                    [f.id]: selectedVal
                                  };
                                  // Auto-sync any conditional_section whose branches match this selected option!
                                  const cleanVal = (selectedVal || '').toLowerCase().trim().replace(/\s*form$/, '');
                                  customFieldsToRender.forEach(cf => {
                                    if (cf.type === 'conditional_section' && Array.isArray(cf.branches)) {
                                      const matchedBranch = cf.branches.find(b => {
                                        const bClean = (b.value || b.label || '').toLowerCase().trim().replace(/\s*form$/, '');
                                        return bClean === cleanVal || cleanVal.includes(bClean) || bClean.includes(cleanVal);
                                      });
                                      if (matchedBranch) {
                                        next[cf.id + '_activeBranch'] = matchedBranch.value;
                                      }
                                    }
                                  });
                                  return next;
                                });
                              }}
                              placeholder={f.placeholder || `-- Select ${f.label} --`}
                              options={opts.map(opt => ({ value: opt, label: opt }))}
                            />
                          ) : fieldType === 'radio' ? (
                            <div className="space-y-2 pt-1">
                              {opts.map((opt, oIdx) => (
                                <label key={oIdx} className="flex items-center space-x-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`radio_${f.label || idx}`}
                                    value={opt}
                                    checked={customFieldValues[f.label] === opt}
                                    onChange={() => {
                                      const selectedVal = opt;
                                      setCustomFieldValues(prev => {
                                        const next = {
                                          ...prev,
                                          [f.label]: selectedVal,
                                          [f.id]: selectedVal
                                        };
                                        const cleanVal = (selectedVal || '').toLowerCase().trim().replace(/\s*form$/, '');
                                        customFieldsToRender.forEach(cf => {
                                          if (cf.type === 'conditional_section' && Array.isArray(cf.branches)) {
                                            const matchedBranch = cf.branches.find(b => {
                                              const bClean = (b.value || b.label || '').toLowerCase().trim().replace(/\s*form$/, '');
                                              return bClean === cleanVal || cleanVal.includes(bClean) || bClean.includes(cleanVal);
                                            });
                                            if (matchedBranch) {
                                              next[cf.id + '_activeBranch'] = matchedBranch.value;
                                            }
                                          }
                                        });
                                        return next;
                                      });
                                    }}
                                    className="h-3.5 w-3.5 text-cyan-700 border-slate-300"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          ) : fieldType === 'checkbox' ? (
                            <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                              <input
                                type="checkbox"
                                checked={!!customFieldValues[f.label]}
                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [f.label]: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-cyan-700"
                              />
                              <span>{f.placeholder || f.label}</span>
                            </label>
                          ) : (fieldType === 'textarea' || fieldType === 'longtext') ? (
                            <textarea
                              rows={3}
                              required={f.required}
                              placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                              value={customFieldValues[f.label] || ''}
                              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [f.label]: e.target.value })}
                              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/50 focus:border-cyan-500 focus:outline-none resize-none"
                            />
                          ) : fieldType === 'file' ? (
                            <DragDropUploader
                              fieldId={`custom_file_${f.id || idx}`}
                              label={f.label}
                              required={f.required}
                              onFileSelected={(fileObj) => handleDragDropFile(fileObj, f.label)}
                              initialFilename={customFieldValues[f.label] || ''}
                              isUploading={isSubmittingTicket}
                            />
                          ) : (
                            <Input
                              type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
                              required={f.required}
                              placeholder={f.placeholder || `Enter ${f.label}`}
                              value={customFieldValues[f.label] || ''}
                              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [f.label]: e.target.value })}
                              className="rounded-xl border-slate-200 text-xs font-semibold text-slate-900 bg-slate-50/50 h-10"
                            />
                          )}
                          {f.helpText && (
                            <span className="text-[10px] text-slate-400 font-medium block">💡 {f.helpText}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}



              {!descCustomField && (
                <div className="space-y-1.5">
                  <Label htmlFor="create-desc">Description *</Label>
                  <textarea
                    id="create-desc"
                    required
                    rows={4}
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                    placeholder="Provide detailed description of your request or issue..."
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-900 focus:border-cyan-500 focus:outline-none resize-none"
                  ></textarea>
                </div>
              )}

              {/* Only show general attachment uploader if Form Builder does not have any file field */}
              {!hasCustomFileField && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Attachment / Proof (Optional)</Label>
                  <DragDropUploader
                    fieldId="general_ticket_attachment"
                    label="Attachment / Proof"
                    onFileSelected={(fileObj) => handleDragDropFile(fileObj, 'Attachment')}
                    initialFilename={customFieldValues['Attachment'] || ''}
                    isUploading={isSubmittingTicket}
                  />
                </div>
              )}
            </form>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsCreateOpen(false); setSelectedFileObj(null); setSelectedFilesMap({}); setLastUploadedBase64(''); }}
                className="w-full sm:w-auto rounded-xl text-xs font-bold text-slate-600 bg-white border-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="create-ticket-form"
                disabled={isSubmittingTicket}
                className="w-full sm:w-auto bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 rounded-xl cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmittingTicket ? (
                  <span className="flex items-center space-x-1.5">
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    <span>{selectedFileObj || Object.keys(selectedFilesMap || {}).length > 0 ? `Uploading ${selectedFileObj?.name || 'File'} & Creating...` : 'Creating Ticket...'}</span>
                  </span>
                ) : (
                  'Create Support Ticket'
                )}
              </Button>
            </div>

          </Card>
        </div>
      )}

      {/* MODERN UI DELETE CONFIRMATION MODAL */}
      {isEndUser && ratingModalTicket && (
        <CsatRatingModal
          isOpen={!!ratingModalTicket}
          onClose={() => setRatingModalTicket(null)}
          ticket={ratingModalTicket}
          onSubmitSuccess={() => {
            fetchInitialData();
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, mode: 'single', ticketId: null, itemName: '', itemSubtext: '', isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title={deleteModal.mode === 'bulk' ? 'Delete Selected Tickets' : 'Delete Support Ticket'}
        message={deleteModal.mode === 'bulk' ? `Are you sure you want to delete all ${selectedIds.length} selected tickets? This will permanently remove them from the system.` : 'Are you sure you want to delete this ticket? All conversation messages, activity history, and attachments will be deleted.'}
        itemName={deleteModal.itemName}
        itemSubtext={deleteModal.itemSubtext}
        confirmText={deleteModal.mode === 'bulk' ? `Yes, Delete ${selectedIds.length} Tickets` : 'Yes, Delete Ticket'}
        cancelText="Cancel"
        isLoading={deleteModal.isDeleting}
        type="danger"
      />

    </div>
  );
};

export default TicketsList;
