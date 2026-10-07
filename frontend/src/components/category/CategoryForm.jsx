import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Sliders, 
  FolderPlus, 
  Sparkles, 
  Check, 
  Folder, 
  ArrowRight,
  Search,
  List,
  LayoutGrid,
  Layers,
  CheckCircle2,
  Building
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const resolveSmartDepartment = (catName = '', availableDepartments = []) => {
  const name = (catName || '').toLowerCase().trim();

  // 1. IT, Infrastructure, Tech, Hardware, Device, Systems, Identity, User
  if (
    name.includes('user') ||
    name.includes('infra') ||
    name.includes('it') ||
    name.includes('tech') ||
    name.includes('hardware') ||
    name.includes('device') ||
    name.includes('system') ||
    name.includes('software') ||
    name.includes('network') ||
    name.includes('access') ||
    name.includes('login') ||
    name.includes('password') ||
    name.includes('portal') ||
    name.includes('vpn') ||
    name.includes('server') ||
    name.includes('bug')
  ) {
    if (availableDepartments && availableDepartments.length > 0) {
      const match = availableDepartments.find(d => {
        const dLower = (d.name || '').toLowerCase();
        return dLower.includes('it') || dLower.includes('infra') || dLower.includes('tech');
      });
      if (match) return match.name;
    }
    return 'IT & Infrastructure';
  }

  // 2. Fleet, Vehicle, Route, Tracking, Geofence, Supply Chain, Terminal, Logistics, Plant, Distributor, Toll
  if (
    name.includes('vehicle') ||
    name.includes('fleet') ||
    name.includes('route') ||
    name.includes('track') ||
    name.includes('geofence') ||
    name.includes('tanker') ||
    name.includes('distributor') ||
    name.includes('plant') ||
    name.includes('toll') ||
    name.includes('logistics') ||
    name.includes('transport') ||
    name.includes('supply') ||
    name.includes('terminal') ||
    name.includes('dispatch') ||
    name.includes('driver') ||
    name.includes('ops')
  ) {
    if (availableDepartments && availableDepartments.length > 0) {
      const match = availableDepartments.find(d => {
        const dLower = (d.name || '').toLowerCase();
        return dLower.includes('operation') || dLower.includes('logistics') || dLower.includes('fleet');
      });
      if (match) return match.name;
    }
    return 'Operations & Logistics';
  }

  // 3. Finance, Billing, Accounts, Loan, Payment, Invoices, Card
  if (
    name.includes('billing') ||
    name.includes('invoice') ||
    name.includes('payment') ||
    name.includes('finance') ||
    name.includes('card') ||
    name.includes('tax') ||
    name.includes('reimburse') ||
    name.includes('loan')
  ) {
    if (availableDepartments && availableDepartments.length > 0) {
      const match = availableDepartments.find(d => {
        const dLower = (d.name || '').toLowerCase();
        return dLower.includes('finance') || dLower.includes('billing');
      });
      if (match) return match.name;
    }
    return 'Finance & Accounting';
  }

  // 4. Human Resources, KYC, Onboarding, Payroll, Leave, Employee
  if (
    name.includes('kyc') ||
    name.includes('onboard') ||
    name.includes('hr') ||
    name.includes('payroll') ||
    name.includes('leave') ||
    name.includes('holiday') ||
    name.includes('salary') ||
    name.includes('employee') ||
    name.includes('attendance')
  ) {
    if (availableDepartments && availableDepartments.length > 0) {
      const match = availableDepartments.find(d => {
        const dLower = (d.name || '').toLowerCase();
        return dLower.includes('hr') || dLower.includes('human');
      });
      if (match) return match.name;
    }
    return 'Human Resources (HR)';
  }

  // 5. Sales & Marketing
  if (name.includes('sales') || name.includes('marketing') || name.includes('lead')) {
    if (availableDepartments && availableDepartments.length > 0) {
      const match = availableDepartments.find(d => {
        const dLower = (d.name || '').toLowerCase();
        return dLower.includes('sales') || dLower.includes('marketing');
      });
      if (match) return match.name;
    }
    return 'Sales & Marketing';
  }

  // 6. Default Customer Support
  if (availableDepartments && availableDepartments.length > 0) {
    const match = availableDepartments.find(d => {
      const dLower = (d.name || '').toLowerCase();
      return dLower.includes('support') || dLower.includes('customer');
    });
    if (match) return match.name;
  }
  return 'Customer Support';
};

