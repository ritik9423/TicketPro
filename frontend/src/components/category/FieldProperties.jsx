import React, { useState } from 'react';
import { 
  Trash2, 
  SlidersHorizontal, 
  GitBranch, 
  Sparkles, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Layers,
  Edit2,
  X,
  Paperclip
} from 'lucide-react';

const FieldProperties = ({
  selectedField,
  selectedFieldIndex,
  handleUpdateFieldProperty: propHandleUpdate,
  onUpdateFieldProperty: propOnUpdate,
  handleRemoveField: propHandleRemove,
  onRemoveField: propOnRemove,
  formTitle,
  customFields = [],
  allFields = [],
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
  const handleUpdateFieldProperty = propHandleUpdate || propOnUpdate || (() => {});
  const handleRemoveField = propHandleRemove || propOnRemove || (() => {});
  const activeCustomFields = (customFields && customFields.length > 0) ? customFields : allFields;
  const [newOptionInput, setNewOptionInput] = useState('');

  if (!selectedField) {
    return (
      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-400 space-y-1">
        <SlidersHorizontal className="h-5 w-5 mx-auto text-slate-300" />
        <p className="text-xs text-slate-400 font-medium">
          Click any field on the canvas to view its properties.
        </p>
      </div>
    );
  }

  const isConditional = selectedField.type === 'conditional_section';
  const isOptionsField = ['select', 'dropdown', 'radio', 'multiselect'].includes(selectedField.type);
  
  // Normalize multi-branch or single-branch
  const branches = Array.isArray(selectedField.branches) && selectedField.branches.length > 0
    ? selectedField.branches
    : (selectedField.conditionValue ? [{ value: selectedField.conditionValue, label: selectedField.label || `${selectedField.conditionValue} Form`, fields: selectedField.fields || [] }] : []);

  const activeBranchVal = selectedField.activeBranchTab || (branches[0]?.value) || selectedField.conditionValue || 'Option 1';
  const activeBranch = branches.find(b => b.value === activeBranchVal) || branches[0] || { value: activeBranchVal, fields: selectedField.fields || [] };
  const subFields = Array.isArray(activeBranch.fields) ? activeBranch.fields : [];
  
  // Find all dropdown/select fields in the form that could be triggers
  const availableDropdowns = activeCustomFields.filter(f => 
    f.type === 'select' || f.type === 'dropdown' || f.type === 'radio'
  );

  const currentOptions = Array.isArray(selectedField.options)
    ? selectedField.options
    : (typeof selectedField.options === 'string' ? selectedField.options.split(',').map(o => o.trim()).filter(Boolean) : []);

  const handleAddOption = () => {
    if (readOnly || !newOptionInput.trim()) return;
    const updated = [...currentOptions, newOptionInput.trim()];
    handleUpdateFieldProperty(selectedFieldIndex, 'options', updated);
    setNewOptionInput('');
  };

  const handleRemoveOption = (indexToRemove) => {
    if (readOnly) return;
    const updated = currentOptions.filter((_, i) => i !== indexToRemove);
    handleUpdateFieldProperty(selectedFieldIndex, 'options', updated);
  };

  return (
    <fieldset disabled={readOnly} className="space-y-4 text-left border-0 p-0 m-0">
      {/* SECTION HEADER BADGE */}
      <div className="pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-1.5">
          {isConditional ? (
            <GitBranch className="h-4 w-4 text-cyan-600" />
          ) : (
            <SlidersHorizontal className="h-4 w-4 text-cyan-600" />
          )}
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            {isConditional ? 'BRANCH LOGIC SECTION' : 'FIELD PROPERTIES'}
          </h3>
          {readOnly && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">
              Read-Only
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
          {readOnly ? `Viewing "${selectedField.label}" (Historical Archive)` : `Editing "${selectedField.label}" in ${formTitle}`}
        </p>
      </div>

      {readOnly && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-bold">
          🔒 Properties are locked for historical versions. Create a new version to modify field attributes.
        </div>
      )}

      {/* CONDITIONAL SECTION SPECIFIC CONFIGURATION */}
      {isConditional ? (
        <div className="space-y-4">
          
          {/* Section Title */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Section Title / Name *</label>
            <input
              type="text"
              value={selectedField.label}
              onChange={(e) => handleUpdateFieldProperty(selectedFieldIndex, 'label', e.target.value)}
              placeholder="e.g. Dynamic Branch Forms"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold focus:border-cyan-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Condition Settings Box */}
          <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 space-y-3">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-cyan-600" />
              <span className="text-xs font-black text-cyan-800">Controlling Trigger Dropdown</span>
            </div>

            {/* Parent Dropdown to Watch */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">
                Controlling Dropdown Field:
              </label>
              {availableDropdowns.length > 0 ? (
                <select
                  value={selectedField.dependsOn || ''}
                  onChange={(e) => {
                    const newDependsOn = e.target.value;
                    handleUpdateFieldProperty(selectedFieldIndex, 'dependsOn', newDependsOn);
                  }}
                  aria-label="Controlling Dropdown Field"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose Dropdown in Form --</option>
                  {availableDropdowns.map(d => (
                    <option key={d.id || d.label} value={d.label}>{d.label} (Dropdown)</option>
                  ))}
                </select>
              ) : null}

              <input
                type="text"
                value={selectedField.dependsOn || ''}
                onChange={(e) => handleUpdateFieldProperty(selectedFieldIndex, 'dependsOn', e.target.value)}
                placeholder="or type dropdown name (e.g. Ticket Type, Category)"
                className="w-full mt-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:border-cyan-500 focus:outline-none placeholder-slate-400"
              />
            </div>
          </div>

          {/* Branch Forms Tabs Manager */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                Dropdown Option Forms ({branches.length})
              </span>
              <button
                type="button"
                onClick={() => handleAddBranch && handleAddBranch(selectedFieldIndex)}
                className="px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-800 hover:bg-cyan-600 hover:text-white text-[10px] font-black transition-all cursor-pointer flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>+ Add Option</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {branches.map((b, bIdx) => {
                const isAct = b.value === activeBranchVal;
                return (
                  <button
                    key={bIdx}
                    type="button"
                    onClick={() => handleSelectBranchTab && handleSelectBranchTab(selectedFieldIndex, b.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      isAct
                        ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white border-transparent shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-300'
                    }`}
                  >
                    <span>{b.value}</span>
                    <span className={`ml-1.5 px-1 rounded text-[9px] ${
                      isAct ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {Array.isArray(b.fields) ? b.fields.length : 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-fields Manager Inside Properties for Active Branch */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                "{activeBranchVal}" Fields ({subFields.length})
              </span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {subFields.map((sub, sIdx) => (
                <div key={sub.id || sIdx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="h-4 w-4 rounded-md bg-cyan-100 text-cyan-800 text-[9px] font-black flex items-center justify-center shrink-0">
                      {sIdx + 1}
                    </span>
                    <span className="truncate">{sub.label}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1 py-0.5 rounded bg-white border border-slate-200">
                      {sub.type}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (openEditSubFieldModal) openEditSubFieldModal(selectedFieldIndex, sIdx, sub, e);
                      }}
                      className="p-1 rounded hover:bg-cyan-100 text-cyan-700 cursor-pointer"
                      title="Edit sub-field"
                      aria-label={`Edit sub-field ${sub.label}`}
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={sIdx === 0}
                      onClick={() => handleReorderSubField && handleReorderSubField(selectedFieldIndex, sIdx, sIdx - 1)}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-500 cursor-pointer"
                      title="Move Up"
                      aria-label={`Move ${sub.label} Up`}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={sIdx === subFields.length - 1}
                      onClick={() => handleReorderSubField && handleReorderSubField(selectedFieldIndex, sIdx, sIdx + 1)}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-500 cursor-pointer"
                      title="Move Down"
                      aria-label={`Move ${sub.label} Down`}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubFieldFromSection && handleRemoveSubFieldFromSection(selectedFieldIndex, sIdx)}
                      className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete sub-field"
                      aria-label={`Delete sub-field ${sub.label}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Sub-field Button */}
            <button
              type="button"
              onClick={() => handleAddSubFieldToSection && handleAddSubFieldToSection(selectedFieldIndex, 'text', 'New Field', activeBranchVal)}
              className="w-full py-2 rounded-xl border border-dashed border-cyan-300 bg-cyan-50/50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Sub-Field to Section</span>
            </button>
          </div>

        </div>
      ) : (
        /* STANDARD FIELD PROPERTIES */
        <div className="space-y-4">
          {/* Field Label */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Field Label *</label>
            <input
              type="text"
              value={selectedField.label}
              onChange={(e) => handleUpdateFieldProperty(selectedFieldIndex, 'label', e.target.value)}
              placeholder="Enter label"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold focus:border-cyan-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Field Type Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Field Type</label>
            <select
              value={selectedField.type || 'text'}
              onChange={(e) => handleUpdateFieldProperty(selectedFieldIndex, 'type', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:border-cyan-500 focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="text">Short Text Field (Single-line)</option>
              <option value="textarea">Long Text Field (Multi-line Paragraph)</option>
              <option value="select">Dropdown Menu (Select List)</option>
              <option value="radio">Radio Options (Single Choice)</option>
              <option value="number">Number Input (Numeric)</option>
              <option value="date">Date Picker</option>
              <option value="file">File Upload / Attachment</option>
            </select>
          </div>

          {selectedField.type === 'file' && (
            <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200/80 space-y-1.5">
              <span className="text-[11px] font-black text-cyan-900 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-cyan-600" />
                <span>File Upload Field Configuration</span>
              </span>
              <p className="text-[10px] text-cyan-800 font-semibold leading-relaxed">
                Accepts documents (PDF, Word, Excel, Text) and photos (PNG, JPG) up to 10MB. Files are verified, virus-checked, and stored securely with multi-tenant encryption.
              </p>
            </div>
          )}

          {/* Placeholder */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Placeholder Text</label>
            <input
              type="text"
              value={selectedField.placeholder || ''}
              onChange={(e) => handleUpdateFieldProperty(selectedFieldIndex, 'placeholder', e.target.value)}
              placeholder="e.g. Enter value..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:border-cyan-500 focus:outline-none shadow-2xs"
            />
          </div>

          {isOptionsField && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <span className="text-xs font-bold text-slate-800">
                  Dropdown Options ({currentOptions.length})
                </span>
                {currentOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleUpdateFieldProperty(selectedFieldIndex, 'options', [])}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Add Option Input */}
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={newOptionInput}
                  onChange={(e) => setNewOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newOptionInput.trim()) {
                        const items = newOptionInput.split(',').map(s => s.trim()).filter(Boolean);
                        const updated = [...currentOptions, ...items];
                        handleUpdateFieldProperty(selectedFieldIndex, 'options', updated);
                        setNewOptionInput('');
                      }
                    }
                  }}
                  placeholder="Type option name (e.g. Option 1)..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newOptionInput.trim()) {
                      const items = newOptionInput.split(',').map(s => s.trim()).filter(Boolean);
                      const updated = [...currentOptions, ...items];
                      handleUpdateFieldProperty(selectedFieldIndex, 'options', updated);
                      setNewOptionInput('');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  + Add
                </button>
              </div>

              {/* Options List */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                {currentOptions.length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-medium text-center py-2">
                    No options yet. Type above and click + Add.
                  </p>
                ) : (
                  currentOptions.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs">
                      <div className="flex items-center space-x-2 flex-1 mr-2">
                        <span className="h-4 w-4 rounded-md bg-slate-100 text-slate-600 text-[9px] font-bold flex items-center justify-center shrink-0">
                          {oIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...currentOptions];
                            updated[oIdx] = e.target.value;
                            handleUpdateFieldProperty(selectedFieldIndex, 'options', updated);
                          }}
                          className="w-full text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none px-0.5"
                        />
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          disabled={oIdx === 0}
                          onClick={() => {
                            const updated = [...currentOptions];
                            const [moved] = updated.splice(oIdx, 1);
                            updated.splice(oIdx - 1, 0, moved);
                            handleUpdateFieldProperty(selectedFieldIndex, 'options', updated);
                          }}
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={oIdx === currentOptions.length - 1}
                          onClick={() => {
                            const updated = [...currentOptions];
                            const [moved] = updated.splice(oIdx, 1);
                            updated.splice(oIdx + 1, 0, moved);
                            handleUpdateFieldProperty(selectedFieldIndex, 'options', updated);
                          }}
                          className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(oIdx)}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Option"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Help Text / Hint */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Help Text / Hint</label>
            <input
              type="text"
              value={selectedField.helpText || ''}
              onChange={(e) => handleUpdateFieldProperty(selectedFieldIndex, 'helpText', e.target.value)}
              placeholder="e.g. Format: ABCDE1234F"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:border-cyan-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Required Toggle Switch */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-cyan-50/50 border border-cyan-100/80">
            <span className="text-xs font-bold text-slate-800">Required Field</span>
            <button
              type="button"
              onClick={() => handleUpdateFieldProperty(selectedFieldIndex, 'required', !selectedField.required)}
              aria-label={selectedField.required ? "Mark as optional" : "Mark as required"}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                selectedField.required ? 'bg-cyan-600' : 'bg-slate-300'
              }`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                selectedField.required ? 'translate-x-5' : 'translate-x-0'
              }`}></div>
            </button>
          </div>

          {/* Default Value */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Default Value</label>
            <input
              type="text"
              value={selectedField.defaultValue || ''}
              onChange={(e) => handleUpdateFieldProperty(selectedFieldIndex, 'defaultValue', e.target.value)}
              placeholder="Enter default value"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:border-cyan-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Validation Group */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-black text-cyan-700 uppercase tracking-wider block">Validation Rules</span>

            <div>
              <label htmlFor="field-val-type" className="block text-[11px] font-bold text-slate-700 mb-1">Validation Type</label>
              <select id="field-val-type" aria-label="Validation Type" className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium bg-white focus:outline-none cursor-pointer">
                <option value="none">None</option>
                <option value="email">Email Address</option>
                <option value="phone">Phone Number</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Delete Field Button */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => handleRemoveField(selectedFieldIndex)}
          className="w-full py-2.5 mt-2 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete Selected {isConditional ? 'Section' : 'Field'}</span>
        </button>
      )}

    </fieldset>
  );
};

export default FieldProperties;
