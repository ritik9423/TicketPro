import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Pagination from '../components/common/Pagination';
import { extractPageData } from '../utils/paginationHelper';
import Badge from '../components/common/Badge';
import CustomSelect from '@/components/ui/CustomSelect';
import { Edit2, Trash2, Plus, UserCheck, Shield, Check, X, User, Eye, EyeOff, Building } from 'lucide-react';

const Agents = () => {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: 'IT & Infrastructure',
    role: 'AGENT',
    status: 'ACTIVE',
  });

  const fetchDepartments = useCallback(async () => {
    try {
      const data = await api.get('/departments').catch(() => null);
      if (Array.isArray(data) && data.length > 0) {
        setDepartments(data.map(d => ({ id: d.id, name: d.name })));
      } else {
        setDepartments([
          { id: 1, name: 'IT & Infrastructure' },
          { id: 2, name: 'Human Resources (HR)' },
          { id: 3, name: 'Finance & Accounting' },
          { id: 4, name: 'Operations & Logistics' },
          { id: 5, name: 'Customer Support' }
        ]);
      }
    } catch (e) {}
  }, []);

  // Server-side Pagination States (0-indexed default, size 20 default)
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError('');
      await fetchDepartments();

      const data = await api.get(`/users?page=${page}&size=${size}`);
      const pageData = extractPageData(data, page, size);
      setUsers(pageData.content);
      setTotalElements(pageData.totalElements);
      setTotalPages(pageData.totalPages);
      setCurrentPage(pageData.page);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [fetchDepartments, currentPage, pageSize]);

  useEffect(() => {
    fetchUsers(currentPage, pageSize);
  }, [fetchUsers, currentPage, pageSize]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const openCreateModal = () => {
    setSelectedUser(null);
    const defaultDept = departments.length > 0 ? departments[0].name : 'IT & Infrastructure';
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      department: defaultDept,
      role: 'AGENT',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setSelectedUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      phone: u.phone || '',
      department: u.department || (departments.length > 0 ? departments[0].name : 'IT & Infrastructure'),
      role: u.role,
      status: u.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      if (selectedUser) {
        const updatePayload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          role: formData.role,
          status: formData.status
        };
        if (formData.password && formData.password.trim()) {
          updatePayload.password = formData.password.trim();
        }
        await api.put(`/users/${selectedUser.id}`, updatePayload);
        setSuccessMsg(`✓ User "${formData.name}" updated successfully!`);
        await fetchUsers();
      } else {
        const payload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          department: formData.department,
          role: formData.role,
          status: formData.status
        };
        await api.post('/users', payload);
        setSuccessMsg(`✓ User "${formData.name}" created successfully! Role: "${formData.role}".`);
        await fetchUsers();
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id) => {
    const userToDelete = users.find(u => String(u.id) === String(id));
    if (!window.confirm(`Are you sure you want to delete user "${userToDelete?.name || 'User'}"?`)) return;
    try {
      setError('');
      await api.delete(`/users/${id}`);
      setSuccessMsg(`✓ User "${userToDelete?.name || 'User'}" deleted successfully.`);
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans select-none">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Staff & Agents Directory</h1>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Manage system users, support agents, and department assignments for {user?.companyName || 'IOCL Limited'}.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 gap-2 cursor-pointer active:scale-95 shrink-0 h-10 px-4 inline-flex items-center justify-center transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add User / Staff</span>
        </button>
      </div>

      {successMsg && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700 border border-emerald-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 text-emerald-500 hover:text-emerald-800 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-600 border border-rose-100 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="p-1 text-rose-400 hover:text-rose-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Users Responsive Views */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {users.length === 0 ? (
          <div className="p-8 text-center text-xs font-semibold text-slate-400">
            No users or agents found. Click "+ Add User / Staff" above to create one.
          </div>
        ) : (
          <>
            {/* Mobile Card List (visible below md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {users.map((u) => (
                <div key={`mobile-${u.id}`} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white font-black text-xs shadow-xs shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-gray-900 text-xs truncate">{u.name}</p>
                        <p className="text-[11px] font-medium text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 text-gray-400 hover:text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors cursor-pointer"
                        title="Edit User"
                        aria-label="Edit User"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete User"
                        aria-label="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {/* Department Badge */}
                    {u.role === 'COMPANY_ADMIN' || u.role === 'SUPER_ADMIN' ? (
                      <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 text-[10px] font-extrabold inline-flex items-center space-x-1 border border-purple-200">
                        <Building className="h-3 w-3 text-purple-600" />
                        <span>All Depts</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-cyan-50 text-cyan-800 text-[10px] font-extrabold inline-flex items-center space-x-1 border border-cyan-200">
                        <Building className="h-3 w-3 text-cyan-600" />
                        <span>{u.department || 'IT & Infrastructure'}</span>
                      </span>
                    )}

                    {/* Role Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                      u.role === 'COMPANY_ADMIN'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : u.role === 'AGENT'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {u.role.replace('_', ' ')}
                    </span>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                      u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {u.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Linear Table (visible md and above) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <th className="py-4 px-6">User / Agent Name</th>
                    <th className="py-4 px-6">Department</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-cyan-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white font-black text-xs shadow-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-gray-900">{u.name}</p>
                            <p className="text-[11px] font-medium text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Department Badge */}
                      <td className="py-4 px-6">
                        {u.role === 'COMPANY_ADMIN' || u.role === 'SUPER_ADMIN' ? (
                          <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 text-[11px] font-extrabold inline-flex items-center space-x-1.5 border border-purple-200">
                            <Building className="h-3 w-3 text-purple-600" />
                            <span>🌐 All Departments (N/A)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-cyan-50 text-cyan-800 text-[11px] font-extrabold inline-flex items-center space-x-1.5 border border-cyan-200">
                            <Building className="h-3 w-3 text-cyan-600" />
                            <span>{u.department || 'IT & Infrastructure'}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          u.role === 'COMPANY_ADMIN'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : u.role === 'AGENT'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-gray-400 hover:text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors mr-1 cursor-pointer"
                          title="Edit User"
                          aria-label="Edit User"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete User"
                          aria-label="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Server-side Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={totalElements || users.length}
              pageSize={pageSize}
              onPageChange={(p) => {
                setCurrentPage(p);
                fetchUsers(p, pageSize);
              }}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(0);
                fetchUsers(0, s);
              }}
            />
          </>
        )}
      </div>

      {/* Responsive Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col text-left overflow-hidden my-auto animate-in zoom-in-95 duration-150"
            style={{ maxHeight: 'min(88vh, 620px)' }}
          >
            {/* Modal Header - Fixed */}
            <div className="shrink-0 px-5 py-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <UserCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    {selectedUser ? 'Edit User / Staff' : 'Create New User / Agent'}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {selectedUser ? 'Update account credentials, department, and role' : 'Fill details below to add a new team member'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95 cursor-pointer"
                title="Close Form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Body - Scrollable */}
            <form id="agent-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-3.5">
              {/* 2-Column Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aditi Kapoor"
                    className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. aditi@company.com"
                    className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password & Phone in 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {selectedUser ? 'New Password (Optional)' : 'Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!selectedUser}
                      autoComplete={selectedUser ? "new-password" : "current-password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full h-10 pl-3.5 pr-10 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Department & Role in 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assigned Department</label>
                  {formData.role === 'COMPANY_ADMIN' || formData.role === 'SUPER_ADMIN' ? (
                    <input
                      type="text"
                      disabled
                      value="🌐 All Departments"
                      className="w-full h-10 px-3.5 rounded-2xl border border-purple-200 text-xs font-black text-purple-800 bg-purple-50 focus:outline-none"
                    />
                  ) : (
                    <CustomSelect
                      value={formData.department}
                      onChange={(val) => setFormData({ ...formData, department: val })}
                      options={departments.map((dept) => ({
                        value: dept.name,
                        label: `🏢 ${dept.name}`
                      }))}
                      buttonClassName="w-full h-10 px-3.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white shadow-none text-slate-800"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Role *</label>
                  <CustomSelect
                    value={formData.role}
                    onChange={(val) => setFormData({ ...formData, role: val })}
                    options={[
                      { value: 'COMPANY_ADMIN', label: 'Company Admin' },
                      { value: 'AGENT', label: 'Support Agent' },
                      { value: 'USER', label: 'Customer / End User' }
                    ]}
                    buttonClassName="w-full h-10 px-3.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white shadow-none text-slate-800"
                  />
                </div>
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Status *</label>
                <CustomSelect
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'INACTIVE', label: 'INACTIVE' },
                    { value: 'BLOCKED', label: 'BLOCKED' }
                  ]}
                  buttonClassName="w-full h-10 px-3.5 rounded-2xl border border-slate-200 text-xs font-bold bg-white shadow-none text-slate-800"
                />
              </div>
            </form>

            {/* Modal Footer - Fixed */}
            <div className="shrink-0 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer h-9 sm:h-10 px-4 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="agent-form"
                className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 cursor-pointer gap-1.5 h-9 sm:h-10 px-5 transition-all inline-flex items-center justify-center"
              >
                <UserCheck className="h-4 w-4" />
                <span>{selectedUser ? 'Update User' : 'Save User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Agents;
