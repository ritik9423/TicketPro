import React, { useState } from 'react';
import { 
  Eye, 
  Send, 
  CheckCircle2, 
  ArrowLeft, 
  Calendar, 
  HelpCircle, 
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import DragDropUploader from '../common/DragDropUploader';

const FormPreview = ({
  mode = 'standalone', // 'canvas' | 'standalone' | 'modal'
  formTitle = 'Form Preview',
  formDescription = 'Live interactive customer ticket submission form',
  customFields = [],
  onClose,
  onSwitchToBuilder
}) => {
  const [formData, setFormData] = useState({});
  const [fileMap, setFileMap] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleFileChange = (fieldKey, fileObj) => {
    if (fileObj) {
      setFileMap(prev => ({ ...prev, [fieldKey]: fileObj }));
      setFormData(prev => ({ ...prev, [fieldKey]: fileObj.name }));
    } else {
      setFileMap(prev => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
      setFormData(prev => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const stripPrefix = (val) => {
    if (!val) return '';
    return val.toString().trim().replace(/^\d+\.\s*/, '');
  };

  const getActiveBranchForField = (field) => {
    if (field.type !== 'conditional_section') return null;
    const branches = Array.isArray(field.branches) && field.branches.length > 0 ? field.branches : [];
    if (branches.length === 0) {
      if (field.conditionValue) {
        return { value: field.conditionValue, label: field.label, fields: field.fields || [] };
      }
      return null;
    }

    const controllingField = customFields.find(f => {
      const fLabel = (f.label || '').trim().toLowerCase();
      const dependsOn = (field.dependsOn || '').trim().toLowerCase();
      return fLabel === dependsOn || (dependsOn && fLabel.includes(dependsOn));
    });

    const selectedTriggerValue = controllingField ? formData[controllingField.id || controllingField.label] : null;

    if (selectedTriggerValue) {
      const cleanVal = stripPrefix(selectedTriggerValue).toLowerCase();
      const match = branches.find(b => {
        const branchVal = stripPrefix(b.value || b.label || '').toLowerCase();
        return branchVal === cleanVal || cleanVal.includes(branchVal) || branchVal.includes(cleanVal);
      });
      if (match) return match;
    }

    if (field.activeBranchTab) {
      const match = branches.find(b => stripPrefix(b.value || b.label || '').toLowerCase() === stripPrefix(field.activeBranchTab).toLowerCase());
      if (match) return match;
    }

    const partial = branches.find(b => {
      const branchVal = stripPrefix(b.value || b.label || '').toLowerCase();
      return Object.values(formData).some(val => {
        if (typeof val === 'string') {
          const clean = stripPrefix(val).toLowerCase();
          return clean === branchVal || clean.includes(branchVal);
        }
        return false;
      });
    });

    return partial || branches[0];
  };

  const handleSimulateSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const renderFormContent = () => (
    <div className="space-y-6">
      {submitted ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h4 className="text-lg font-black text-emerald-950">Form Submission Received Successfully!</h4>
            <p className="text-xs text-emerald-700 font-semibold mt-1 max-w-md mx-auto">
              All field validations passed. In the live customer portal, this intake request creates a new support ticket and routes to the designated team.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Form</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSimulateSubmit} className="space-y-4">
          {customFields.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
              <Eye className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold">No fields added to this form yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Switch back to Builder and add fields from the palette.</p>
            </div>
          ) : (
            customFields.map((f, i) => {
              const fieldKey = f.id || f.label || `field_${i}`;
              const isConditional = f.type === 'conditional_section';

              if (isConditional) {
                const activeBranch = getActiveBranchForField(f);
                const subFields = activeBranch?.fields || f.fields || [];

                return (
                  <div key={f.id || i} className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                      <div>
                        <span className="text-xs font-black text-[#362f9d] block">
                          {activeBranch?.label || f.label || 'Dynamic Section'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Triggered by: <strong>{f.dependsOn || 'Dropdown Selection'}</strong> → {activeBranch?.value || 'Selected Option'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-[#362f9d] text-[9.5px] font-extrabold">
                        {subFields.length} sub-fields
                      </span>
                    </div>

                    <div className="space-y-3 pt-1">
                      {subFields.map((sf, sfIdx) => {
                        const subKey = sf.id || `${fieldKey}_${sf.label}_${sfIdx}`;
                        return (
                          <div key={sf.id || sfIdx} className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700">
                              {sf.label} {sf.required !== false && <span className="text-rose-500">*</span>}
                            </label>
                            {sf.type === 'textarea' ? (
                              <textarea
                                rows={2}
                                required={sf.required !== false}
                                placeholder={sf.placeholder || 'Enter details...'}
                                value={formData[subKey] || ''}
                                onChange={(e) => handleInputChange(subKey, e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-[#362f9d] focus:outline-none"
                              />
                            ) : sf.type === 'select' ? (
                              <select
                                required={sf.required !== false}
                                value={formData[subKey] || ''}
                                onChange={(e) => handleInputChange(subKey, e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-[#362f9d] focus:outline-none"
                              >
                                <option value="">-- Choose Option --</option>
                                {(Array.isArray(sf.options) ? sf.options : (typeof sf.options === 'string' ? sf.options.split(',') : [])).map((opt, oIdx) => (
                                  <option key={oIdx} value={opt.trim()}>{opt.trim()}</option>
                                ))}
                              </select>
                            ) : sf.type === 'file' ? (
                              <DragDropUploader
                                fieldId={`sub_preview_file_${subKey}`}
                                label={sf.label}
                                required={sf.required !== false}
                                enableInstantTest={true}
                                initialFilename={formData[subKey] || ''}
                                onFileSelected={(fileObj) => handleFileChange(subKey, fileObj)}
                              />
                            ) : (
                              <input
                                type={sf.type || 'text'}
                                required={sf.required !== false}
                                placeholder={sf.placeholder || 'Enter answer...'}
                                value={formData[subKey] || ''}
                                onChange={(e) => handleInputChange(subKey, e.target.value)}
                                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-[#362f9d] focus:outline-none"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div key={f.id || i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      {f.label} {f.required && <span className="text-rose-500">*</span>}
                    </label>
                    {f.tooltip && (
                      <span className="text-[10px] text-slate-400 font-medium">{f.tooltip}</span>
                    )}
                  </div>

                  {f.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      required={f.required}
                      placeholder={f.placeholder || 'Enter information...'}
                      value={formData[fieldKey] || ''}
                      onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-[#362f9d] focus:outline-none"
                    />
                  ) : f.type === 'select' ? (
                    <select
                      required={f.required}
                      value={formData[fieldKey] || ''}
                      onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-[#362f9d] focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Select --</option>
                      {(Array.isArray(f.options) ? f.options : (typeof f.options === 'string' ? f.options.split(',') : [])).map((opt, oIdx) => (
                        <option key={oIdx} value={opt.trim()}>{opt.trim()}</option>
                      ))}
                    </select>
                  ) : f.type === 'radio' ? (
                    <div className="space-y-1.5 pt-1">
                      {(Array.isArray(f.options) ? f.options : (typeof f.options === 'string' ? f.options.split(',') : [])).map((opt, oIdx) => (
                        <label key={oIdx} className="flex items-center space-x-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`radio_${fieldKey}`}
                            value={opt.trim()}
                            checked={formData[fieldKey] === opt.trim()}
                            onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                            className="h-3.5 w-3.5 text-[#362f9d] border-slate-300"
                          />
                          <span>{opt.trim()}</span>
                        </label>
                      ))}
                    </div>
                  ) : f.type === 'checkbox' ? (
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={!!formData[fieldKey]}
                        onChange={(e) => handleInputChange(fieldKey, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#362f9d]"
                      />
                      <span>{f.placeholder || f.label}</span>
                    </label>
                  ) : f.type === 'file' ? (
                    <DragDropUploader
                      fieldId={`preview_file_${fieldKey}`}
                      label={f.label}
                      required={f.required}
                      enableInstantTest={true}
                      initialFilename={formData[fieldKey] || ''}
                     onFileSelected={(fileObj) => handleFileChange(fieldKey, fileObj)}
                    />
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      required={f.required}
                      placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                      value={formData[fieldKey] || ''}
                      onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-[#362f9d] focus:outline-none"
                    />
                  )}
                </div>
              );
            })
          )}

          {customFields.length > 0 && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={onSwitchToBuilder}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Builder</span>
              </button>

              <button
                type="submit"
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#362f9d] hover:bg-[#2e2a85] text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Ticket</span>
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );

  // In-Place Canvas Mode (Replaces center canvas directly where the user is working)
  if (mode === 'canvas' || mode === 'standalone') {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-5 text-left animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black text-slate-900">{formTitle}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200 flex items-center space-x-1">
                <span>Interactive Preview</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{formDescription}</p>
          </div>

          <button
            type="button"
            onClick={onSwitchToBuilder}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1 cursor-pointer"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Builder</span>
          </button>
        </div>

        {renderFormContent()}
      </div>
    );
  }

  // Modal Mode
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl text-left border border-slate-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">{formTitle}</h3>
            <p className="text-xs text-slate-400 font-medium">{formDescription}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {renderFormContent()}
      </div>
    </div>
  );
};

export default FormPreview;
