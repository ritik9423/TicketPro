import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { exportUsersDataset } from '../utils/excelExporter';
import Pagination from '../components/common/Pagination';
import { extractPageData } from '../utils/paginationHelper';
import Modal from '../components/common/Modal';
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
  PlusCircle, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Building2, 
  Search, 
  Filter, 
  Layers, 
  List, 
  User, 
  ShieldCheck, 
  Mail, 
  ChevronDown,
  Building,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  Phone,
  Download,
  FileSpreadsheet
} from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & View Mode
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' (company-wise) | 'table'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: 'IT & Infrastructure',
    role: 'AGENT',
    companyId: '',
    status: 'ACTIVE'
  });

  // Server-side Pagination States (0-indexed default, size 20 default)
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError('');
      
      const [usersData, companiesData] = await Promise.all([
        api.get(`/users?page=${page}&size=${size}`).catch(() => null),
        api.get('/companies').catch(() => [])
      ]);

      const pageData = extractPageData(usersData, page, size);
      const companiesList = Array.isArray(companiesData) ? companiesData : [];

      const enrichedUsers = (pageData.content || []).map(u => {
        const cId = u.company?.id ?? u.companyId;
        const comp = companiesList.find(c => String(c.id) === String(cId));
        return {
          ...u,
          companyId: cId,
          companyName: u.companyName || comp?.companyName || null,
          companyCode: u.companyCode || comp?.companyCode || null,
          company: comp ? {
            id: comp.id,
            companyName: comp.companyName,
            companyCode: comp.companyCode,
            status: comp.status,
            email: comp.email
          } : (u.company || (cId ? { id: cId, companyName: u.companyName || 'Workspace', companyCode: u.companyCode || 'CORP' } : null))
        };
      });

      setUsers(enrichedUsers);
      setTotalElements(pageData.totalElements);
      setTotalPages(pageData.totalPages);
      setCurrentPage(pageData.page);
      setCompanies(companiesList);
    } catch (err) {
      console.error('Super Admin Users fetch error:', err);
      setError(err.message || 'Failed to load users directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage, pageSize);
  }, [currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, selectedCompanyFilter, selectedRoleFilter]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Export Users Dataset (Excel / CSV)
  const handleExportUsers = (format = 'excel') => {
    if (filteredUsers.length === 0) {
      alert('No user records available to export.');
      return;
    }
    exportUsersDataset(filteredUsers, format);
    setSuccessMsg(`✓ Exported ${filteredUsers.length} user records to ${format === 'excel' ? 'Excel (.xlsx)' : 'CSV'} successfully!`);
  };

  const openCreateModal = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      department: 'IT & Infrastructure',
      role: 'AGENT',
      companyId: companies.length > 0 ? String(companies[0].id) : '',
      status: 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    const userCompId = user.company?.id ?? user.companyId;
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      department: user.department || 'IT & Infrastructure',
      role: user.role || 'AGENT',
      companyId: userCompId ? String(userCompId) : '',
      status: user.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      const cleanVal = (v, defaultVal = '') => {
        if (!v) return defaultVal;
        if (typeof v === 'object') {
          return v.target?.value ?? v.value ?? defaultVal;
        }
        return String(v);
      };

      const roleVal = cleanVal(formData.role, 'AGENT');
      const deptVal = cleanVal(formData.department, 'IT & Infrastructure');
      const statusVal = cleanVal(formData.status, 'ACTIVE');
      const rawCompId = cleanVal(formData.companyId, '');
      const parsedCompId = rawCompId && !isNaN(Number(rawCompId)) && Number(rawCompId) > 0 ? Number(rawCompId) : null;

      if (selectedUser) {
        const payload = {
          name: formData.name?.trim?.() || formData.name,
          email: formData.email?.trim?.() || formData.email,
          phone: formData.phone || '',
          department: deptVal,
          role: roleVal,
          status: statusVal
        };
        if (parsedCompId) {
          payload.companyId = parsedCompId;
        }
        if (formData.password && formData.password.trim().length > 0) {
          payload.password = formData.password.trim();
        }

        await api.put(`/users/${selectedUser.id}`, payload);
        setSuccessMsg(`✓ User "${formData.name}" updated successfully!`);
      } else {
        const payload = {
          name: formData.name?.trim?.() || formData.name,
          email: formData.email?.trim?.() || formData.email,
          password: formData.password || 'Temp@123456',
          phone: formData.phone || '',
          department: deptVal,
          role: roleVal,
          status: statusVal,
          companyId: parsedCompId
        };

        await api.post('/users', payload);
        setSuccessMsg(`✓ User "${formData.name}" provisioned successfully!`);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id) => {
    const userToDelete = users.find(u => String(u.id) === String(id));
    if (userToDelete?.role === 'SUPER_ADMIN') {
      setError('Cannot delete Master Super Admin account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${userToDelete?.name || 'User'}"?`)) return;

    try {
      setError('');
      setSuccessMsg('');
      await api.delete(`/users/${id}`);
      setSuccessMsg(`✓ User "${userToDelete?.name || 'User'}" deleted successfully.`);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
    }
  };

  // Filtered Users computation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (u.role === 'SUPER_ADMIN') return false;
      if (u.status && u.status.toUpperCase() !== 'ACTIVE') return false;

      const userCompId = u.company?.id ?? u.companyId;
      const compObj = companies.find(c => String(c.id) === String(userCompId)) || u.company;

      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const compName = (u.companyName || compObj?.companyName || u.company?.companyName || '').toLowerCase();
      const compCode = (u.companyCode || compObj?.companyCode || u.company?.companyCode || '').toLowerCase();
      const role = (u.role || '').toUpperCase();

      const s = searchTerm.toLowerCase();
      const matchesSearch = !s || name.includes(s) || email.includes(s) || phone.includes(s) || compName.includes(s) || compCode.includes(s);
      
      const matchesCompany = selectedCompanyFilter === 'ALL' || 
        (userCompId != null && String(userCompId) === String(selectedCompanyFilter));

      const matchesRole = selectedRoleFilter === 'ALL' || role === selectedRoleFilter;

      return matchesSearch && matchesCompany && matchesRole;
    });
  }, [users, companies, searchTerm, selectedCompanyFilter, selectedRoleFilter]);

  // Grouped by Company Data
  const groupedByCompany = useMemo(() => {
    const groups = {};

    companies.forEach(comp => {
      const compUsers = filteredUsers.filter(u => {
        const userCompId = u.company?.id ?? u.companyId;
        return userCompId != null && String(userCompId) === String(comp.id);
      });

      if (selectedCompanyFilter === 'ALL' || selectedCompanyFilter === String(comp.id)) {
        groups[String(comp.id)] = {
          id: comp.id,
          companyName: comp.companyName,
          companyCode: comp.companyCode,
          email: comp.email,
          status: comp.status,
          users: compUsers
        };
      }
    });

    filteredUsers.forEach(u => {
      const userCompId = u.company?.id ?? u.companyId;
      if (userCompId != null && !groups[String(userCompId)]) {
        const compObj = companies.find(c => String(c.id) === String(userCompId)) || u.company;
        groups[String(userCompId)] = {
          id: userCompId,
          companyName: compObj?.companyName || u.companyName || 'Independent Workspace',
          companyCode: compObj?.companyCode || u.companyCode || 'CORP',
          status: compObj?.status || 'ACTIVE',
          users: [u]
        };
      }
    });

    return Object.values(groups);
  }, [filteredUsers, companies, selectedCompanyFilter]);

  return (
    <div className="space-y-6 text-left font-sans select-none pb-12 w-full">
      
      {/* HEADER BANNER */}
      <Card className="rounded-3xl border-slate-200/80 shadow-sm bg-gradient-to-r from-white via-indigo-50/30 to-slate-50 overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Users & Agents Directory
              </h1>
              <Badge variant="outline" className="bg-cyan-100/80 border-cyan-300/80 text-cyan-900 font-extrabold text-[11px] uppercase tracking-wider rounded-full px-3 py-0.5">
                {filteredUsers.length} Active Staff
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
              Multi-tenant company-wise user directory. Provision new department agents, manage roles, and enforce security policies.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 w-full xs:w-auto justify-center">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`flex-1 xs:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-white text-cyan-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>By Tenant</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex-1 xs:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-cyan-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Full Table</span>
              </button>
            </div>

            <Button
              onClick={() => handleExportUsers('excel')}
              className="flex-1 sm:flex-initial rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 sm:h-10 px-3.5 gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Download Users in Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel</span>
            </Button>

            <Button
              onClick={() => handleExportUsers('csv')}
              className="flex-1 sm:flex-initial rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-black text-xs h-9 sm:h-10 px-3.5 gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Download Users in CSV"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </Button>

            <Button
              onClick={openCreateModal}
              className="w-full sm:w-auto rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs h-9 sm:h-10 px-4 gap-1.5 shadow-md cursor-pointer active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Add User</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* NOTIFICATIONS */}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-50 p-3 sm:p-4 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 font-black cursor-pointer px-2">✕</button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 p-3 sm:p-4 text-xs font-bold text-rose-700 border border-rose-200 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-900 font-black cursor-pointer px-2">✕</button>
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-white p-3.5 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search user name, email, phone, tenant code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-2xl text-xs font-medium"
            />
          </div>

          <div>
            <CustomSelect
              value={selectedCompanyFilter}
              onChange={(val) => setSelectedCompanyFilter(val)}
              options={[
                { value: 'ALL', label: 'All Tenant Companies' },
                ...companies.map((c) => ({
                  value: String(c.id),
                  label: `${c.companyName} (${c.companyCode || 'CORP'})`
                }))
              ]}
              buttonClassName="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-2xl bg-white text-slate-800 shadow-none"
            />
          </div>

          <div>
            <CustomSelect
              value={selectedRoleFilter}
              onChange={(val) => setSelectedRoleFilter(val)}
              options={[
                { value: 'ALL', label: 'All Roles' },
                { value: 'COMPANY_ADMIN', label: 'Company Admin' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'AGENT', label: 'Support Agent' },
                { value: 'USER', label: 'Standard User' }
              ]}
              buttonClassName="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-2xl bg-white text-slate-800 shadow-none"
            />
          </div>
        </div>
      </Card>

      {/* USERS RENDER */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : viewMode === 'grouped' ? (
        /* 1. GROUPED BY COMPANY VIEW */
        <div className="space-y-6">
          {groupedByCompany.map((group) => (
            <Card key={group.id} className="rounded-3xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
              <div className="bg-slate-50/80 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-2xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                    {(group.companyCode || group.companyName || 'CO').slice(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{group.companyName}</h3>
                    <span className="text-[10px] font-bold text-slate-400">Code: {group.companyCode || 'CORP'} • {group.email || 'Workspace'}</span>
                  </div>
                </div>

                <Badge variant="outline" className="bg-cyan-50 text-cyan-800 border-cyan-200 font-extrabold text-[11px] rounded-full px-3 py-0.5">
                  {group.users.length} Active {group.users.length === 1 ? 'User' : 'Users'}
                </Badge>
              </div>

              {group.users.length === 0 ? (
                <div className="py-8 text-center text-xs font-medium text-slate-400">
                  No staff users currently provisioned under {group.companyName}.
                </div>
              ) : (
                <div>
                  {/* Mobile Grouped Cards View */}
                  <div className="block md:hidden divide-y divide-slate-100">
                    {group.users.map((u) => (
                      <div key={u.id} className="p-4 space-y-2 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{u.name}</span>
                          <Badge variant="outline" className="rounded-full text-[10px] font-extrabold uppercase bg-cyan-50 text-cyan-800 border-cyan-200 shrink-0">
                            {u.role}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-600 space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-slate-500 font-semibold">{u.department || 'IT & Infrastructure'}</span>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(u)}
                              className="h-7.5 w-7.5 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-lg"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(u.id)}
                              className="h-7.5 w-7.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Grouped Table */}
                  <div className="hidden md:block overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-100 bg-slate-50/40">
                          <TableHead className="py-3 px-5 font-black text-[10px] uppercase text-slate-400">Name</TableHead>
                          <TableHead className="py-3 px-5 font-black text-[10px] uppercase text-slate-400">Email & Contact</TableHead>
                          <TableHead className="py-3 px-5 font-black text-[10px] uppercase text-slate-400">Role</TableHead>
                          <TableHead className="py-3 px-5 font-black text-[10px] uppercase text-slate-400">Department</TableHead>
                          <TableHead className="py-3 px-5 font-black text-[10px] uppercase text-slate-400 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {group.users.map((u) => (
                          <TableRow key={u.id} className="hover:bg-cyan-50/20 transition-colors">
                            <TableCell className="py-3.5 px-5 font-extrabold text-slate-900 text-xs">
                              {u.name}
                            </TableCell>
                            <TableCell className="py-3.5 px-5 text-slate-600 text-xs font-semibold">
                              <div>{u.email}</div>
                              {u.phone && <div className="text-[10px] text-slate-400 font-medium">{u.phone}</div>}
                            </TableCell>
                            <TableCell className="py-3.5 px-5">
                              <Badge variant="outline" className="rounded-full text-[10px] font-extrabold uppercase bg-cyan-50 text-cyan-800 border-cyan-200">
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3.5 px-5 text-slate-600 text-xs font-bold">
                              {u.department || 'IT & Infrastructure'}
                            </TableCell>
                            <TableCell className="py-3.5 px-5 text-right space-x-1 whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(u)}
                                className="h-8 w-8 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-xl"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(u.id)}
                                className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        /* 2. FULL TABLE VIEW */
        <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
          {/* Mobile Full List Cards */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-2 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">{u.name}</span>
                  <Badge variant="outline" className="rounded-full text-[10px] font-extrabold uppercase bg-cyan-50 text-cyan-800 border-cyan-200 shrink-0">
                    {u.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 font-bold text-[10px]">
                    {u.company?.companyName || u.companyName || 'Global'}
                  </Badge>
                  <span className="text-xs text-slate-500 font-medium truncate">{u.department || 'IT & Infrastructure'}</span>
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  {u.phone && (
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                      <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{u.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end pt-1 space-x-1 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(u)}
                    className="h-7.5 w-7.5 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(u.id)}
                    className="h-7.5 w-7.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Full Table */}
          <div className="hidden md:block overflow-x-auto w-full">
            <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100">
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">User</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Company Tenant</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Email & Phone</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Role</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400">Department</TableHead>
                <TableHead className="py-3.5 px-5 font-black text-[10px] uppercase text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <TableRow key={u.id} className="hover:bg-cyan-50/20 transition-colors">
                  <TableCell className="py-3.5 px-5 font-extrabold text-slate-900 text-xs">
                    {u.name}
                  </TableCell>
                  <TableCell className="py-3.5 px-5">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {u.company?.companyName || u.companyName || 'Global'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 px-5 text-slate-600 text-xs font-semibold">
                    <div>{u.email}</div>
                    {u.phone && <div className="text-[10px] text-slate-400 font-medium">{u.phone}</div>}
                  </TableCell>
                  <TableCell className="py-3.5 px-5">
                    <Badge variant="outline" className="rounded-full text-[10px] font-extrabold uppercase bg-cyan-50 text-cyan-800 border-cyan-200">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 px-5 text-slate-600 text-xs font-bold">
                    {u.department || 'IT & Infrastructure'}
                  </TableCell>
                  <TableCell className="py-3.5 px-5 text-right space-x-1 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(u)}
                      className="h-8 w-8 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-xl"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(u.id)}
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}

      {/* SERVER-SIDE PAGINATION CONTROLS */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={totalElements || users.length}
        pageSize={pageSize}
        onPageChange={(p) => {
          setCurrentPage(p);
          fetchData(p, pageSize);
        }}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(0);
          fetchData(0, s);
        }}
      />

      {/* CREATE / EDIT USER MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser ? `Edit User: ${selectedUser.name}` : 'Provision New Tenant Staff User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Full Name *</Label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-2xl"
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Email (Username) *</Label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="rounded-2xl"
              placeholder="john@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              {selectedUser ? 'New Password (leave blank to keep current)' : 'Initial Password *'}
            </Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="rounded-2xl"
              placeholder="••••••••"
              required={!selectedUser}
              autoComplete={selectedUser ? "new-password" : "current-password"}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Assign Company Workspace *</Label>
            <CustomSelect
              value={formData.companyId}
              onChange={(val) => setFormData({ ...formData, companyId: val })}
              placeholder="-- Select Company --"
              required
              options={companies.map((c) => ({
                value: String(c.id),
                label: `${c.companyName} (${c.companyCode || 'CORP'})`
              }))}
              buttonClassName="block w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white cursor-pointer shadow-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Role</Label>
              <CustomSelect
                value={formData.role}
                onChange={(val) => setFormData({ ...formData, role: val })}
                options={[
                  { value: 'AGENT', label: 'AGENT' },
                  { value: 'MANAGER', label: 'MANAGER' },
                  { value: 'COMPANY_ADMIN', label: 'COMPANY_ADMIN' },
                  { value: 'USER', label: 'USER' }
                ]}
                buttonClassName="block w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white cursor-pointer shadow-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Department</Label>
              <CustomSelect
                value={formData.department}
                onChange={(val) => setFormData({ ...formData, department: val })}
                options={[
                  { value: 'IT & Infrastructure', label: 'IT & Infrastructure' },
                  { value: 'Human Resources (HR)', label: 'Human Resources (HR)' },
                  { value: 'Finance & Accounting', label: 'Finance & Accounting' },
                  { value: 'Sales & Marketing', label: 'Sales & Marketing' },
                  { value: 'Customer Support', label: 'Customer Support' }
                ]}
                buttonClassName="block w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-white cursor-pointer shadow-none"
              />
            </div>
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
              {selectedUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Users;
