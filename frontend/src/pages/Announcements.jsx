import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConfirmModal from '@/components/common/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import { PlusCircle, Megaphone, Clock, User, Edit3, Trash2, X, Save, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Announcements = () => {
  const { user } = useAuth();
  const tenantCode = user?.companyCode || 'DEFAULT';
  const announcementsKey = `ticketpro_announcements_${tenantCode}`;

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Modern UI Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    title: '',
    isDeleting: false
  });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    status: 'ACTIVE',
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const serverAnnouncements = await api.get('/announcements').catch(() => null);
      if (Array.isArray(serverAnnouncements) && serverAnnouncements.length > 0) {
        setAnnouncements(serverAnnouncements);
        try { localStorage.setItem(announcementsKey, JSON.stringify(serverAnnouncements)); } catch(e) {}
        return;
      }
      const stored = localStorage.getItem(announcementsKey);
      if (stored) {
        try {
          setAnnouncements(JSON.parse(stored) || []);
        } catch(_e) {}
      } else {
        const defaultAnnouncements = [
          {
            id: 1,
            title: '🚀 TicketPro System Upgrade Completed',
            message: 'All helpdesk channels, SLA policies, and automated workflows are fully synchronized with our cloud platform.',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            createdBy: { name: 'Workspace Admin' }
          }
        ];
        setAnnouncements(defaultAnnouncements);
        localStorage.setItem(announcementsKey, JSON.stringify(defaultAnnouncements));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openCreateModal = () => {
    setSelectedAnnouncement(null);
    setFormData({
      title: '',
      message: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ann) => {
    setSelectedAnnouncement(ann);
    setFormData({
      title: ann.title,
      message: ann.message,
      status: ann.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedAnnouncement) {
        await api.put(`/announcements/${selectedAnnouncement.id}`, formData).catch(() => null);
        const updated = announcements.map(a => a.id === selectedAnnouncement.id ? { ...a, ...formData } : a);
        setAnnouncements(updated);
        try { localStorage.setItem(announcementsKey, JSON.stringify(updated)); } catch(e) {}
      } else {
        const res = await api.post('/announcements', formData).catch(() => null);
        const newItem = res || {
          id: Date.now(),
          ...formData,
          createdAt: new Date().toISOString(),
          createdBy: { name: user?.name || 'Admin' }
        };
        const updated = [newItem, ...announcements];
        setAnnouncements(updated);
        try { localStorage.setItem(announcementsKey, JSON.stringify(updated)); } catch(e) {}
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const promptDelete = (ann) => {
    setDeleteModal({
      isOpen: true,
      id: ann.id,
      title: ann.title,
      isDeleting: false
    });
  };

  const handleConfirmDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/announcements/${id}`).catch(() => null);
      const updated = announcements.filter(a => a.id !== id);
      setAnnouncements(updated);
      try { localStorage.setItem(announcementsKey, JSON.stringify(updated)); } catch(e) {}
    } catch (err) {
      setError('Failed to delete announcement.');
    } finally {
      setDeleteModal({ isOpen: false, id: null, title: '', isDeleting: false });
    }
  };

  const isStaff = user?.role === 'COMPANY_ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6 text-left font-sans select-none pb-12 w-full">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Broadcasting & Notices</h1>
            <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 text-[10px] font-extrabold uppercase tracking-wider rounded-full px-3">
              {announcements.length} Live Bulletins
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Publish announcements, system maintenance warnings, and general bulletins.</p>
        </div>
        {isStaff && (
          <Button
            onClick={openCreateModal}
            className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 gap-2 cursor-pointer active:scale-95 shrink-0 h-10 px-4"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Post Notice</span>
          </Button>
        )}
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
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {announcements.map((ann) => (
            <Card key={ann.id} className="rounded-3xl border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-md transition-all bg-white space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-cyan-50 border border-cyan-100 rounded-2xl text-cyan-700 inline-block shadow-2xs">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className={`rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    ann.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {ann.status}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">{ann.title}</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium whitespace-pre-wrap">{ann.message}</p>
                </div>

                <div className="pt-2 flex items-center space-x-2 text-[11px] font-semibold text-slate-400">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Posted by: <strong className="text-slate-700">{ann.createdBy?.name || 'Admin'}</strong></span>
                  <span>•</span>
                  <span>{new Date(ann.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>

              {isStaff && (
                <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(ann)}
                    className="rounded-xl bg-slate-50 hover:bg-cyan-50 hover:text-cyan-700 px-3 py-1.5 text-xs font-bold text-slate-700 border-slate-200 transition-colors cursor-pointer gap-1 h-8"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => promptDelete(ann)}
                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete Notice"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
          {announcements.length === 0 && (
            <Card className="col-span-full rounded-3xl border-dashed border-slate-200 bg-slate-50/50 p-10 text-center text-xs font-semibold text-slate-400">
              No broadcast announcements or bulletins currently posted. Click "+ Post Notice" to publish one.
            </Card>
          )}
        </div>
      )}

      {/* Announcement Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <Card className="rounded-3xl p-5 sm:p-8 max-w-lg w-full shadow-2xl border-slate-100 space-y-5 sm:space-y-6 relative bg-white my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
              <div className="flex items-center space-x-2.5">
                <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-700 shrink-0" />
                <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                  {selectedAnnouncement ? 'Edit Notice' : 'Post Broadcast Notice'}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notice Title *</Label>
                <Input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Scheduled System Maintenance Notice"
                  className="rounded-2xl border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 h-10"
                />
              </div>

              <div>
                <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Message Content *</Label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Provide exact details of warning, update, or notice..."
                  className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-cyan-500 focus:outline-none"
                ></textarea>
              </div>

              <div>
                <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</Label>
                <CustomSelect
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'INACTIVE', label: 'INACTIVE' }
                  ]}
                  buttonClassName="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-900 bg-white cursor-pointer h-10 shadow-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 cursor-pointer gap-1.5 h-10 px-4"
                >
                  <Save className="h-4 w-4" />
                  <span>{selectedAnnouncement ? 'Save Changes' : 'Broadcast Bulletin'}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODERN UI DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, title: '', isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Announcement"
        message="Are you sure you want to remove this bulletin? It will no longer be visible to your team."
        itemName={deleteModal.title}
        confirmText="Yes, Delete Notice"
        cancelText="Keep Notice"
        isLoading={deleteModal.isDeleting}
        type="danger"
      />

    </div>
  );
};

export default Announcements;
