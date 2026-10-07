import React, { useState, useRef, useEffect } from 'react';
import { 
  GripVertical, 
  Trash2, 
  Edit2, 
  UploadCloud, 
  PenTool, 
  Sparkles, 
  GitBranch, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Layers, 
  AlignLeft, 
  Calendar, 
  Paperclip, 
  Sliders 
} from 'lucide-react';
import DragDropUploader from '../common/DragDropUploader';

const FormBuilder = ({
  customFields,
  selectedFieldIndex,
  setSelectedFieldIndex,
  setRightPanelTab,
  draggedIndex,
  dragOverIndex,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  handleRemoveField,
  handleClearAllFields,
  openEditOptionsModal,
  handleAddSubFieldToSection,
  handleRemoveSubFieldFromSection,
  handleUpdateSubField,
  handleReorderSubField,
  openEditSubFieldModal,
  handleSelectBranchTab,
  handleAddBranch,
  handleDeleteBranch,
  readOnly = false
}) => {
  return (
    <div className="space-y-3 text-left">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Form Layout Canvas
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-extrabold">
            {customFields.length} {customFields.length === 1 ? 'element' : 'elements'}
          </span>
          {readOnly && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
              Immutable (Read-Only)
            </span>
          )}
        </div>

        {!readOnly && customFields.length > 0 && (
          <button
            type="button"
            onClick={handleClearAllFields}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer flex items-center space-x-1"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear Canvas</span>
          </button>
        )}
      </div>

      {readOnly && (
        <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-center space-x-2 text-xs text-amber-800 font-bold">
          <span>🔒 Historical Version (Read-Only) — This form version is pinned to historical tickets and is immutable. To propose changes, create a new version.</span>
        </div>
      )}

      {/* Field List Container */}
      <div className="space-y-2.5">
        {customFields.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-2xs space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-[#362f9d] flex items-center justify-center mx-auto">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-800">Your Form Canvas is Empty</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click any field in the left palette to add questions, dropdowns, and conditional sections.
              </p>
            </div>
          </div>
        ) : (
          customFields.map((field, idx) => {
            const isSelected = selectedFieldIndex === idx;
            const isOver = dragOverIndex === idx && draggedIndex !== idx;
            const fieldType = (field.type || 'text').toLowerCase();
            const isConditional = fieldType === 'conditional_section';
            const opts = Array.isArray(field.options) 
              ? field.options 
              : (typeof field.options === 'string' ? field.options.split(',').map(o => o.trim()).filter(Boolean) : []);

            // Normalize Multi-Branch or Single-Branch
            const branches = Array.isArray(field.branches) && field.branches.length > 0
              ? field.branches
              : (field.conditionValue ? [{ value: field.conditionValue, label: field.label || `${field.conditionValue} Form`, fields: field.fields || [] }] : []);

            const activeBranchVal = field.activeBranchTab || (branches[0]?.value) || field.conditionValue || 'Option 1';
            const activeBranch = branches.find(b => 
              (b.value || '').trim().toLowerCase() === (activeBranchVal || '').trim().toLowerCase()
            ) || branches[0] || { value: activeBranchVal, fields: field.fields || [] };
            const subFields = Array.isArray(activeBranch.fields) ? activeBranch.fields : [];

            return (
              <div
                key={field.id || idx}
                draggable={!readOnly}
                onDragStart={(e) => !readOnly && handleDragStart(e, idx)}
                onDragOver={(e) => !readOnly && handleDragOver(e, idx)}
                onDrop={(e) => !readOnly && handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  setSelectedFieldIndex(idx);
                  if (setRightPanelTab) setRightPanelTab('field_properties');
                }}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer select-none space-y-3 ${
                  isConditional 
                    ? isSelected 
                      ? 'border-indigo-600 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white shadow-md ring-2 ring-indigo-500/20' 
                      : 'border-indigo-200/80 bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/20 hover:border-indigo-400 shadow-2xs'
                    : isSelected
                      ? 'border-[#362f9d] bg-indigo-50/40 shadow-md ring-2 ring-[#362f9d]/20'
                      : isOver
                        ? 'border-emerald-500 bg-emerald-50/40 scale-[1.01]'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Field Top Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate">
                    {!readOnly && (
                      <div 
                        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                    )}

                    <div className="flex items-center space-x-2 truncate">
                      {isConditional ? (
                        <div className="h-6 w-6 rounded-lg bg-indigo-100 text-[#362f9d] flex items-center justify-center shrink-0">
                          <GitBranch className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-[#362f9d] shrink-0" />
                      )}

                      <span className="text-xs font-black text-slate-800 truncate">
                        {field.label || 'Untitled Field'}
                      </span>

                      {field.required && (
                        <span className="text-rose-500 font-bold text-xs" title="Required">*</span>
                      )}

                      {isConditional && (
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-indigo-100 text-[#362f9d] border border-indigo-200 inline-flex items-center space-x-1">
                          <span>Controlled by [{field.dependsOn || 'Ticket Type'}]</span>
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#362f9d] text-white uppercase tracking-wider">Selected</span>
                    )}
                    {isOver && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white uppercase tracking-wider animate-bounce">Drop Here</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                      isConditional 
                        ? 'bg-purple-100 text-purple-800 border-purple-200' 
                        : 'bg-slate-100 text-slate-700 border-slate-200/60'
                    }`}>
                      {isConditional ? 'Branch Logic Section' : field.type}
                    </span>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveField(idx);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete field"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* MULTI-BRANCH TABBED CONDITIONAL SECTION */}
                {isConditional ? (
                  <div className="p-4 rounded-2xl border-2 border-dashed border-indigo-200/90 bg-white/95 space-y-3.5 shadow-2xs">
                    
                    {/* BRANCH TABS SELECTOR (Click on any option to build its separate form) */}
                    <div className="space-y-2 pb-2 border-b border-indigo-100/70" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Layers className="h-3.5 w-3.5 text-[#362f9d]" />
                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                            Choose Dropdown Option to Design Form:
                          </span>
                        </div>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleAddBranch && handleAddBranch(idx)}
                            className="px-2.5 py-1 rounded-xl bg-[#362f9d] hover:bg-[#2a2480] text-white text-[10px] font-black transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>+ Add Option / Branch</span>
                          </button>
                        )}
                      </div>

                      {/* Branch Tab Pills Bar */}
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5 pt-1">
                        {branches.map((branch, bIdx) => {
                          const isActive = (branch.value || '').trim().toLowerCase() === (activeBranchVal || '').trim().toLowerCase();
                          const count = Array.isArray(branch.fields) ? branch.fields.length : 0;
                          return (
                            <div
                              key={bIdx}
                              className={`group inline-flex items-center rounded-xl border text-xs font-black transition-all cursor-pointer shadow-2xs ${
                                isActive
                                  ? 'bg-[#362f9d] text-white border-[#362f9d] ring-2 ring-[#362f9d]/20'
                                  : 'bg-slate-50 hover:bg-indigo-50/70 text-slate-700 border-slate-200 hover:border-indigo-300'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSelectBranchTab && handleSelectBranchTab(idx, branch.value)}
                                className="px-3 py-1.5 flex items-center space-x-1.5 cursor-pointer"
                              >
                                <span>{branch.value}</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[9.5px] font-extrabold ${
                                  isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {count}
                                </span>
                              </button>

                              {!readOnly && branches.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (handleDeleteBranch) handleDeleteBranch(idx, branch.value);
                                  }}
                                  className={`pr-2 pl-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-400 cursor-pointer ${
                                    isActive ? 'text-white/80' : 'text-slate-400'
                                  }`}
                                  title={`Delete "${branch.value}" form`}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Branch Sub-Fields Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">
                        Fields for: <strong className="text-[#362f9d] font-black">"{activeBranchVal}"</strong> ({subFields.length})
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Revealed when user selects <strong className="text-indigo-600">"{activeBranchVal}"</strong>
                      </span>
                    </div>

                    {/* Active Branch Sub-fields List */}
                    {subFields.length > 0 ? (
                      <div className="space-y-2">
                        {subFields.map((sub, sIdx) => (
                          <div 
                            key={sub.id || sIdx}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-indigo-200 transition-all text-xs font-bold text-slate-800"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="h-5 w-5 rounded-lg bg-indigo-100 text-[#362f9d] text-[10px] font-black flex items-center justify-center shrink-0">
                                {sIdx + 1}
                              </span>
                              <span>{sub.label}</span>
                              {sub.required && <span className="text-rose-500">*</span>}
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white border border-slate-200">
                                {sub.type}
                              </span>
                            </div>

                            {!readOnly && (
                              <div className="flex items-center space-x-1">
                                {/* Edit Sub-Field Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (openEditSubFieldModal) openEditSubFieldModal(idx, sIdx, sub, activeBranchVal, e);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-indigo-100 hover:bg-[#362f9d] text-[#362f9d] hover:text-white text-[10px] font-extrabold transition-all cursor-pointer shadow-2xs flex items-center space-x-1"
                                  title="Edit sub-field details & dropdown options"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  <span>Edit</span>
                                </button>

                                {/* Reorder Buttons */}
                                <button
                                  type="button"
                                  disabled={sIdx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (handleReorderSubField) handleReorderSubField(idx, sIdx, sIdx - 1, activeBranchVal);
                                  }}
                                  className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 text-slate-500 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={sIdx === subFields.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (handleReorderSubField) handleReorderSubField(idx, sIdx, sIdx + 1, activeBranchVal);
                                  }}
                                  className="p-1 rounded-lg hover:bg-slate-200 disabled:opacity-30 text-slate-500 cursor-pointer"
                                  title="Move Down"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (handleRemoveSubFieldFromSection) handleRemoveSubFieldFromSection(idx, sIdx, activeBranchVal);
                                  }}
                                  className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-1"
                                  title="Delete sub-field"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs italic">
                        No fields inside "{activeBranchVal}" form yet.
                      </div>
                    )}

                    {/* Add Sub-field Quick Palette */}
                    {!readOnly && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] font-black text-slate-500 uppercase">+ Add to "{activeBranchVal}":</span>
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => handleAddSubFieldToSection && handleAddSubFieldToSection(idx, 'text', 'Short Text', activeBranchVal)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#362f9d] text-[10px] font-extrabold transition-colors cursor-pointer border border-indigo-200/60"
                          >
                            + Short Text
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSubFieldToSection && handleAddSubFieldToSection(idx, 'textarea', 'Long Text', activeBranchVal)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#362f9d] text-[10px] font-extrabold transition-colors cursor-pointer border border-indigo-200/60"
                          >
                            + Long Text
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSubFieldToSection && handleAddSubFieldToSection(idx, 'select', 'Dropdown', activeBranchVal)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#362f9d] text-[10px] font-extrabold transition-colors cursor-pointer border border-indigo-200/60"
                          >
                            + Dropdown
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSubFieldToSection && handleAddSubFieldToSection(idx, 'date', 'Date', activeBranchVal)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#362f9d] text-[10px] font-extrabold transition-colors cursor-pointer border border-indigo-200/60"
                          >
                            + Date
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSubFieldToSection && handleAddSubFieldToSection(idx, 'file', 'File Upload', activeBranchVal)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#362f9d] text-[10px] font-extrabold transition-colors cursor-pointer border border-indigo-200/60"
                          >
                            + File
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                /* Options list preview if dropdown */
                fieldType === 'select' || fieldType === 'dropdown' || fieldType === 'multiselect' || fieldType === 'radio' ? (
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Dropdown Options:</span>
                      <button
                        type="button"
                        onClick={(e) => openEditOptionsModal(idx, field, e)}
                        className="px-2.5 py-1 rounded-xl bg-indigo-100 hover:bg-[#362f9d] text-[#362f9d] hover:text-white text-[10px] font-black transition-all cursor-pointer shadow-2xs flex items-center space-x-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit Options</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {opts.length > 0 ? opts.map((opt, oIdx) => (
                        <span key={oIdx} className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
                          {opt}
                        </span>
                      )) : (
                        <span className="text-xs italic text-slate-400 font-medium">No options defined yet. Click button to add.</span>
                      )}
                    </div>
                  </div>
                ) : fieldType === 'textarea' ? (
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 text-xs font-medium text-slate-400 h-16">
                    {field.placeholder || `Describe ${field.label.toLowerCase()} in detail...`}
                  </div>
                ) : fieldType === 'file' ? (
                  <div
                    className="pt-1"
                    onClick={(e) => e.stopPropagation()}
                    onDragOver={(e) => e.stopPropagation()}
                    onDrop={(e) => e.stopPropagation()}
                  >
                    <DragDropUploader
                      fieldId={`super_canvas_file_${field.id || idx}`}
                      label={field.label}
                      required={field.required}
                      enableInstantTest={false}
                    />
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 text-xs font-medium text-slate-400">
                    {field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  </div>
                )
              )}

              {field.helpText && (
                <p className="text-[10px] font-semibold text-slate-400 pl-1">
                  💡 {field.helpText}
                </p>
              )}
            </div>
          );
        })
      )}
      </div>
    </div>
  );
};

export default FormBuilder;
