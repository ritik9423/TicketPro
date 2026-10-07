import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConfirmModal from '@/components/common/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  Save, 
  Layers,
  AlertTriangle
} from 'lucide-react';

const DEFAULT_DEPARTMENTS = [
  {
    id: 'dept-it',
    name: 'IT & Infrastructure',
    code: 'DEPT-IT',
    description: 'Hardware provisioning, network connectivity, software access, and system infrastructure helpdesk.',
    headName: '',
    color: 'indigo',
    icon: '💻'
  },
  {
    id: 'dept-hr',
    name: 'Human Resources (HR)',
    code: 'DEPT-HR',
    description: 'Employee onboarding, KYC verification, payroll inquiries, attendance, and leave management.',
    headName: '',
    color: 'purple',
    icon: '🏢'
  },
  {
    id: 'dept-fin',
    name: 'Finance & Accounting',
    code: 'DEPT-FIN',
    description: 'Invoice processing, expense reimbursements, vendor payments, billing, and tax documentation.',
    headName: '',
    color: 'emerald',
    icon: '💳'
  },
  {
    id: 'dept-sales',
    name: 'Sales & Marketing',
    code: 'DEPT-SALES',
    description: 'Client lead management, product demos, marketing collaterals, and customer acquisition support.',
    headName: '',
    color: 'amber',
    icon: '📈'
  },
  {
    id: 'dept-ops',
    name: 'Operations & Logistics',
    code: 'DEPT-OPS',
    description: 'Fleet tracking, inventory supply chain, warehouse dispatch, terminal logistics, and field support.',
    headName: '',
    color: 'blue',
    icon: '🚚'
  },
  {
    id: 'dept-cs',
    name: 'Customer Support',
    code: 'DEPT-CS',
    description: 'General customer inquiries, product feedback, service level assistance, and ticket escalation.',
    headName: '',
    color: 'teal',
    icon: '🎧'
  }
];

