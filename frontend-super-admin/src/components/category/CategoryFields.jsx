import React from 'react';
import { 
  Plus,
  Building2, 
  AlignLeft, 
  ListFilter, 
  CheckSquare, 
  Radio, 
  Calendar, 
  Paperclip, 
  Layers, 
  FileText, 
  User,
  Folder,
  Puzzle,
  GitBranch,
  Sliders,
  Trash2
} from 'lucide-react';

const CategoryFields = ({
  companies = [],
  selectedCompany = null,
  onSelectCompany = null,
  categories,
  selectedCategory,
  onCategorySwitch,
  customFields,
  onAddFieldFromPalette,
  setIsCreateFormModalOpen,
  onPromptDeleteCategory
}) => {
  return (
    <aside className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto overflow-x-hidden p-4 space-y-6 text-left">
      
      {/* SECTION 0: ENTERPRISE TENANT COMPANY SELECTOR */}
      {companies && companies.length > 0 && (
        <div className="space-y-2 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">TARGET COMPANY</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider border border-emerald-200/80 flex items-center space-x-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Sync</span>
            </span>
          </div>

          <div className="relative">
            <select
              value={selectedCompany?.id || selectedCompany?.companyCode || ''}
              onChange={(e) => {
                const c = companies.find(comp => String(comp.id) === String(e.target.value) || comp.companyCode === e.target.value);
                if (c && onSelectCompany) onSelectCompany(c);
              }}
              className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 text-xs font-black text-indigo-950 focus:border-[#362f9d] focus:outline-none cursor-pointer shadow-2xs"
            >
              {companies.map(c => (
                <option key={c.id || c.companyCode} value={c.id || c.companyCode}>
                  🏢 {c.companyName} ({c.companyCode})
                </option>
              ))}
            </select>
          </div>
          <p className="text-[9.5px] text-indigo-900/70 font-semibold leading-tight">
            Forms customize live for this company's admins, agents & end-users.
          </p>
        </div>
      )}

      {/* SECTION 1: ALL CATEGORIES LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center space-x-1.5">
            <Folder className="h-4 w-4 text-[#362f9d]" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">ALL CATEGORIES</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[#362f9d] text-[10px] font-black border border-indigo-100">
            {categories.length}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 font-semibold">Select a category to load its fields:</p>

        <div className="space-y-2 pt-0.5">
          {categories.length === 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
              <p className="text-xs text-slate-500 font-medium">No categories yet</p>
              <button
                type="button"
                onClick={() => setIsCreateFormModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#362f9d] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                + Add Category
              </button>
            </div>
          )}
          {categories.map((cat) => {
            const isCatSelected = selectedCategory?.id === cat.id || selectedCategory?.name === cat.name;
            return (
              <div
                key={cat.id || cat.name}
                onClick={() => onCategorySwitch(cat)}
                className={`group relative w-full p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
                  isCatSelected
                    ? 'border-[#362f9d] bg-indigo-50 text-[#362f9d] font-extrabold shadow-2xs'
                    : 'border-slate-200/80 bg-white hover:border-indigo-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isCatSelected ? 'bg-[#362f9d]' : 'bg-emerald-500'}`}></span>
                    <span className="text-xs font-black truncate">{cat.name}</span>
                  </div>
                  {onPromptDeleteCategory && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPromptDeleteCategory(cat);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 text-rose-500 hover:text-rose-700 rounded-lg transition-all cursor-pointer shrink-0"
                      title="Delete Category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pl-4 font-semibold">
                  <span>{cat.fieldCount || (isCatSelected ? customFields.length : 4)} fields</span>
                  <span className="text-emerald-600 font-bold uppercase tracking-wider">Active</span>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setIsCreateFormModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-2xl border-2 border-dashed border-[#362f9d]/40 bg-indigo-50/40 hover:bg-indigo-100/60 text-[#362f9d] text-xs font-black flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-2xs mt-2"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Category</span>
          </button>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* SECTION 2: ADD FIELDS PALETTE */}
      <div className="space-y-3">
        <div className="pb-1 border-b border-slate-100">
          <div className="flex items-center space-x-1.5">
            <Puzzle className="h-4 w-4 text-[#362f9d]" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">ADD FIELDS PALETTE</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Click any field to add to canvas</p>
        </div>

        {/* Basic Fields Group */}
        <div className="space-y-2">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">BASIC FIELDS</span>
          <div className="space-y-1.5">
            
            <button type="button" onClick={() => onAddFieldFromPalette('text', 'Short Text')} className="w-full p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#362f9d] hover:bg-indigo-50/50 text-left flex items-center space-x-3 transition-colors shadow-2xs cursor-pointer group">
              <span className="text-xs font-extrabold text-[#362f9d] w-4 text-center">Aa</span>
              <div className="truncate">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">Short Text Field</p>
                <p className="text-[9.5px] text-slate-400">Single-line alphanumeric</p>
              </div>
            </button>

            <button type="button" onClick={() => onAddFieldFromPalette('textarea', 'Description / Paragraph')} className="w-full p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#362f9d] hover:bg-indigo-50/50 text-left flex items-center space-x-3 transition-colors shadow-2xs cursor-pointer group">
              <AlignLeft className="h-4 w-4 text-[#362f9d] shrink-0" />
              <div className="truncate">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">Multi-line Paragraph</p>
                <p className="text-[9.5px] text-slate-400">Large message box</p>
              </div>
            </button>

            <button type="button" onClick={() => onAddFieldFromPalette('number', 'Numeric Value')} className="w-full p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#362f9d] hover:bg-indigo-50/50 text-left flex items-center space-x-3 transition-colors shadow-2xs cursor-pointer group">
              <span className="text-xs font-extrabold text-[#362f9d] w-4 text-center">#</span>
              <div className="truncate">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">Number Input</p>
                <p className="text-[9.5px] text-slate-400">Amount, ID, counts</p>
              </div>
            </button>

            <button type="button" onClick={() => onAddFieldFromPalette('date', 'Target Date')} className="w-full p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#362f9d] hover:bg-indigo-50/50 text-left flex items-center space-x-3 transition-colors shadow-2xs cursor-pointer group">
              <Calendar className="h-4 w-4 text-[#362f9d] shrink-0" />
              <div className="truncate">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">Date Picker</p>
                <p className="text-[9.5px] text-slate-400">Calendar date selector</p>
              </div>
            </button>

          </div>
        </div>

        {/* Choice & Option Fields */}
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">CHOICE & OPTIONS</span>
          <div className="space-y-1.5">

            <button type="button" onClick={() => onAddFieldFromPalette('select', 'Dropdown Select', true)} className="w-full p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#362f9d] hover:bg-indigo-50/50 text-left flex items-center space-x-3 transition-colors shadow-2xs cursor-pointer group">
              <ListFilter className="h-4 w-4 text-[#362f9d] shrink-0" />
              <div className="truncate">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">Dropdown Menu</p>
                <p className="text-[9.5px] text-slate-400">Single select from list</p>
              </div>
            </button>

            <button type="button" onClick={() => onAddFieldFromPalette('radio', 'Radio Choice', true)} className="w-full p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#362f9d] hover:bg-indigo-50/50 text-left flex items-center space-x-3 transition-colors shadow-2xs cursor-pointer group">
              <Radio className="h-4 w-4 text-[#362f9d] shrink-0" />
              <div className="truncate">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">Radio Options</p>
                <p className="text-[9.5px] text-slate-400">Single visible option</p>
              </div>
            </button>

            <button type="button" onClick={() => onAddFieldFromPalette('checkbox', 'Checkbox Agree')} className="w-full p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#362f9d] hover:bg-indigo-50/50 text-left flex items-center space-x-3 transition-colors shadow-2xs cursor-pointer group">
              <CheckSquare className="h-4 w-4 text-[#362f9d] shrink-0" />
              <div className="truncate">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">Checkbox Toggle</p>
                <p className="text-[9.5px] text-slate-400">Boolean confirmation</p>
              </div>
            </button>

            <button type="button" onClick={() => onAddFieldFromPalette('file', 'File / Document Upload')} className="w-full p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#362f9d] hover:bg-indigo-50/50 text-left flex items-center space-x-3 transition-colors shadow-2xs cursor-pointer group">
              <Paperclip className="h-4 w-4 text-[#362f9d] shrink-0" />
              <div className="truncate">
                <p className="text-xs font-extrabold text-slate-800 leading-tight">Attachment / File</p>
                <p className="text-[9.5px] text-slate-400">PDF, PNG, JPG uploads</p>
              </div>
            </button>

          </div>
        </div>

        {/* Advanced Conditional Branches */}
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block">ADVANCED CONDITIONAL</span>
          <div className="space-y-1.5">

            <button 
              type="button" 
              onClick={() => onAddFieldFromPalette('conditional_section', 'Dynamic Branch Forms')} 
              className="w-full p-2.5 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-100/60 text-left flex items-center space-x-3 transition-colors shadow-2xs cursor-pointer group"
            >
              <div className="h-7 w-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <GitBranch className="h-4 w-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-amber-900 leading-tight">Conditional Subform</p>
                <p className="text-[9.5px] text-amber-700">Appears on trigger option</p>
              </div>
            </button>

          </div>
        </div>

      </div>
    </aside>
  );
};

export default CategoryFields;