const CategoryForm = ({
  mode = 'toolbar', // 'toolbar' | 'standalone'
  categories,
  selectedCategory,
  onCategorySwitch,
  formTitle,
  setFormTitle,
  isEditingTitle,
  setIsEditingTitle,
  onRenameCategory,
  isCreateFormModalOpen,
  setIsCreateFormModalOpen,
  newFormName,
  setNewFormName,
  onCreateCategory,
  isRenameModalOpen,
  setIsRenameModalOpen,
  renameCatInput,
  setRenameCatInput,
  onSaveRename,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  deleteCatTarget,
  onConfirmDelete,
  onPromptDeleteCategory,
  onUpdateTargetDepartment,
  onAutoMapAllCategories
}) => {
  const { user } = useAuth();
  const tenantCode = (user?.companyCode || user?.tenantId || 'WORKSPACE').toUpperCase();
  const deptStorageKey = `ticketpro_departments_${tenantCode}`;

  const [searchQuery, setSearchQuery] = useState('');
  const [viewFormat, setViewFormat] = useState('list'); // 'list' | 'grid'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DRAFT'
  const [availableDepartments, setAvailableDepartments] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(deptStorageKey);
      let list = [];
      if (stored) {
        try { list = JSON.parse(stored); } catch(e) {}
      }
      if (!list || list.length === 0) {
        list = [
          { id: 1, name: 'IT & Infrastructure' },
          { id: 2, name: 'Human Resources (HR)' },
          { id: 3, name: 'Finance & Accounting' },
          { id: 4, name: 'Sales & Marketing' },
          { id: 5, name: 'Operations & Logistics' },
          { id: 6, name: 'Customer Support' }
        ];
      }
      setAvailableDepartments(list);
    } catch(e) {}
  }, [deptStorageKey]);

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (cat.status || 'ACTIVE').toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getCategoryDepartment = (cat) => {
    if (cat?.targetDepartment) {
      return cat.targetDepartment;
    }
    return resolveSmartDepartment(cat?.name, availableDepartments);
  };

  const handleAutoMapAll = () => {
    const mapped = categories.map(c => ({
      ...c,
      targetDepartment: resolveSmartDepartment(c.name, availableDepartments)
    }));
    if (onAutoMapAllCategories) {
      onAutoMapAllCategories(mapped);
    } else if (onUpdateTargetDepartment) {
      mapped.forEach(c => onUpdateTargetDepartment(c, c.targetDepartment));
    }
  };

  // Automatically ensure all categories have real, smart target departments mapped on initial load
  const hasAutoMappedInitialRef = useRef(false);
  useEffect(() => {
    if (!categories || categories.length === 0 || hasAutoMappedInitialRef.current) return;
    const hasUnmapped = categories.some(c => !c.targetDepartment);
    if (hasUnmapped) {
      hasAutoMappedInitialRef.current = true;
      const updated = categories.map(c => {
        if (!c.targetDepartment) {
          return {
            ...c,
            targetDepartment: resolveSmartDepartment(c.name, availableDepartments)
          };
        }
        return c;
      });
      const hasRealChange = updated.some((c, idx) => c.targetDepartment !== categories[idx]?.targetDepartment);
      if (hasRealChange) {
        if (onAutoMapAllCategories) {
          onAutoMapAllCategories(updated);
        } else if (onUpdateTargetDepartment) {
          updated.forEach(c => {
            const oldCat = categories.find(o => o.id === c.id || o.name === c.name);
            if (!oldCat || oldCat.targetDepartment !== c.targetDepartment) {
              onUpdateTargetDepartment(c, c.targetDepartment);
            }
          });
        }
      }
    }
  }, [categories, availableDepartments]);

  const handleTriggerDelete = (cat) => {
    if (onPromptDeleteCategory) {
      onPromptDeleteCategory(cat);
    } else {
      setIsDeleteModalOpen(true);
    }
  };

  // Standalone Category Management View
  if (mode === 'standalone') {
    return (
      <div className="space-y-6 text-left">
        
        {/* SECTION HEADER & STATS BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-2xl bg-cyan-50 flex items-center justify-center shrink-0">
                <Folder className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Category Directory & Auto-Routing Master</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Manage all {categories.length} ticket categories & assign target departments for automated ticket routing.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={handleAutoMapAll}
              className="px-3.5 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs font-black transition-all shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="Automatically map all categories to their real specialist departments"
            >
              <Sparkles className="h-4 w-4" />
              <span>⚡ Auto-Map All</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateFormModalOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 gap-2 cursor-pointer active:scale-95 shrink-0 h-10 px-4 inline-flex items-center transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add New Category</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:outline-none bg-slate-50/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
            )}
          </div>

          {/* Filters & View Switcher */}
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all ${
                  statusFilter === 'ALL' ? 'bg-white text-cyan-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all ${
                  statusFilter === 'ACTIVE' ? 'bg-white text-emerald-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Active
              </button>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewFormat('list')}
                className={`p-1.5 rounded-xl transition-all ${
                  viewFormat === 'list' ? 'bg-white text-cyan-700 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Straight Line List View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewFormat('grid')}
                className={`p-1.5 rounded-xl transition-all ${
                  viewFormat === 'grid' ? 'bg-white text-cyan-700 shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* LINEAR DATA TABLE VIEW */}
        {viewFormat === 'list' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Mobile Card List View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredCategories.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium px-4">
                  <p className="text-sm font-bold text-slate-600">No categories found</p>
                  <p className="text-xs text-slate-400 mt-1">Click "+ Add New Category" above to create your first category form.</p>
                </div>
              ) : (
                filteredCategories.map((cat, index) => {
                  const isCatSelected = selectedCategory?.id === cat.id || selectedCategory?.name === cat.name;
                  const targetDept = getCategoryDepartment(cat);

                  return (
                    <div
                      key={cat.id || cat.name}
                      className={`p-4 space-y-3 transition-colors ${
                        isCatSelected ? 'bg-cyan-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Top row: Name & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isCatSelected ? 'bg-cyan-600 animate-pulse' : 'bg-emerald-500'}`}></span>
                          <div className="min-w-0">
                            <span className={`text-xs font-extrabold truncate block ${isCatSelected ? 'text-cyan-800' : 'text-slate-900'}`}>
                              #{index + 1} {cat.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-bold inline-flex items-center space-x-1">
                            <Layers className="h-3 w-3 text-cyan-600" />
                            <span>{cat.fieldCount || 4} fields</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                            {cat.status || 'Active'}
                          </span>
                        </div>
                      </div>

                      {/* Department routing selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Auto-Routing Department:
                        </label>
                        <div className="flex items-center space-x-1.5">
                          <Building className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                          <select
                            value={targetDept}
                            onChange={(e) => {
                              if (onUpdateTargetDepartment) {
                                onUpdateTargetDepartment(cat, e.target.value);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-cyan-200 bg-cyan-50/80 text-xs font-extrabold text-cyan-800 focus:outline-none cursor-pointer"
                          >
                            {availableDepartments.map((d) => (
                              <option key={d.id || d.name} value={d.name}>
                                🏢 {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onCategorySwitch(cat)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-[11px] font-black transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
                        >
                          <span>Open Builder</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              onCategorySwitch(cat);
                              setRenameCatInput(cat.name);
                              setIsRenameModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 cursor-pointer transition-colors"
                            title="Rename Category"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTriggerDelete(cat)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-6">Category Name</th>
                    <th className="py-3.5 px-6">Target Auto-Routing Department</th>
                    <th className="py-3.5 px-4 text-center">Schema Fields</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                        <p className="text-sm font-bold text-slate-600">No categories found</p>
                        <p className="text-xs text-slate-400 mt-1">Click "+ Add New Category" above to create your first category form.</p>
                      </td>
                    </tr>
                  ) : filteredCategories.map((cat, index) => {
                    const isCatSelected = selectedCategory?.id === cat.id || selectedCategory?.name === cat.name;
                    const targetDept = getCategoryDepartment(cat);

                    return (
                      <tr
                        key={cat.id || cat.name}
                        className={`transition-colors hover:bg-cyan-50/40 group ${
                          isCatSelected ? 'bg-cyan-50/60 font-black' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                          #{index + 1}
                        </td>

                        <td className="py-3.5 px-6">
                          <div className="flex items-center space-x-3">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isCatSelected ? 'bg-cyan-600 animate-pulse' : 'bg-emerald-500'}`}></span>
                            <div>
                              <span className={`text-xs font-extrabold block ${isCatSelected ? 'text-cyan-800' : 'text-slate-900'}`}>
                                {cat.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* TARGET DEPARTMENT AUTO-ROUTING SELECTOR */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center space-x-1.5">
                            <Building className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                            <select
                              value={targetDept}
                              onChange={(e) => {
                                if (onUpdateTargetDepartment) {
                                  onUpdateTargetDepartment(cat, e.target.value);
                                }
                              }}
                              className="px-2.5 py-1 rounded-xl border border-cyan-200 bg-cyan-50/80 text-xs font-extrabold text-cyan-800 focus:outline-none cursor-pointer"
                            >
                              {availableDepartments.map((d) => (
                                <option key={d.id || d.name} value={d.name}>
                                  🏢 {d.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold inline-flex items-center space-x-1">
                            <Layers className="h-3 w-3 text-cyan-600" />
                            <span>{cat.fieldCount || 4} fields</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider inline-flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>{cat.status || 'Active'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => onCategorySwitch(cat)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-[11px] font-black transition-all flex items-center space-x-1 cursor-pointer shadow-xs active:scale-95"
                            >
                              <span>Open Builder</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onCategorySwitch(cat);
                                setRenameCatInput(cat.name);
                                setIsRenameModalOpen(true);
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 cursor-pointer transition-colors"
                              title="Rename Category"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTriggerDelete(cat)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GRID CARDS VIEW */}
        {viewFormat === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => {
              const isCatSelected = selectedCategory?.id === cat.id || selectedCategory?.name === cat.name;
              const targetDept = getCategoryDepartment(cat);

              return (
                <div
                  key={cat.id || cat.name}
                  className={`p-5 rounded-3xl border transition-all text-left space-y-4 relative ${
                    isCatSelected
                      ? 'border-cyan-500 bg-cyan-50/70 shadow-md ring-2 ring-cyan-500/20'
                      : 'border-slate-200 bg-white hover:border-cyan-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`h-3 w-3 rounded-full ${isCatSelected ? 'bg-cyan-600 animate-pulse' : 'bg-emerald-500'}`}></span>
                      <h3 className="text-sm font-black text-slate-900 truncate">{cat.name}</h3>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      {cat.status || 'Active'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-cyan-50/50 border border-cyan-100/80 space-y-1">
                    <span className="text-[10px] font-black text-cyan-700 uppercase tracking-wider block">Auto-Routing Department:</span>
                    <span className="text-xs font-black text-cyan-900 block">🏢 {targetDept}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onCategorySwitch(cat)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <span>Open Builder</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerDelete(cat)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {renderModals()}
      </div>
    );
  }

  function renderModals() {
    return (
      <>
        {/* CREATE NEW CATEGORY MODAL */}
        {isCreateFormModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl text-left border border-slate-100 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <FolderPlus className="h-5 w-5 text-cyan-600" />
                  <h3 className="text-base font-black text-slate-900">Create New Category Form</h3>
                </div>
                <button type="button" onClick={() => setIsCreateFormModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={onCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category Form Name *</label>
                  <input
                    type="text"
                    required
                    value={newFormName}
                    onChange={(e) => setNewFormName(e.target.value)}
                    placeholder="e.g. Asset Repair Intake Form"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-bold focus:border-cyan-500 focus:outline-none shadow-2xs"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setIsCreateFormModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button type="submit" className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 cursor-pointer gap-1.5 h-9 sm:h-10 px-5 transition-all">Create Category</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RENAME CATEGORY MODAL */}
        {isRenameModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl text-left border border-slate-100 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Edit2 className="h-5 w-5 text-cyan-600" />
                  <h3 className="text-base font-extrabold text-slate-900">Rename Category</h3>
                </div>
                <button type="button" onClick={() => setIsRenameModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={onSaveRename} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Category Name *</label>
                  <input
                    type="text"
                    required
                    value={renameCatInput}
                    onChange={(e) => setRenameCatInput(e.target.value)}
                    placeholder="e.g. KYC Verification & Onboarding"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-bold focus:border-cyan-500 focus:outline-none shadow-2xs"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRenameModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 cursor-pointer gap-1.5 h-9 sm:h-10 px-5 transition-all"
                  >
                    Update Category Name
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  // Toolbar Mode
  return (
    <div className="space-y-3 text-left">
      {/* COMPACT CATEGORY HEADER TOOLBAR CARD */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:border-cyan-200 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Left Sequence: Category Selector & Title & Target Department */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-cyan-50/80 border border-cyan-100/80 px-3.5 py-1.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">CATEGORY:</span>
              <select
                value={selectedCategory?.id || ''}
                onChange={(e) => {
                  const cat = categories.find(c => String(c.id) === String(e.target.value));
                  if (cat) onCategorySwitch(cat);
                }}
                className="bg-transparent text-xs font-black text-cyan-800 focus:outline-none cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl shadow-2xs">
              <Building className="h-3.5 w-3.5 text-cyan-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TARGET DEPT:</span>
              <select
                value={getCategoryDepartment(selectedCategory)}
                onChange={(e) => {
                  if (selectedCategory && onUpdateTargetDepartment) {
                    onUpdateTargetDepartment(selectedCategory, e.target.value);
                  }
                }}
                className="bg-transparent text-xs font-black text-cyan-800 focus:outline-none cursor-pointer"
              >
                {availableDepartments.map(d => (
                  <option key={d.id || d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Sequence: Actions (+ Add Category, Rename, Delete) */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsCreateFormModalOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 cursor-pointer active:scale-95 h-9 px-4 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Category</span>
            </button>

            {!isEditingTitle && (
              <button
                type="button"
                onClick={() => {
                  setRenameCatInput(selectedCategory?.name || formTitle);
                  setIsRenameModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Edit2 className="h-3.5 w-3.5 text-cyan-600" />
                <span>Rename</span>
              </button>
            )}

            {selectedCategory && !isEditingTitle && (
              <button
                type="button"
                onClick={() => handleTriggerDelete(selectedCategory)}
                className="px-3.5 py-2 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {renderModals()}
    </div>
  );
};

export default CategoryForm;
