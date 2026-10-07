import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConfirmModal from '@/components/common/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import Pagination from '@/components/common/Pagination';
import { extractPageData } from '../utils/paginationHelper';
import { PlusCircle, Clock, ShieldCheck, Edit3, Trash2, X, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SlaPolicies = () => {
  const { user } = useAuth();
  const tenantCode = user?.companyCode || 'DEFAULT';
  const slaKey = `ticketpro_sla_${tenantCode}`;

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination State
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  // Modern UI Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    name: '',
    priority: '',
    isDeleting: false
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    priority: 'MEDIUM',
    responseTimeMinutes: 60,
    resolutionTimeMinutes: 480,
    status: 'ACTIVE',
  });

  const fetchPolicies = async (p = page, s = size) => {
    try {
      setLoading(true);
      const rawPolicies = await api.get(`/sla?page=${p}&size=${s}`).catch(() => null);
      if (rawPolicies) {
        const pageData = extractPageData(rawPolicies, p, s);
        const policyList = pageData.content || pageData.data || [];
        setPolicies(policyList);
        setTotalPages(pageData.totalPages ?? pageData.meta?.totalPages ?? 1);
        setTotalElements(pageData.totalElements ?? pageData.meta?.totalElements ?? policyList.length);
        return;
      }
      const stored = localStorage.getItem(slaKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) || [];
          setPolicies(parsed);
          setTotalElements(parsed.length);
          setTotalPages(Math.max(1, Math.ceil(parsed.length / s)));
        } catch(_e) {}
      } else {
        const defaultPolicies = [
          { id: 1, name: 'Critical Emergency SLA', priority: 'HIGH', responseTimeMinutes: 15, resolutionTimeMinutes: 120, status: 'ACTIVE' },
          { id: 2, name: 'Standard Business SLA', priority: 'MEDIUM', responseTimeMinutes: 60, resolutionTimeMinutes: 480, status: 'ACTIVE' },
          { id: 3, name: 'Low Priority Inquiry SLA', priority: 'LOW', responseTimeMinutes: 240, resolutionTimeMinutes: 1440, status: 'ACTIVE' }
        ];
        setPolicies(defaultPolicies);
        setTotalElements(defaultPolicies.length);
        setTotalPages(1);
        localStorage.setItem(slaKey, JSON.stringify(defaultPolicies));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies(page, size);
  }, [page, size]);

  const openCreateModal = () => {
    setSelectedPolicy(null);
    setFormData({
      name: '',
      priority: 'MEDIUM',
      responseTimeMinutes: 60,
      resolutionTimeMinutes: 480,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setSelectedPolicy(p);
    setFormData({
      name: p.name,
      priority: p.priority,
      responseTimeMinutes: p.responseTimeMinutes,
      resolutionTimeMinutes: p.resolutionTimeMinutes,
      status: p.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedPolicy) {
        await api.put(`/sla/${selectedPolicy.id}`, formData).catch(() => null);
      } else {
        await api.post('/sla', formData).catch(() => null);
      }
      setIsModalOpen(false);
      await fetchPolicies(page, size);
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const promptDelete = (p) => {
    setDeleteModal({
      isOpen: true,
      id: p.id,
      name: p.name,
      priority: p.priority,
      isDeleting: false
    });
  };

  const handleConfirmDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/sla/${id}`).catch(() => null);
      await fetchPolicies(page, size);
    } catch (err) {
      setError('Failed to delete SLA policy.');
    } finally {
      setDeleteModal({ isOpen: false, id: null, name: '', priority: '', isDeleting: false });
    }
  };

  return (
    <div className="space-y-6 text-left font-sans select-none pb-12 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">SLA Management</h1>
            <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 text-[10px] font-extrabold uppercase tracking-wider rounded-full px-3">
              {(policies?.length || 0)} Active Policies
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Define strict response and resolution thresholds based on issue priority.</p>
        </div>
        <Button
          onClick={openCreateModal}
          className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 gap-2 cursor-pointer active:scale-95 shrink-0 h-10 px-4"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Policy</span>
        </Button>
      </div>

      {error && (
        <Card className="rounded-2xl bg-rose-50 p-3.5 text-xs font-bold text-rose-600 border border-rose-200 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </Card>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : (policies && policies.length > 0) ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {policies.map((p) => (
            <Card key={p.id} className="rounded-3xl border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-md transition-all bg-white space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className={`rounded-full font-bold text-[10px] uppercase ${
                    p.priority === 'HIGH' || p.priority === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : p.priority === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                  }`}>
                    {p.priority}
                  </Badge>
                  <Badge variant="outline" className={`rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {p.status}
                  </Badge>
                </div>
                <h4 className="text-sm font-black text-slate-900 leading-snug">{p.name}</h4>
                
                <div className="mt-4 space-y-2 text-xs font-semibold text-slate-500">
                  <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Clock className="h-4 w-4 text-cyan-700 shrink-0" />
                    <span>Response: <strong className="text-slate-900">{p.responseTimeMinutes >= 60 ? `${p.responseTimeMinutes / 60} hr` : `${p.responseTimeMinutes} min`}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Clock className="h-4 w-4 text-cyan-700 shrink-0" />
                    <span>Resolution: <strong className="text-slate-900">{p.resolutionTimeMinutes >= 60 ? `${p.resolutionTimeMinutes / 60} hr` : `${p.resolutionTimeMinutes} min`}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(p)}
                  className="rounded-xl bg-slate-50 hover:bg-cyan-50 hover:text-cyan-700 px-3 py-1.5 text-xs font-bold text-slate-700 border-slate-200 transition-colors cursor-pointer gap-1 h-8"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => promptDelete(p)}
                  className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Delete SLA"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <ShieldCheck className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No SLA policies defined yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">Define strict response and resolution thresholds based on issue priority.</p>
          <Button
            onClick={openCreateModal}
            className="mt-4 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white text-xs font-bold gap-1.5 h-9 px-4 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create SLA Policy</span>
          </Button>
        </div>
      )}

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

      {/* SLA Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <Card className="rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-slate-100 space-y-4 sm:space-y-5 relative bg-white my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-black text-slate-900">
                {selectedPolicy ? 'Edit SLA Policy' : 'Create SLA Policy'}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Policy Name *</Label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Critical Bug Resolution"
                  className="rounded-2xl border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</Label>
                  <CustomSelect
                    value={formData.priority}
                    onChange={(val) => setFormData({ ...formData, priority: val })}
                    options={[
                      { value: 'LOW', label: 'Low' },
                      { value: 'MEDIUM', label: 'Medium' },
                      { value: 'HIGH', label: 'High' }
                    ]}
                    buttonClassName="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 bg-white cursor-pointer h-10 shadow-none"
                  />
                </div>

                <div>
                  <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</Label>
                  <CustomSelect
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' }
                    ]}
                    buttonClassName="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 bg-white cursor-pointer h-10 shadow-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Response (Mins)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.responseTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, responseTimeMinutes: Number(e.target.value) })}
                    className="rounded-2xl border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 h-10"
                  />
                </div>

                <div>
                  <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resolution (Mins)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.resolutionTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, resolutionTimeMinutes: Number(e.target.value) })}
                    className="rounded-2xl border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 h-10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 cursor-pointer gap-1.5 h-10 px-4"
                >
                  <Save className="h-4 w-4" />
                  <span>{selectedPolicy ? 'Save Changes' : 'Create Policy'}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODERN UI DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, name: '', priority: '', isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete SLA Policy"
        message="Are you sure you want to delete this SLA policy? Response and resolution time thresholds will no longer be enforced under this policy."
        itemName={deleteModal.name}
        itemSubtext={deleteModal.priority ? `Priority Tier: ${deleteModal.priority}` : undefined}
        confirmText="Yes, Delete SLA"
        cancelText="Keep SLA"
        isLoading={deleteModal.isDeleting}
        type="danger"
      />

    </div>
  );
};

export default SlaPolicies;
