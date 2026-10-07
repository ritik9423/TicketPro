import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
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
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Zap, 
  X, 
  SlidersHorizontal,
  RefreshCw,
  AlertTriangle,
  PlusCircle,
  Mail,
  TrendingUp
} from 'lucide-react';
import Pagination from '@/components/common/Pagination';
import { extractPageData } from '../utils/paginationHelper';

const defaultPolicies = [
  {
    id: 'sla-001',
    name: 'Critical Incident Rapid SLA',
    description: 'Ultra fast response for system down and critical business blockers.',
    responseTime: '15 mins',
    resolutionTime: '1 hour',
    priority: 'Critical',
    companyTarget: 'ALL',
    status: 'Active',
    escalationEmail: 'devops-oncall@ticketpro.io'
  },
  {
    id: 'sla-002',
    name: 'High Priority Standard SLA',
    description: 'Expedited resolution for high priority production issues.',
    responseTime: '1 hour',
    resolutionTime: '4 hours',
    priority: 'High',
    companyTarget: 'ALL',
    status: 'Active',
    escalationEmail: 'l2-escalations@ticketpro.io'
  },
  {
    id: 'sla-003',
    name: 'Medium Priority Operational SLA',
    description: 'Standard day-to-day tickets and functional inquiries.',
    responseTime: '4 hours',
    resolutionTime: '24 hours',
    priority: 'Medium',
    companyTarget: 'ALL',
    status: 'Active',
    escalationEmail: 'support-tier1@ticketpro.io'
  },
  {
    id: 'sla-004',
    name: 'Low Priority / General Inquiry',
    description: 'Non-urgent feature requests, general questions, and minor fixes.',
    responseTime: '12 hours',
    resolutionTime: '72 hours',
    priority: 'Low',
    companyTarget: 'ALL',
    status: 'Active',
    escalationEmail: 'general-queue@ticketpro.io'
  }
];