const Departments = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [loading, setLoading] = useState(true);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    headName: '',
    color: 'indigo',
    icon: '🏢'
  });

  // Modern UI Delete & Warning Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    name: '',
    code: '',
    isDeleting: false
  });
  const [warningModal, setWarningModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  const tenantCode = (user?.companyCode || 'DEFAULT').toUpperCase();

  // Prevent background scroll when modal is active & enable ESC key close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // Load Departments, Tickets & Agents via live Backend API
  const loadData = async () => {
    try {
      setLoading(true);

      const [deptsData, ticketsData, usersData] = await Promise.all([
        api.get('/departments').catch(() => null),
        api.get('/tickets').catch(() => null),
        api.get('/users').catch(() => null)
      ]);

      const savedLocal = localStorage.getItem(`ticketpro_departments_${tenantCode}`) || localStorage.getItem('ticketpro_all_departments');
      let localDepts = null;
      if (savedLocal) {
        try { localDepts = JSON.parse(savedLocal); } catch(e) {}
      }

      let deptsList = [];
      if (Array.isArray(deptsData) && deptsData.length > 0) {
        deptsList = deptsData;
      } else if (Array.isArray(localDepts) && localDepts.length > 0) {
        deptsList = localDepts;
      } else {
        deptsList = DEFAULT_DEPARTMENTS;
      }

      // Filter departments for Agent/Staff role
      if (user?.role === 'AGENT' && user?.department) {
        const agentDeptLower = user.department.toLowerCase();
        deptsList = deptsList.filter(d => {
          const dNameLower = (d.name || '').toLowerCase();
          return dNameLower.includes(agentDeptLower.substring(0, 4)) || agentDeptLower.includes(dNameLower.substring(0, 4));
        });
      }

      setDepartments(deptsList);
      setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      setAgents(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Failed to load department data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Dynamic Real Staff Lead Resolution Helper
  const getRealDeptHead = (deptName, storedHeadName) => {
    if (!deptName) return '';
    const dLower = deptName.toLowerCase().trim();

    const deletedUserIds = JSON.parse(localStorage.getItem('ticketpro_deleted_user_ids') || '[]');
    const activeStaff = agents.filter(a => 
      a && a.name && 
      (a.role || '').toUpperCase() !== 'COMPANY_ADMIN' && 
      (a.role || '').toUpperCase() !== 'SUPER_ADMIN' &&
      !deletedUserIds.includes(String(a.id)) && 
      !deletedUserIds.includes((a.email || '').toLowerCase())
    );

    const matchedStaff = activeStaff.find(a => {
      const aDept = (a.department || '').toLowerCase().trim();
      if (!aDept) return false;

      if (dLower.includes('it') || dLower.includes('infra')) {
        return aDept.includes('it') || aDept.includes('infra') || aDept.includes('tech');
      }
      if (dLower.includes('hr') || dLower.includes('human')) {
        return aDept.includes('hr') || aDept.includes('human');
      }
      if (dLower.includes('fin') || dLower.includes('account')) {
        return aDept.includes('fin') || aDept.includes('account');
      }
      if (dLower.includes('sales') || dLower.includes('market')) {
        return aDept.includes('sales') || aDept.includes('market');
      }
      if (dLower.includes('ops') || dLower.includes('logistics')) {
        return aDept.includes('ops') || aDept.includes('logistics');
      }
      if (dLower.includes('support') || dLower.includes('customer')) {
        return aDept.includes('support') || aDept.includes('customer');
      }

      return aDept === dLower || aDept.includes(dLower.substring(0, 3)) || dLower.includes(aDept.substring(0, 3));
    });

    if (matchedStaff && matchedStaff.name) {
      return matchedStaff.name;
    }

    if (storedHeadName && 
        !storedHeadName.toLowerCase().includes('lead') && 
        !storedHeadName.toLowerCase().includes('unassigned') && 
        !storedHeadName.toLowerCase().includes('ritik')) {
      return storedHeadName;
    }

    if (dLower.includes('it') || dLower.includes('infra')) {
      const ranjanUser = activeStaff.find(a => (a.name || '').toLowerCase().includes('ranjan') || (a.email || '').toLowerCase().includes('ritik'));
      if (ranjanUser && ranjanUser.name) return ranjanUser.name;
    }

    return '';
  };

  // Save Departments Helper
  const saveDepartments = (updatedList) => {
    setDepartments(updatedList);
    try {
      localStorage.setItem(`ticketpro_departments_${tenantCode}`, JSON.stringify(updatedList));
      localStorage.setItem('ticketpro_all_departments', JSON.stringify(updatedList));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('ticketpro_departments_updated'));
    } catch(e) {}
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingDept(null);
    setDeptForm({
      name: '',
      code: `DEPT-${Math.floor(100 + Math.random() * 900)}`,
      description: '',
      headName: user?.name || 'Department Lead',
      color: 'indigo',
      icon: '🏢'
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      headName: dept.headName || '',
      color: dept.color || 'indigo',
      icon: dept.icon || '🏢'
    });
    setIsModalOpen(true);
  };

  // Request Delete with sleek UI Confirmation
  const promptDeleteDept = (dept) => {
    if (departments.length <= 1) {
      setWarningModal({
        isOpen: true,
        title: 'Action Prohibited',
        message: 'You cannot delete the last remaining department. At least one organization unit is required.'
      });
      return;
    }
    setDeleteModal({
      isOpen: true,
      id: dept.id,
      name: dept.name,
      code: dept.code,
      isDeleting: false
    });
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    const { id, name } = deleteModal;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      if (typeof id === 'number' || (!isNaN(Number(id)) && !String(id).startsWith('dept-'))) {
        await api.delete(`/departments/${id}`).catch(() => null);
      }
    } catch (err) {
      console.error('Backend delete department error:', err);
    }

    const updated = departments.filter(d => String(d.id) !== String(id));
    saveDepartments(updated);
    setDeleteModal({ isOpen: false, id: null, name: '', code: '', isDeleting: false });
  };

  // Form Submit Handler (Add / Edit)
  const handleSubmitDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;

    if (editingDept) {
      let savedFromServer = null;
      const isNumericId = typeof editingDept.id === 'number' || (!isNaN(Number(editingDept.id)) && !String(editingDept.id).startsWith('dept-'));

      try {
        if (isNumericId) {
          savedFromServer = await api.put(`/departments/${editingDept.id}`, {
            name: deptForm.name.trim(),
            code: deptForm.code.trim() || `DEPT-${Date.now().toString().slice(-4)}`,
            description: deptForm.description.trim(),
            status: 'ACTIVE'
          }).catch(() => null);
        } else {
          // If editing a mock or default template department, persist it in the database
          savedFromServer = await api.post('/departments', {
            name: deptForm.name.trim(),
            code: deptForm.code.trim() || `DEPT-${Date.now().toString().slice(-4)}`,
            description: deptForm.description.trim(),
            status: 'ACTIVE'
          }).catch(() => null);
        }
      } catch (err) {
        console.error('Failed to sync department update with backend:', err);
      }

      const realId = savedFromServer?.id || editingDept.id;
      const updated = departments.map(d => {
        if (String(d.id) === String(editingDept.id)) {
          return {
            ...d,
            id: realId,
            name: deptForm.name.trim(),
            code: deptForm.code.trim() || `DEPT-${Date.now().toString().slice(-4)}`,
            description: deptForm.description.trim(),
            headName: deptForm.headName.trim() || 'Department Lead',
            color: deptForm.color,
            icon: deptForm.icon
          };
        }
        return d;
      });
      saveDepartments(updated);
    } else {
      let savedFromServer = null;
      try {
        savedFromServer = await api.post('/departments', {
          name: deptForm.name.trim(),
          code: deptForm.code.trim() || `DEPT-${Math.floor(100 + Math.random() * 900)}`,
          description: deptForm.description.trim(),
          status: 'ACTIVE'
        }).catch(() => null);
      } catch (err) {
        console.error('Failed to save new department to backend:', err);
      }

      const newObj = {
        id: savedFromServer?.id || `dept-${Date.now()}`,
        name: deptForm.name.trim(),
        code: deptForm.code.trim() || `DEPT-${Math.floor(100 + Math.random() * 900)}`,
        description: deptForm.description.trim(),
        headName: deptForm.headName.trim() || 'Department Lead',
        color: deptForm.color,
        icon: deptForm.icon || '🏢'
      };
      saveDepartments([newObj, ...departments]);
    }

    setIsModalOpen(false);
  };

  // Calculate live stats for department
  const getDeptStats = (deptName) => {
    const dLower = (deptName || '').toLowerCase();
    
    const deptTickets = tickets.filter(t => {
      const tDeptLower = (t.department || t.categoryName || t.category?.name || t.category?.targetDepartment || '').toLowerCase();
      return tDeptLower && dLower && (
        tDeptLower.includes(dLower.substring(0, 4)) || 
        dLower.includes(tDeptLower.substring(0, 4))
      );
    });

    const openCount = deptTickets.filter(t => {
      const s = (t.status || '').toUpperCase();
      return s === 'NEW' || s === 'OPEN' || s === 'IN_PROGRESS';
    }).length;

    const resolvedCount = deptTickets.filter(t => {
      const s = (t.status || '').toUpperCase();
      return s === 'RESOLVED' || s === 'CLOSED';
    }).length;

    const assignedAgentsCount = agents.filter(a => {
      const aDeptLower = (a.department || '').toLowerCase();
      return aDeptLower && dLower && (
        aDeptLower.includes(dLower.substring(0, 4)) ||
        dLower.includes(aDeptLower.substring(0, 4))
      );
    }).length;

    return {
      totalTickets: deptTickets.length,
      openTickets: openCount,
      resolvedTickets: resolvedCount,
      agentsCount: assignedAgentsCount
    };
  };

  const filteredDepartments = departments.filter(d => 
    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const colorBadgeClasses = {
    indigo: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center space-x-3 text-cyan-700 font-bold text-sm">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></span>
          <span>Loading Departments Hub...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans text-slate-900 pb-12 select-none w-full">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Organization Departments</h1>
            <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 text-[10px] font-extrabold uppercase tracking-wider rounded-full px-3">
              {departments.length} Active Hubs
            </Badge>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Manage corporate service units, designated department leads, and ticket routing rules.</p>
        </div>

        {user?.role !== 'AGENT' && (
          <Button
            onClick={handleOpenCreate}
            className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 gap-2 cursor-pointer active:scale-95 shrink-0 h-10 px-4 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Department</span>
          </Button>
        )}
      </div>

      {/* SEARCH BAR & VIEW MODE TOGGLE */}
      <Card className="rounded-3xl border-slate-200/80 shadow-xs p-3 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0 w-full">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search department by name, tag code or scope..."
              className="w-full pl-10 rounded-2xl border-slate-200 text-xs font-medium focus:border-cyan-500 bg-slate-50/50 h-10"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 border border-slate-200 p-1 rounded-2xl bg-slate-50 self-end sm:self-auto shrink-0">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-xl text-xs font-bold gap-1.5 h-8 px-3 ${viewMode === 'list' ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>List View</span>
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`rounded-xl text-xs font-bold gap-1.5 h-8 px-3 ${viewMode === 'grid' ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Grid Cards</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* LINE BY LINE LIST VIEW (DEFAULT) */}
      {viewMode === 'list' ? (
        <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
          {/* MOBILE CARD LIST VIEW (< md) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredDepartments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold px-4 text-xs">
                No departments found matching "{searchQuery}".
              </div>
            ) : (
              filteredDepartments.map((dept) => {
                const stats = getDeptStats(dept.name);
                const colorStyle = colorBadgeClasses[dept.color] || colorBadgeClasses.indigo;
                const realHeadName = getRealDeptHead(dept.name, dept.headName);

                return (
                  <div key={dept.id} className="p-4 space-y-3 hover:bg-cyan-50/20 transition-colors">
                    {/* Header: Icon, Name, Badge, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="text-xl p-2 rounded-2xl bg-slate-100/80 shrink-0">{dept.icon || '🏢'}</span>
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-900 text-xs truncate block">
                            {dept.name}
                          </span>
                          <Badge variant="outline" className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider inline-block mt-0.5 ${colorStyle}`}>
                            {dept.code}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(dept)}
                          className="rounded-xl text-[11px] font-bold border-slate-200 text-slate-700 bg-white hover:bg-cyan-50 hover:text-cyan-700 h-7 px-2 gap-1 cursor-pointer"
                          title="Edit / Rename Department"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Rename</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => promptDeleteDept(dept)}
                          className="h-7 w-7 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Department"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {dept.description || 'No description provided for this department.'}
                    </p>

                    {/* Footer: Head of Dept & Metrics */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-50 text-xs">
                      {realHeadName ? (
                        <div className="flex items-center space-x-1.5">
                          <div className="h-5 w-5 rounded-full bg-cyan-100 border border-cyan-200 text-cyan-800 font-extrabold text-[9px] flex items-center justify-center shrink-0">
                            {realHeadName.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800 text-[11px] truncate max-w-[130px]">
                            {realHeadName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 italic">
                          -- Unassigned Head --
                        </span>
                      )}

                      <div className="inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-[10.5px]">
                        <span className="font-bold text-amber-600">🟡 {stats.openTickets}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-emerald-600">🟢 {stats.resolvedTickets}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-cyan-700">👥 {stats.agentsCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE VIEW (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <TableHead className="py-3.5 px-5">Department & Tag</TableHead>
                  <TableHead className="py-3.5 px-4">Description & Scope</TableHead>
                  <TableHead className="py-3.5 px-4">Head of Dept</TableHead>
                  <TableHead className="py-3.5 px-4 text-center">Live Metrics</TableHead>
                  <TableHead className="py-3.5 px-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                      No departments found matching "{searchQuery}".
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDepartments.map((dept) => {
                    const stats = getDeptStats(dept.name);
                    const colorStyle = colorBadgeClasses[dept.color] || colorBadgeClasses.indigo;
                    const realHeadName = getRealDeptHead(dept.name, dept.headName);

                    return (
                      <TableRow key={dept.id} className="hover:bg-cyan-50/20 transition-colors group border-b border-slate-100">
                        {/* 1. Name & Code */}
                        <TableCell className="py-4 px-5">
                          <div className="flex items-center space-x-3">
                            <span className="text-xl p-2 rounded-2xl bg-slate-100/80 shrink-0">{dept.icon || '🏢'}</span>
                            <div>
                              <span className="font-extrabold text-slate-900 block group-hover:text-cyan-700 transition-colors text-xs">
                                {dept.name}
                              </span>
                              <Badge variant="outline" className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider inline-block mt-0.5 ${colorStyle}`}>
                                {dept.code}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Description */}
                        <TableCell className="py-4 px-4 max-w-xs text-slate-500">
                          <p className="line-clamp-2 leading-relaxed text-[11px]">
                            {dept.description || 'No description provided for this department.'}
                          </p>
                        </TableCell>

                        {/* 3. Head of Dept */}
                        <TableCell className="py-4 px-4 whitespace-nowrap">
                          {realHeadName ? (
                            <div className="flex items-center space-x-2">
                              <div className="h-7 w-7 rounded-full bg-cyan-100 border border-cyan-200 text-cyan-800 font-extrabold text-[10px] flex items-center justify-center">
                                {realHeadName.charAt(0)}
                              </div>
                              <span className="font-extrabold text-slate-900 text-xs">
                                {realHeadName}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 opacity-50">
                              <div className="h-7 w-7 rounded-full bg-slate-100 border border-dashed border-slate-300 text-slate-400 font-bold text-[10px] flex items-center justify-center">
                                --
                              </div>
                              <span className="font-semibold text-slate-400 text-xs italic">
                                -- Unassigned --
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* 4. Live Metrics */}
                        <TableCell className="py-4 px-4 whitespace-nowrap text-center">
                          <div className="inline-flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                            <span className="text-[11px] font-bold text-amber-600" title="Open Tickets">
                              🟡 {stats.openTickets} Open
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[11px] font-bold text-emerald-600" title="Resolved Tickets">
                              🟢 {stats.resolvedTickets} Resolved
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[11px] font-bold text-cyan-700" title="Assigned Staff">
                              👥 {stats.agentsCount} Staff
                            </span>
                          </div>
                        </TableCell>

                        {/* 5. Actions */}
                        <TableCell className="py-4 px-5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(dept)}
                              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 transition-all cursor-pointer h-8 px-2.5 gap-1"
                              title="Edit / Rename Department"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Rename</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => promptDeleteDept(dept)}
                              className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Delete Department"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepartments.map((dept) => {
            const stats = getDeptStats(dept.name);
            const colorStyle = colorBadgeClasses[dept.color] || colorBadgeClasses.indigo;
            const realHeadName = getRealDeptHead(dept.name, dept.headName);

            return (
              <Card 
                key={dept.id}
                className="rounded-3xl border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5 bg-white p-6 relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl p-2 rounded-2xl bg-slate-100">{dept.icon || '🏢'}</span>
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-snug group-hover:text-cyan-700 transition-colors">{dept.name}</h3>
                        <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider inline-block mt-0.5 ${colorStyle}`}>
                          {dept.code}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(dept)}
                        className="h-8 w-8 rounded-xl text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 cursor-pointer"
                        title="Edit / Rename Department"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => promptDeleteDept(dept)}
                        className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete Department"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                    {dept.description || 'No description added for this department.'}
                  </p>

                  <div className="text-[11px] font-bold text-slate-400 flex items-center space-x-1">
                    <span>Head of Dept:</span>
                    <span className="text-slate-800 font-extrabold">
                      {realHeadName || '-- Unassigned --'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center bg-slate-50/60 p-3 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Open</span>
                    <span className="text-sm font-black text-amber-600">{stats.openTickets}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Resolved</span>
                    <span className="text-sm font-black text-emerald-600">{stats.resolvedTickets}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Staff</span>
                    <span className="text-sm font-black text-cyan-700">{stats.agentsCount}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT DEPARTMENT MODAL - FULLY RESPONSIVE & PERFECTLY CONSTRAINED */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in p-3 sm:p-4 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col text-left overflow-hidden my-auto animate-in zoom-in-95 duration-150"
            style={{ maxHeight: 'min(88vh, 620px)' }}
          >
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-cyan-700" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {editingDept ? 'Rename / Edit Department' : 'Add New Department'}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400">
                    {editingDept ? 'Update department details and preferences' : 'Configure a new organizational unit'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                title="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Form with Scrollable Fields Body & Fixed Footer */}
            <form onSubmit={handleSubmitDept} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-3.5">
                <div>
                  <Label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Department Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="e.g. Cybersecurity & Compliance"
                    className="w-full rounded-2xl border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 h-9 sm:h-10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dept Tag Code</Label>
                    <Input
                      type="text"
                      value={deptForm.code}
                      onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                      placeholder="e.g. DEPT-CYBER"
                      className="w-full rounded-2xl border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 h-9 sm:h-10"
                    />
                  </div>

                  <div>
                    <Label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department Lead</Label>
                    <Input
                      type="text"
                      value={deptForm.headName}
                      onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
                      placeholder="Lead Full Name"
                      className="w-full rounded-2xl border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 h-9 sm:h-10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department Description</Label>
                  <textarea
                    rows={2}
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    placeholder="Describe department responsibilities and coverage scope..."
                    className="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-cyan-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                  <div>
                    <Label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Icon Emoji</Label>
                    <CustomSelect
                      value={deptForm.icon}
                      onChange={(val) => {
                        const v = val?.target ? val.target.value : val;
                        setDeptForm({ ...deptForm, icon: v });
                      }}
                      options={[
                        { value: '🏢', label: '🏢 Corporate Office' },
                        { value: '💻', label: '💻 IT & Tech' },
                        { value: '💳', label: '💳 Finance & Bank' },
                        { value: '📈', label: '📈 Sales & Growth' },
                        { value: '🚚', label: '🚚 Operations & Logistics' },
                        { value: '🎧', label: '🎧 Support & Helpdesk' },
                        { value: '🛡️', label: '🛡️ Security & Cyber' },
                        { value: '⚖️', label: '⚖️ Legal & Compliance' }
                      ]}
                      buttonClassName="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-900 bg-white cursor-pointer h-9 sm:h-10 shadow-none"
                    />
                  </div>

                  <div>
                    <Label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Theme Color</Label>
                    <CustomSelect
                      value={deptForm.color}
                      onChange={(val) => {
                        const v = val?.target ? val.target.value : val;
                        setDeptForm({ ...deptForm, color: v });
                      }}
                      options={[
                        { value: 'indigo', label: 'Indigo Violet' },
                        { value: 'purple', label: 'Purple HR' },
                        { value: 'emerald', label: 'Emerald Finance' },
                        { value: 'amber', label: 'Amber Sales' },
                        { value: 'blue', label: 'Blue Ops' },
                        { value: 'teal', label: 'Teal Support' },
                        { value: 'rose', label: 'Rose Security' }
                      ]}
                      buttonClassName="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-900 bg-white cursor-pointer h-9 sm:h-10 shadow-none"
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Bottom Action Buttons (Always visible in viewport) */}
              <div className="flex items-center justify-end space-x-2.5 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 shrink-0 bg-slate-50/70">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer h-9 sm:h-10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 cursor-pointer gap-1.5 h-9 sm:h-10 px-5"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingDept ? 'Save Changes' : 'Create Department'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODERN UI DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, name: '', code: '', isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Department"
        message="Are you sure you want to delete this department? All associated tickets, SLAs, and routing links will be detached."
        itemName={deleteModal.name}
        itemSubtext={deleteModal.code ? `Tag: ${deleteModal.code}` : undefined}
        confirmText="Yes, Delete Department"
        cancelText="Keep Department"
        isLoading={deleteModal.isDeleting}
        type="danger"
      />

      {/* WARNING / CANNOT DELETE MODAL */}
      {warningModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setWarningModal({ isOpen: false, title: '', message: '' })}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 my-auto text-left">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-base font-black text-slate-900">{warningModal.title}</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              {warningModal.message}
            </p>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setWarningModal({ isOpen: false, title: '', message: '' })}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 h-9 cursor-pointer"
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Departments;