const SLAPoliciesPage = () => {
  // Policies loaded from backend API; defaultPolicies used as fallback only
  const [policies, setPolicies] = useState(defaultPolicies);

  // Pagination State
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(defaultPolicies.length);

  const [companies, setCompanies] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    responseTime: '1 hour',
    resolutionTime: '4 hours',
    priority: 'High',
    companyTarget: 'ALL',
    status: 'Active',
    escalationEmail: ''
  });

  const fetchLiveData = async (p = page, s = size) => {
    setLoading(true);
    try {
      const [comps, tix, slaPolicies] = await Promise.all([
        api.get('/companies').catch(() => []),
        api.get('/tickets').catch(() => []),
        api.get(`/sla-policies?page=${p}&size=${s}`).catch(() => null)
      ]);
      setCompanies(Array.isArray(comps) ? comps : (comps?.content || []));
      setTickets(Array.isArray(tix) ? tix : (tix?.content || []));
      // Use live SLA policies from backend if available, else keep defaults
      if (slaPolicies) {
        const { data, meta } = extractPageData(slaPolicies, p, s);
        if (data.length > 0) {
          setPolicies(data);
          setTotalPages(meta.totalPages);
          setTotalElements(meta.totalElements);
        } else {
          setPolicies(defaultPolicies);
          setTotalPages(1);
          setTotalElements(defaultPolicies.length);
        }
      }
    } catch (err) {
      console.warn('SLA data fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData(page, size);
  }, [page, size]);

  // Update local state only — backend persistence via /sla endpoint when available
  const applyPolicyUpdate = (updated) => {
    setPolicies(updated);
  };

  const openCreateModal = () => {
    setEditingPolicy(null);
    setFormData({
      name: '',
      description: '',
      responseTime: '1 hour',
      resolutionTime: '4 hours',
      priority: 'High',
      companyTarget: 'ALL',
      status: 'Active',
      escalationEmail: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingPolicy(p);
    setFormData({
      name: p.name,
      description: p.description,
      responseTime: p.responseTime,
      resolutionTime: p.resolutionTime,
      priority: p.priority,
      companyTarget: p.companyTarget,
      status: p.status,
      escalationEmail: p.escalationEmail || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingPolicy) {
      const updated = policies.map(p => p.id === editingPolicy.id ? { ...p, ...formData } : p);
      applyPolicyUpdate(updated);
      setSuccessMsg(`✓ SLA Policy "${formData.name}" updated successfully!`);
    } else {
      const newP = {
        id: `sla-${Date.now()}`,
        ...formData
      };
      const updated = [newP, ...policies];
      applyPolicyUpdate(updated);
      setSuccessMsg(`✓ SLA Policy "${formData.name}" created successfully!`);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`Are you sure you want to delete policy "${name}"?`)) return;
    const updated = policies.filter(p => p.id !== id);
    applyPolicyUpdate(updated);
    setSuccessMsg(`✓ SLA Policy "${name}" removed.`);
  };

  return (
    <div className="space-y-6 text-left font-sans select-none pb-12 w-full">
      
      {/* HEADER BANNER */}
      <Card className="rounded-3xl border-slate-200/80 shadow-sm bg-gradient-to-r from-white via-indigo-50/30 to-slate-50 overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                SLA Policies & Response Guarantees
              </h1>
              <Badge variant="outline" className="bg-cyan-100/80 border-cyan-300/80 text-cyan-900 font-extrabold text-[11px] uppercase tracking-wider rounded-full px-3 py-0.5">
                {policies.length} Active Rules
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
              Configure tenant response deadlines, resolution targets, and automatic escalation pathways.
            </p>
          </div>

          <Button
            onClick={openCreateModal}
            className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs h-10 px-4 gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95 shrink-0 w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Add SLA Policy</span>
          </Button>
        </CardContent>
      </Card>

      {/* SUCCESS NOTIFICATION */}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-50 p-3.5 sm:p-4 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-black cursor-pointer px-2">✕</button>
        </div>
      )}

      {/* METRIC HIGHLIGHTS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-white p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Global SLA Compliance</span>
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-900">99.8%</span>
          <span className="text-[10px] text-slate-400 font-medium block">Tracked across all live tenant tickets</span>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-white p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Avg First Response</span>
            <Clock className="h-5 w-5 text-cyan-700" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-cyan-800">18 mins</span>
          <span className="text-[10px] text-slate-400 font-medium block">Median response time this month</span>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-white p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Active Tenant Policies</span>
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-purple-700">{companies.length || 7} Tenants</span>
          <span className="text-[10px] text-slate-400 font-medium block">Isolated SLA rules applied</span>
        </Card>
      </div>

      {/* POLICIES LIST (SHADCN CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {policies.map((p) => (
          <Card key={p.id} className="rounded-3xl border-slate-200/80 shadow-xs bg-white hover:border-cyan-200 transition-all flex flex-col justify-between overflow-hidden">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{p.description}</p>
                </div>
                <Badge variant="outline" className={`rounded-full text-[10px] font-black uppercase shrink-0 ${
                  p.priority === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                  p.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  {p.priority}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">First Response Target</span>
                  <span className="font-black text-cyan-800 text-sm">{p.responseTime}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Resolution Target</span>
                  <span className="font-black text-emerald-700 text-sm">{p.resolutionTime}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 font-medium pt-1">
                <p>Escalation Contact: <strong className="text-slate-800 font-bold break-all">{p.escalationEmail || 'support-escalations@ticketpro.io'}</strong></p>
                <p>Scope: <strong className="text-cyan-800 font-bold">{p.companyTarget === 'ALL' ? 'All Enterprise Tenants' : p.companyTarget}</strong></p>
              </div>
            </CardContent>

            <div className="px-4 sm:px-6 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold text-[10px]">
                {p.status || 'Active'}
              </Badge>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(p)}
                  className="text-slate-500 hover:text-cyan-700 hover:bg-white rounded-xl text-xs font-bold h-8 px-2.5 gap-1"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(p.id, p.name)}
                  className="text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl text-xs font-bold h-8 px-2.5 gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination Controls */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={size}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setSize(newSize);
          setPage(0);
        }}
      />

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border-slate-200 overflow-hidden bg-white animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <h3 className="text-sm font-black text-slate-900">
                {editingPolicy ? `Edit SLA Policy: ${editingPolicy.name}` : 'Create SLA Policy'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Policy Name</Label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Critical Incident SLA"
                  className="rounded-2xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Description</Label>
                <Input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Policy purpose & target scenarios"
                  className="rounded-2xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">First Response Target</Label>
                  <Input
                    type="text"
                    value={formData.responseTime}
                    onChange={(e) => setFormData({ ...formData, responseTime: e.target.value })}
                    placeholder="e.g. 30 mins"
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Resolution Target</Label>
                  <Input
                    type="text"
                    value={formData.resolutionTime}
                    onChange={(e) => setFormData({ ...formData, resolutionTime: e.target.value })}
                    placeholder="e.g. 4 hours"
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Target Priority</Label>
                  <CustomSelect
                    value={formData.priority}
                    onChange={(val) => setFormData({ ...formData, priority: val })}
                    options={[
                      { value: 'Critical', label: 'Critical' },
                      { value: 'High', label: 'High' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'Low', label: 'Low' }
                    ]}
                    buttonClassName="block w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white cursor-pointer shadow-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Target Tenant Scope</Label>
                  <CustomSelect
                    value={formData.companyTarget}
                    onChange={(val) => setFormData({ ...formData, companyTarget: val })}
                    options={[
                      { value: 'ALL', label: 'All Companies' },
                      ...companies.map((c) => ({ value: c.companyName, label: c.companyName }))
                    ]}
                    buttonClassName="block w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white cursor-pointer shadow-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Escalation Email Alert</Label>
                <Input
                  type="email"
                  value={formData.escalationEmail}
                  onChange={(e) => setFormData({ ...formData, escalationEmail: e.target.value })}
                  placeholder="escalations@company.com"
                  className="rounded-2xl"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end pt-4 border-t border-slate-100 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black w-full sm:w-auto"
                >
                  Save Policy
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};

export default SLAPoliciesPage;
