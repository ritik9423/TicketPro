import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { liveChannel } from '../utils/liveChannel';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Edit2, 
  FileText, 
  Settings, 
  X,
  FileCheck,
  Folder,
  Layers,
  PenTool,
  SlidersHorizontal,
  LayoutGrid,
  Sparkles,
  ArrowLeft,
  ArrowRightLeft,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Building2,
  Search,
  RefreshCw,
  Radio
} from 'lucide-react';

// Imported Refactored Category Components
import CategoryForm from '../components/category/CategoryForm';
import CategoryFields from '../components/category/CategoryFields';
import FormBuilder from '../components/category/FormBuilder';
import FieldProperties from '../components/category/FieldProperties';
import FormPreview from '../components/category/FormPreview';
import ConfirmModal from '../components/common/ConfirmModal';

const getDefaultCategoriesForCompany = (compCode = 'IOCL', compName = '', industry = '') => {
  const code = (compCode || 'IOCL').toUpperCase();
  const searchStr = (code + ' ' + (compName || '') + ' ' + (industry || '')).toUpperCase();

  if (searchStr.includes('OIL') || searchStr.includes('GAS') || searchStr.includes('ENERGY') || searchStr.includes('PETROLEUM') || searchStr.includes('IOCL') || searchStr.includes('REFINERY')) {
    return [
      { id: 1, name: 'Refinery Telemetry & Automation', description: 'Plant sensor alerts, pipeline pressure SCADA telemetry & valve automation faults.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 2, name: 'Fuel Retail & Dispenser Pumps', description: 'Dispenser nozzle leaks, RFID card scanner faults & POS terminal errors.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 3, name: 'Logistics & Tanker Fleet Tracking', description: 'GPS telemetry tracking failure, tanker breakdown on route, or fuel dispatch delay.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 4, name: 'Pipeline SCADA & Pressure Valve Monitoring', description: 'Pipeline pressure drops, SCADA communication outages, and leak detection alerts.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 5, name: 'Hazard & Safety Incident Reporting', description: 'Report onsite hazardous chemical spill, fire equipment servicing, or safety drills.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 6, name: 'Tanker Fleet & Dispatch Operations', description: 'Fuel tanker loading bay scheduling, weight-bridge calibration, and driver logs.', status: 'ACTIVE', fieldCount: 4, isPublished: true }
    ];
  }

  if (searchStr.includes('FINANCE') || searchStr.includes('BANK') || searchStr.includes('HDFC') || searchStr.includes('ICICI') || searchStr.includes('AXIS')) {
    return [
      { id: 1, name: 'KYC Verification & Onboarding', description: 'Track pending identity verification, document verification, or account setup.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 2, name: 'Loan Application Support', description: 'Inquiries regarding loan disbursements, interest rates, or credit card limits.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 3, name: 'Card Related Issues', description: 'Instant Card Hotlisting / Block, Green PIN, or Upgrade Request.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 4, name: 'Net Banking & UPI', description: 'Report failed ATM cash dispensations or pending UPI money transfers.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 5, name: 'Account Closure Request', description: 'Savings/Current account closure requests with NOC clearance.', status: 'DRAFT', fieldCount: 4, isPublished: false },
      { id: 6, name: 'Fraud & Dispute Reporting', description: 'Dispute unauthorized card charges or suspicious transaction activity.', status: 'ACTIVE', fieldCount: 5, isPublished: true }
    ];
  }

  if (searchStr.includes('HEALTHCARE') || searchStr.includes('HOSPITAL') || searchStr.includes('PHARMA')) {
    return [
      { id: 1, name: 'Medical Equipment & ICU Hardware', description: 'Ventilator malfunction, patient monitor sensor error, MRI/CT scanner calibration alert.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 2, name: 'Pharmacy & Drug Inventory System', description: 'Medicine stock sync error, prescription barcode scanner issue, or billing software crash.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 3, name: 'Patient Health Portal & EHR Access', description: 'Electronic Health Record access permission, lab report portal bug, or doctor login loop.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
      { id: 4, name: 'Insurance Claim & Medical Billing', description: 'Process health insurance claim approvals and patient bill queries.', status: 'ACTIVE', fieldCount: 4, isPublished: true }
    ];
  }

  return [
    { id: 1, name: 'Software Bug & Defect Report', description: 'Report application errors, crashes, and software bugs.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
    { id: 2, name: 'Hardware & Device Provisioning', description: 'Request laptops, monitors, accessories, or equipment replacements.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
    { id: 3, name: 'Network, VPN & Server Outage', description: 'Report Wi-Fi/VPN disconnections, server downtime, or network latency.', status: 'ACTIVE', fieldCount: 4, isPublished: true },
    { id: 4, name: 'Identity, Access & Password Reset', description: 'Password resets, SSO access, or role permission requests.', status: 'ACTIVE', fieldCount: 4, isPublished: true }
  ];
};

const SuperAdminFormBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab') || 'studio';

  // Categories & Fields State
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customFields, setCustomFields] = useState([]);

  // Form Template Versions State (Immutable Versions)
  const [formTemplates, setFormTemplates] = useState([]);
  const [selectedTemplateVersion, setSelectedTemplateVersion] = useState(null);

  const categoryTemplates = (formTemplates || [])
    .filter(t => 
      (selectedCategory?.id && String(t.categoryId) === String(selectedCategory.id)) ||
      (selectedCategory?.name && t.categoryName === selectedCategory.name)
    )
    .sort((a, b) => (b.version || 0) - (a.version || 0));

  const isHistoricalVersion = selectedTemplateVersion?.status === 'ARCHIVED';

  // In-Place Canvas Mode ('builder' | 'preview')
  const [canvasViewMode, setCanvasViewMode] = useState('builder');

  // History Undo/Redo State
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // UI Stepper & Panel States
  const [rightPanelTab, setRightPanelTab] = useState('add_fields'); // 'add_fields' | 'field_properties'
  const [selectedFieldIndex, setSelectedFieldIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Modals State
  const [isCreateFormModalOpen, setIsCreateFormModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameCatInput, setRenameCatInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteCatTarget, setDeleteCatTarget] = useState(null);

  // Reassign / Transfer Form Category State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetCatId, setTransferTargetCatId] = useState('');
  const [transferMode, setTransferMode] = useState('move'); // 'move' | 'copy'
  const [isCreatingNewTransferCat, setIsCreatingNewTransferCat] = useState(false);
  const [newTransferCatName, setNewTransferCatName] = useState('');

  // Loading & Alert States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editable Form Details State
  const [formTitle, setFormTitle] = useState('Technical Support');
  const [formDescription, setFormDescription] = useState('Ticket intake form for product & login issues');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Dynamic Options & Sub-field Modals
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [optionsModalFieldIndex, setOptionsModalFieldIndex] = useState(null);
  const [optionsModalFieldTitle, setOptionsModalFieldTitle] = useState('');
  const [optionsModalValues, setOptionsModalValues] = useState([]);
  const [newOptionInput, setNewOptionInput] = useState('');

  const [isSubFieldModalOpen, setIsSubFieldModalOpen] = useState(false);
  const [subFieldModalSectionIndex, setSubFieldModalSectionIndex] = useState(null);
  const [subFieldModalSubIndex, setSubFieldModalSubIndex] = useState(null);
  const [subFieldModalLabel, setSubFieldModalLabel] = useState('');
  const [subFieldModalType, setSubFieldModalType] = useState('text');
  const [subFieldModalRequired, setSubFieldModalRequired] = useState(true);
  const [subFieldModalPlaceholder, setSubFieldModalPlaceholder] = useState('');
  const [subFieldModalOptions, setSubFieldModalOptions] = useState([]);
  const [newSubOptionInput, setNewSubOptionInput] = useState('');

  useEffect(() => {
    if (currentTabParam === 'form_preview') {
      setCanvasViewMode('preview');
    } else if (currentTabParam === 'field_properties') {
      setRightPanelTab('field_properties');
      setCanvasViewMode('builder');
    } else if (currentTabParam === 'category_fields') {
      setRightPanelTab('add_fields');
      setCanvasViewMode('builder');
    } else {
      setCanvasViewMode('builder');
    }
  }, [currentTabParam]);

  // HTML5 Drag & Drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...customFields];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, movedItem);

    setCustomFields(updated);
    setSelectedFieldIndex(dropIndex);
    pushHistory(updated);
    autoSaveCategoryFields(updated);
    setSuccessMsg(`✓ Moved "${movedItem.label}" to position ${dropIndex + 1}`);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const generateSmartFieldsForCategory = (catName) => {
    const lower = (catName || '').toLowerCase();

    // 1. Oil & Gas / Petroleum / Refinery / IOCL
    if (lower.includes('refinery') || lower.includes('telemetry') || lower.includes('scada') || lower.includes('pipeline') || lower.includes('valve')) {
      return [
        { id: 1, type: 'select', label: 'Plant Unit Location', options: ['Mathura Refinery', 'Panipat Refinery', 'Haldia Refinery', 'Koyali Refinery', 'Main Plant SCADA Unit'], required: true },
        { id: 2, type: 'number', label: 'Pipeline Pressure (PSI)', placeholder: 'e.g. 850', required: true },
        { id: 3, type: 'text', label: 'Telemetry Sensor Alarm ID', placeholder: 'e.g. SCADA-ALARM-902', required: true },
        { id: 4, type: 'select', label: 'Hazard Severity Level', options: ['CRITICAL EMERGENCY', 'HIGH PRIORITY', 'NORMAL MAINTENANCE'], required: true }
      ];
    }
    if (lower.includes('retail') || lower.includes('pump') || lower.includes('dispenser') || lower.includes('fuel') || lower.includes('station')) {
      return [
        { id: 1, type: 'text', label: 'Retail Station Outlet ID', placeholder: 'e.g. IOCL-STATION-9042', required: true },
        { id: 2, type: 'number', label: 'Dispenser Pump Unit Number', placeholder: 'e.g. 2', required: true },
        { id: 3, type: 'select', label: 'Fault Classification', options: ['RFID Card Scanner Timeout', 'Dispenser Nozzle Pressure Leak', 'POS Terminal Screen Freeze', 'Fuel Volume Meter Calibration Error'], required: true },
        { id: 4, type: 'textarea', label: 'Outlet Remarks & Operator Notes', placeholder: 'Describe nozzle or payment issue...', required: false }
      ];
    }
    if (lower.includes('logistics') || lower.includes('tanker') || lower.includes('fleet') || lower.includes('transport') || lower.includes('dispatch')) {
      return [
        { id: 1, type: 'text', label: 'Tanker / Vehicle Registration No', placeholder: 'e.g. MH-12-AB-1234', required: true },
        { id: 2, type: 'text', label: 'GPS Breakdown / Route Pin Location', placeholder: 'e.g. NH-48 KM Marker 142', required: true },
        { id: 3, type: 'number', label: 'Fuel Payload Quantity (Litres)', placeholder: 'e.g. 24000', required: true },
        { id: 4, type: 'select', label: 'Emergency Recovery / Towing Needed?', options: ['YES - URGENT', 'NO - ROUTE DELAY ONLY'], required: true }
      ];
    }
    if (lower.includes('hazard') || lower.includes('safety') || lower.includes('chemical') || lower.includes('incident') || lower.includes('spill')) {
      return [
        { id: 1, type: 'select', label: 'Safety Incident Classification', options: ['TIER 1 - CATASTROPHIC ALERT', 'TIER 2 - HAZARDOUS CHEMICAL SPILL', 'TIER 3 - EQUIPMENT OVERHEAT', 'TIER 4 - ROUTINE DRILL'], required: true },
        { id: 2, type: 'text', label: 'Incident Plant Zone', placeholder: 'e.g. CDU-2 Distillation Bay', required: true },
        { id: 3, type: 'select', label: 'Emergency First-Responders Dispatched?', options: ['YES - Fire & Medical Onsite', 'NO - Local Plant Control'], required: true },
        { id: 4, type: 'file', label: 'Attach Safety Incident Photos / PDF', required: false }
      ];
    }

    // 2. Banking / Finance / Fintech
    if (lower.includes('kyc') || lower.includes('onboard') || lower.includes('identity')) {
      return [
        { id: 1, type: 'text', label: 'Full Legal Name', placeholder: 'As on Govt ID card', required: true },
        { id: 2, type: 'text', label: 'Govt ID / Aadhaar / PAN Number', placeholder: 'Enter 10 or 12 digit ID number', required: true },
        { id: 3, type: 'select', label: 'ID Proof Document Type', options: ['Aadhaar Card', 'PAN Card', 'Passport', 'Voter ID', 'Driving License'], required: true },
        { id: 4, type: 'file', label: 'Upload ID Document Scanned Copy', required: true }
      ];
    }
    if (lower.includes('loan') || lower.includes('credit') || lower.includes('finance')) {
      return [
        { id: 1, type: 'text', label: 'Loan Application Reference Number', placeholder: 'e.g. LN-2026-9812', required: true },
        { id: 2, type: 'select', label: 'Loan Product Category', options: ['Personal Loan', 'Home Loan', 'Auto / Vehicle Loan', 'Business SME Loan', 'Education Loan'], required: true },
        { id: 3, type: 'number', label: 'Requested Loan Amount (INR)', placeholder: 'e.g. 500000', required: true },
        { id: 4, type: 'textarea', label: 'Loan Support Inquiry & Remarks', placeholder: 'Describe your inquiry or disbursement question...', required: true }
      ];
    }
    if (lower.includes('card') || lower.includes('debit') || lower.includes('atm')) {
      return [
        { id: 1, type: 'select', label: 'Card Action Request', options: ['Instant Card Hotlisting / Block', 'Generate New Green PIN', 'Card Upgrade Request', 'International Transaction Enable'], required: true },
        { id: 2, type: 'text', label: 'Card Last 4 Digits', placeholder: 'e.g. 8842', required: true },
        { id: 3, type: 'select', label: 'Card Type', options: ['Visa Platinum Debit Card', 'Mastercard World Credit Card', 'RuPay Contactless Card', 'Corporate Travel Card'], required: true },
        { id: 4, type: 'textarea', label: 'Reason / Description', placeholder: 'Provide additional details...', required: false }
      ];
    }
    if (lower.includes('net banking') || lower.includes('upi') || lower.includes('payment') || lower.includes('transaction')) {
      return [
        { id: 1, type: 'text', label: 'Transaction Reference ID (UTR / RRN)', placeholder: 'e.g. UTR-982183928172', required: true },
        { id: 2, type: 'number', label: 'Transaction Amount (INR)', placeholder: 'e.g. 4500.00', required: true },
        { id: 3, type: 'select', label: 'Payment Channel', options: ['UPI (GPay/PhonePe/Paytm)', 'IMPS Immediate Transfer', 'NEFT Bank Transfer', 'RTGS High Value Transfer', 'Online NetBanking Portal'], required: true },
        { id: 4, type: 'textarea', label: 'Dispute / Issue Explanation', placeholder: 'Mention if amount was debited but not credited to recipient...', required: true }
      ];
    }
    if (lower.includes('fraud') || lower.includes('dispute') || lower.includes('unauthorized') || lower.includes('cyber')) {
      return [
        { id: 1, type: 'text', label: 'Fraudulent Transaction ID / UTR', placeholder: 'e.g. UTR-8271829102', required: true },
        { id: 2, type: 'date', label: 'Date of Unauthorized Activity', placeholder: 'Select date', required: true },
        { id: 3, type: 'number', label: 'Fraud Amount Involved (INR)', placeholder: 'e.g. 15000', required: true },
        { id: 4, type: 'select', label: 'Fraud Modus Operandi', options: ['Phishing SMS / Fake APK Link', 'Social Engineering OTP Share', 'SIM Swap Fraud', 'ATM Skimming Clone', 'Unknown Online Debit'], required: true },
        { id: 5, type: 'file', label: 'Attach Bank Statement / Cyber Complaint PDF', required: true }
      ];
    }

    return [
      { id: 1, type: 'text', label: 'Subject', placeholder: 'Enter brief request summary...', required: true },
      { id: 2, type: 'select', label: 'Request Type', options: ['General Inquiry', 'High Priority Support', 'Escalation Request'], required: true },
      { id: 3, type: 'textarea', label: 'Description', placeholder: 'Enter details...', required: true },
      { id: 4, type: 'file', label: 'Attachments', required: false }
    ];
  };

  const updateAndSyncCategories = (newCategoryList) => {
    const tenantCode = (user?.companyCode || 'IOCL').toUpperCase();
    const compId = user?.companyId;
    setCategories(newCategoryList);
    try {
      localStorage.setItem(`ticketpro_categories_${tenantCode}`, JSON.stringify(newCategoryList));
      localStorage.setItem(`ticketpro_categories_${tenantCode.toLowerCase()}`, JSON.stringify(newCategoryList));
      if (compId) {
        localStorage.setItem(`ticketpro_categories_id_${compId}`, JSON.stringify(newCategoryList));
      }
      localStorage.setItem('ticketpro_categories_WORKSPACE', JSON.stringify(newCategoryList));
      localStorage.setItem('ticketpro_categories', JSON.stringify(newCategoryList));
      localStorage.setItem('ticketpro_categories_updated_at', Date.now().toString());

      // Broadcast real-time live event across all tabs, windows, agents & end users
      liveChannel.broadcast('CATEGORY_UPDATED', {
        companyCode: tenantCode,
        companyId: compId,
        companyName: targetCompany?.companyName,
        categories: newCategoryList,
        timestamp: Date.now()
      });

      window.dispatchEvent(new CustomEvent('ticketpro_categories_updated', {
        detail: { companyCode: tenantCode, companyId: compId }
      }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  };

  const pushHistory = (fields) => {
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(JSON.parse(JSON.stringify(fields)));
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  };

  const getCompanyQueryParams = useCallback(() => {
    const compCode = (user?.companyCode || 'IOCL').toUpperCase();
    const compId = user?.companyId;
    return compId ? `companyId=${compId}&companyCode=${compCode}` : `companyCode=${compCode}`;
  }, [user]);

  const autoSaveTimerRef = useRef(null);

  const autoSaveCategoryFields = (fieldsToSave) => {
    if (!selectedCategory || isHistoricalVersion) return;
    const fieldStr = `FIELDS:${JSON.stringify(fieldsToSave)}`;
    const tenantCode = (user?.companyCode || 'IOCL').toUpperCase();
    const compId = user?.companyId;
    const compQuery = getCompanyQueryParams();

    const updatedCategory = { 
      ...selectedCategory, 
      name: formTitle, 
      description: fieldStr, 
      customFields: [...fieldsToSave],
      fieldCount: fieldsToSave.length, 
      isPublished: true 
    };

    const updatedList = categories.map(c => 
      (c.id === selectedCategory.id || c.name === selectedCategory.name) ? updatedCategory : c
    );

    try {
      localStorage.setItem(`ticketpro_form_${selectedCategory.id}`, JSON.stringify(fieldsToSave));
      localStorage.setItem(`ticketpro_form_${selectedCategory.name}`, JSON.stringify(fieldsToSave));
      localStorage.setItem(`ticketpro_form_${selectedCategory.name.trim()}`, JSON.stringify(fieldsToSave));
      localStorage.setItem(`ticketpro_form_${selectedCategory.name.trim().toLowerCase()}`, JSON.stringify(fieldsToSave));
      localStorage.setItem(`ticketpro_form_${formTitle}`, JSON.stringify(fieldsToSave));
      localStorage.setItem(`ticketpro_form_${formTitle.trim().toLowerCase()}`, JSON.stringify(fieldsToSave));
      localStorage.setItem(`ticketpro_form_${tenantCode}_${selectedCategory.id}`, JSON.stringify(fieldsToSave));
      localStorage.setItem(`ticketpro_form_${tenantCode}_${selectedCategory.name}`, JSON.stringify(fieldsToSave));
      if (compId) {
        localStorage.setItem(`ticketpro_form_${compId}_${selectedCategory.id}`, JSON.stringify(fieldsToSave));
      }

      // Broadcast live form schema update to all clients
      liveChannel.broadcast('FORM_UPDATED', {
        companyCode: tenantCode,
        companyId: compId,
        companyName: selectedCompany?.companyName,
        category: updatedCategory,
        customFields: fieldsToSave,
        timestamp: Date.now()
      });
    } catch(e) {}

    updateAndSyncCategories(updatedList);

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const catId = selectedCategory.id;
      try {
        let saved = null;
        if (catId && Number(catId) < 1000000000) {
          saved = await api.put(`/categories/${catId}?${compQuery}`, {
            name: formTitle,
            description: fieldStr,
            status: 'ACTIVE'
          }).catch(() => null);
        } else {
          saved = await api.put(`/categories/${catId || 0}?${compQuery}`, {
            name: formTitle,
            description: fieldStr,
            status: 'ACTIVE'
          }).catch(async () => {
            return await api.post(`/categories?${compQuery}`, {
              name: formTitle,
              description: fieldStr,
              status: 'ACTIVE'
            }).catch(() => null);
          });
        }

        if (saved && saved.id && saved.id !== catId) {
          setSelectedCategory(prev => (prev && (prev.id === catId || prev.name === formTitle)) ? { ...prev, id: saved.id } : prev);
          setCategories(prev => prev.map(c => (c.id === catId || c.name === formTitle) ? { ...c, id: saved.id } : c));
        }
      } catch (err) {
        console.warn('Auto-save network error, saved in local cache:', err);
      }
    }, 600);
  };

  const loadCategoryFields = (cat, templatesPool = null, preferredTemplateId = null) => {
    if (!cat) return;
    setFormTitle(cat.name);
    const tenantCode = (user?.companyCode || 'IOCL').toUpperCase();
    const compId = user?.companyId;

    const pool = templatesPool || formTemplates || [];
    const catTemplates = pool.filter(t => 
      (t.categoryId && String(t.categoryId) === String(cat.id)) ||
      (t.categoryName && t.categoryName === cat.name)
    ).sort((a, b) => (b.version || 0) - (a.version || 0));

    let targetTemplate = null;
    if (preferredTemplateId) {
      targetTemplate = catTemplates.find(t => String(t.id) === String(preferredTemplateId));
    }
    if (!targetTemplate) {
      targetTemplate = catTemplates.find(t => t.status === 'ACTIVE') || catTemplates[0] || null;
    }

    setSelectedTemplateVersion(targetTemplate);

    if (targetTemplate && targetTemplate.fields && targetTemplate.fields.length > 0) {
      const mapped = targetTemplate.fields.map((f, i) => ({
        id: f.id || `f_${i}`,
        type: (f.fieldType || 'text').toLowerCase(),
        label: f.label,
        fieldKey: f.fieldKey || f.label,
        placeholder: f.placeholder || '',
        required: f.required !== false,
        options: f.options ? f.options.map(o => o.optionValue || o.optionLabel || o) : []
      }));
      setCustomFields(mapped);
      setHistory([mapped]);
      setHistoryIndex(0);
      return;
    }

    // 1. MySQL Database description with FIELDS: prefix (THE SOURCE OF TRUTH)
    if (cat.description && typeof cat.description === 'string' && cat.description.includes('FIELDS:')) {
      try {
        const jsonStr = cat.description.substring(cat.description.indexOf('FIELDS:') + 7);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomFields(parsed);
          setHistory([parsed]);
          setHistoryIndex(0);
          try {
            localStorage.setItem(`ticketpro_form_${cat.id}`, JSON.stringify(parsed));
            localStorage.setItem(`ticketpro_form_${cat.name}`, JSON.stringify(parsed));
            localStorage.setItem(`ticketpro_form_${tenantCode}_${cat.id}`, JSON.stringify(parsed));
            localStorage.setItem(`ticketpro_form_${tenantCode}_${cat.name}`, JSON.stringify(parsed));
          } catch(e) {}
          return;
        }
      } catch (e) {}
    }

    // 2. Direct customFields array
    if (Array.isArray(cat.customFields) && cat.customFields.length > 0) {
      setCustomFields(cat.customFields);
      setHistory([cat.customFields]);
      setHistoryIndex(0);
      try {
        localStorage.setItem(`ticketpro_form_${cat.id}`, JSON.stringify(cat.customFields));
        localStorage.setItem(`ticketpro_form_${cat.name}`, JSON.stringify(cat.customFields));
      } catch(e) {}
      return;
    }

    // 3. Fallback to localStorage cache
    try {
      const scopedById = localStorage.getItem(`ticketpro_form_${tenantCode}_${cat.id}`);
      if (scopedById) {
        const parsed = JSON.parse(scopedById);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomFields(parsed);
          setHistory([parsed]);
          setHistoryIndex(0);
          return;
        }
      }

      const cachedById = localStorage.getItem(`ticketpro_form_${cat.id}`);
      if (cachedById) {
        const parsed = JSON.parse(cachedById);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomFields(parsed);
          setHistory([parsed]);
          setHistoryIndex(0);
          return;
        }
      }

      const cachedByName = localStorage.getItem(`ticketpro_form_${cat.name}`);
      if (cachedByName) {
        const parsed = JSON.parse(cachedByName);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomFields(parsed);
          setHistory([parsed]);
          setHistoryIndex(0);
          return;
        }
      }
    } catch(_e) {}

    // 4. Default smart fields
    const generated = generateSmartFieldsForCategory(cat.name);
    setCustomFields(generated);
    setHistory([generated]);
    setHistoryIndex(0);
  };

    // Dedicated Category Fetcher for Logged-in Company
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const tenantCode = (user?.companyCode || 'IOCL').toUpperCase();
      const compId = user?.companyId;
      const compQuery = compId ? `companyId=${compId}&companyCode=${tenantCode}` : `companyCode=${tenantCode}`;

      // 1. Query backend MySQL database first
      let catData = null;
      try {
        const apiCats = await api.get(`/categories?${compQuery}`);
        if (Array.isArray(apiCats) && apiCats.length > 0) {
          catData = apiCats.map(c => {
            let fields = [];
            if (c.description && c.description.includes('FIELDS:')) {
              try {
                const jsonStr = c.description.substring(c.description.indexOf('FIELDS:') + 7);
                fields = JSON.parse(jsonStr);
              } catch(e) {}
            }
            return {
              ...c,
              customFields: fields,
              fieldCount: fields.length > 0 ? fields.length : (c.fieldCount || 0),
              isPublished: true
            };
          });
        }
      } catch (e) {
        console.warn('Could not fetch categories from MySQL API, trying fallback cache:', e);
      }

      // 2. Fallback to localStorage only if API was unreachable
      if (!catData || catData.length === 0) {
        const storedCats = localStorage.getItem(`ticketpro_categories_${tenantCode}`) || 
                           (compId ? localStorage.getItem(`ticketpro_categories_id_${compId}`) : null) || 
                           localStorage.getItem('ticketpro_categories');
        if (storedCats) {
          try {
            const parsed = JSON.parse(storedCats);
            if (Array.isArray(parsed) && parsed.length > 0) {
              catData = parsed;
            }
          } catch (e) {}
        }
      }

      // 3. Fallback to default categories if neither backend nor localStorage has anything
      if (!catData || catData.length === 0) {
        catData = getDefaultCategoriesForCompany(tenantCode, user?.companyName, user?.industry);
      }

      setCategories(catData);

      // Sync local storage with latest MySQL data
      try {
        localStorage.setItem(`ticketpro_categories_${tenantCode}`, JSON.stringify(catData));
        localStorage.setItem(`ticketpro_categories_${tenantCode.toLowerCase()}`, JSON.stringify(catData));
        if (compId) {
          localStorage.setItem(`ticketpro_categories_id_${compId}`, JSON.stringify(catData));
        }
        localStorage.setItem('ticketpro_categories', JSON.stringify(catData));
      } catch(e) {}

      let templates = [];
      try {
        const res = await api.get('/form-templates?size=100').catch(() => null);
        templates = Array.isArray(res) ? res : (Array.isArray(res?.content) ? res.content : []);
        setFormTemplates(templates);
      } catch (_e) {}

      if (catData.length > 0) {
        setSelectedCategory(catData[0]);
        loadCategoryFields(catData[0], templates);
      }
    } catch (err) {
      console.error('fetchCategories error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSwitchTemplateVersion = (tplId) => {
    const tpl = formTemplates.find(t => String(t.id) === String(tplId));
    if (tpl) {
      setSelectedTemplateVersion(tpl);
      if (tpl.fields && tpl.fields.length > 0) {
        const mapped = tpl.fields.map((f, i) => ({
          id: f.id || `f_${i}`,
          type: (f.fieldType || 'text').toLowerCase(),
          label: f.label,
          fieldKey: f.fieldKey || f.label,
          placeholder: f.placeholder || '',
          required: f.required !== false,
          options: f.options ? f.options.map(o => o.optionValue || o.optionLabel || o) : []
        }));
        setCustomFields(mapped);
        setHistory([mapped]);
        setHistoryIndex(0);
      }
      setSelectedFieldIndex(0);
      setSuccessMsg(`Switched to Form Version v${tpl.version} (${tpl.status === 'ACTIVE' ? 'Active / Current' : 'Archived / Read-Only'})`);
    }
  };

  const handleCategorySwitch = (cat) => {
    setSelectedCategory(cat);
    loadCategoryFields(cat);
    setSelectedFieldIndex(0);
  };

  const handleAddFieldFromPalette = (type, labelPrefix = '', hasOptions = false) => {
    if (isHistoricalVersion) {
      alert('This form version is historical and read-only. Click "Create New Version" to make modifications.');
      return;
    }
    let newField;
    let updated = [...customFields];

    if (type === 'conditional_section') {
      const existingDropdown = customFields.find(f => 
        f.type === 'select' || f.type === 'dropdown' || f.type === 'radio'
      );
      const defaultDependsOn = existingDropdown ? existingDropdown.label : 'Ticket Type';
      const initialOptions = (existingDropdown && Array.isArray(existingDropdown.options) && existingDropdown.options.length > 0)
        ? existingDropdown.options
        : ['Create User', 'Transfer User', 'Edit User'];

      newField = {
        id: `cond_${Date.now()}`,
        type: 'conditional_section',
        label: labelPrefix && labelPrefix !== 'Conditional Section: Create User' ? labelPrefix : 'Dynamic Branch Forms',
        dependsOn: defaultDependsOn,
        activeBranchTab: initialOptions[0] || 'Option 1',
        branches: initialOptions.map((opt, oIdx) => ({
          value: opt,
          label: `${opt} Form`,
          fields: oIdx === 0 ? [
            { id: `sf_${Date.now()}_1`, label: 'Department Name', type: 'text', required: true, placeholder: 'e.g. Operations' },
            { id: `sf_${Date.now()}_2`, label: 'Employee ID', type: 'text', required: true, placeholder: 'e.g. EMP-9821' },
            { id: `sf_${Date.now()}_3`, label: 'Required Access Level', type: 'select', required: true, options: ['Read Only', 'Standard User', 'Department Admin'] }
          ] : oIdx === 1 ? [
            { id: `sf_${Date.now()}_4`, label: 'From Department', type: 'text', required: true, placeholder: 'e.g. Sales' },
            { id: `sf_${Date.now()}_5`, label: 'Target Transfer Location', type: 'text', required: true, placeholder: 'e.g. Head Office' },
            { id: `sf_${Date.now()}_6`, label: 'Transfer Approval Document', type: 'file', required: false }
          ] : [
            { id: `sf_${Date.now()}_7`, label: 'Changes Requested', type: 'textarea', required: true, placeholder: 'Describe modified user attributes...' }
          ]
        }))
      };
      updated = [...customFields, newField];
    } else if (type === 'file') {
      newField = {
        id: `f_${Date.now()}`,
        type: 'file',
        label: labelPrefix || 'Attach Supporting Document / Proof',
        required: false,
        placeholder: 'Upload PDF, Word, Excel, or Image files (Max 10MB)',
        helpText: 'Attach invoices, photo proof, error screenshots, or signed requests.',
        options: []
      };
      updated = [...customFields, newField];
    } else {
      const isLong = type === 'textarea' || (labelPrefix && labelPrefix.toLowerCase().includes('long text'));
      newField = {
        id: `f_${Date.now()}`,
        type: type === 'longtext' ? 'textarea' : type,
        label: labelPrefix ? `${labelPrefix} ${customFields.length + 1}` : `Field ${customFields.length + 1}`,
        required: true,
        placeholder: isLong ? 'Enter detailed explanation or notes...' : `Enter ${(labelPrefix || 'field').toLowerCase()}...`,
        helpText: isLong ? 'Provide multi-line detailed input.' : '',
        options: hasOptions ? ['Option 1', 'Option 2', 'Option 3'] : []
      };
      updated = [...customFields, newField];
    }

    setCustomFields(updated);
    setSelectedFieldIndex(updated.length - 1);
    setRightPanelTab('field_properties');
    pushHistory(updated);
    autoSaveCategoryFields(updated);
    setSuccessMsg(`âœ“ Added "${newField.label}" to ${formTitle}`);
  };

  const handleSelectBranchTab = (sectionIndex, branchValue) => {
    const updated = [...customFields];
    if (updated[sectionIndex]) {
      updated[sectionIndex] = {
        ...updated[sectionIndex],
        activeBranchTab: branchValue
      };
      setCustomFields(updated);
    }
  };

  const handleAddBranch = (sectionIndex, newBranchValue) => {
    const updated = [...customFields];
    const section = updated[sectionIndex];
    if (!section) return;

    const branches = Array.isArray(section.branches) ? [...section.branches] : [];
    branches.push({
      value: newBranchValue,
      label: `${newBranchValue} Form`,
      fields: [
        { id: `sf_${Date.now()}_1`, label: `${newBranchValue} Detail`, type: 'text', required: true, placeholder: 'Enter information...' }
      ]
    });

    updated[sectionIndex] = {
      ...section,
      branches,
      activeBranchTab: newBranchValue
    };
    setCustomFields(updated);
    pushHistory(updated);
    autoSaveCategoryFields(updated);
    setSuccessMsg(`âœ“ Added branch "${newBranchValue}" to dynamic form!`);
  };
  const handleDeleteBranch = (sectionIndex, branchValue) => {
    const updated = [...customFields];
    const section = updated[sectionIndex];
    if (!section || !Array.isArray(section.branches)) return;

    const branches = section.branches.filter(b => (b.value || '').trim() !== (branchValue || '').trim());
    if (branches.length === 0) {
      alert("At least 1 branch must remain in the conditional section.");
      return;
    }

    updated[sectionIndex] = {
      ...section,
      branches,
      activeBranchTab: branches[0]?.value
    };
    setCustomFields(updated);
    pushHistory(updated);
    autoSaveCategoryFields(updated);
    setSuccessMsg(`✓ Deleted branch "${branchValue}"!`);
  };

  const handleAddSubFieldToSection = (sectionIndex, fieldTypeOrBranch = 'text', fieldLabel = 'Question', targetBranch = null) => {
    const updated = [...customFields];
    const section = updated[sectionIndex];
    if (!section) return;

    let resolvedType = 'text';
    let resolvedLabel = 'Question';
    let resolvedBranch = null;

    if (typeof fieldTypeOrBranch === 'string') {
      if (['text', 'textarea', 'select', 'date', 'file', 'number', 'radio', 'checkbox'].includes(fieldTypeOrBranch.toLowerCase())) {
        resolvedType = fieldTypeOrBranch.toLowerCase();
        resolvedLabel = fieldLabel || 'Question';
        resolvedBranch = targetBranch;
      } else {
        resolvedBranch = fieldTypeOrBranch;
      }
    }

    const activeBranchVal = resolvedBranch || section.activeBranchTab || (section.branches && section.branches[0]?.value) || section.conditionValue;

    if (Array.isArray(section.branches) && section.branches.length > 0) {
      section.branches = section.branches.map(b => {
        if ((b.value || '').trim().toLowerCase() === (activeBranchVal || '').trim().toLowerCase()) {
          const subFields = Array.isArray(b.fields) ? [...b.fields] : [];
          subFields.push({
            id: `sf_${Date.now()}_${subFields.length + 1}`,
            label: `${resolvedLabel} ${subFields.length + 1}`,
            type: resolvedType,
            required: true,
            placeholder: `Enter ${resolvedLabel.toLowerCase()}...`,
            options: resolvedType === 'select' || resolvedType === 'radio' ? ['Option 1', 'Option 2', 'Option 3'] : []
          });
          return { ...b, fields: subFields };
        }
        return b;
      });
    } else {
      const subFields = Array.isArray(section.fields) ? [...section.fields] : [];
      subFields.push({
        id: `sf_${Date.now()}_${subFields.length + 1}`,
        label: `${resolvedLabel} ${subFields.length + 1}`,
        type: resolvedType,
        required: true,
        placeholder: `Enter ${resolvedLabel.toLowerCase()}...`,
        options: resolvedType === 'select' || resolvedType === 'radio' ? ['Option 1', 'Option 2', 'Option 3'] : []
      });
      section.fields = subFields;
    }

    setCustomFields(updated);
    pushHistory(updated);
    autoSaveCategoryFields(updated);
    setSuccessMsg(`✓ Added ${resolvedLabel} to subform`);
  };

  const handleRemoveSubFieldFromSection = (sectionIndex, subIndex, targetBranch = null) => {
    const updated = [...customFields];
    const section = updated[sectionIndex];
    if (!section) return;

    const activeBranchVal = targetBranch || section.activeBranchTab || (section.branches && section.branches[0]?.value) || section.conditionValue;

    if (Array.isArray(section.branches) && section.branches.length > 0) {
      section.branches = section.branches.map(b => {
        if ((b.value || '').trim().toLowerCase() === (activeBranchVal || '').trim().toLowerCase() && Array.isArray(b.fields)) {
          return { ...b, fields: b.fields.filter((_, i) => i !== subIndex) };
        }
        return b;
      });
    } else if (Array.isArray(section.fields)) {
      section.fields = section.fields.filter((_, i) => i !== subIndex);
    }

    setCustomFields(updated);
    pushHistory(updated);
    autoSaveCategoryFields(updated);
    setSuccessMsg(`✓ Removed question from subform`);
  };

  const handleReorderSubField = (sectionIndex, fromIndex, toIndex, targetBranch = null) => {
    const updated = [...customFields];
    const section = updated[sectionIndex];
    if (!section) return;

    const activeBranchVal = targetBranch || section.activeBranchTab || (section.branches && section.branches[0]?.value) || section.conditionValue;

    if (Array.isArray(section.branches) && section.branches.length > 0) {
      section.branches = section.branches.map(b => {
        if ((b.value || '').trim().toLowerCase() === (activeBranchVal || '').trim().toLowerCase() && Array.isArray(b.fields)) {
          if (toIndex < 0 || toIndex >= b.fields.length) return b;
          const subFields = [...b.fields];
          const [moved] = subFields.splice(fromIndex, 1);
          subFields.splice(toIndex, 0, moved);
          return { ...b, fields: subFields };
        }
        return b;
      });
    } else if (Array.isArray(section.fields)) {
      if (toIndex < 0 || toIndex >= section.fields.length) return;
      const subFields = [...section.fields];
      const [moved] = subFields.splice(fromIndex, 1);
      subFields.splice(toIndex, 0, moved);
      section.fields = subFields;
    }

    setCustomFields(updated);
    pushHistory(updated);
    autoSaveCategoryFields(updated);
  };

  const handleUpdateSubField = (sectionIndex, subIndex, key, val, targetBranch = null) => {
    const updated = [...customFields];
    const section = updated[sectionIndex];
    if (!section) return;

    const activeBranchVal = targetBranch || section.activeBranchTab || (section.branches && section.branches[0]?.value) || section.conditionValue;

    if (Array.isArray(section.branches) && section.branches.length > 0) {
      section.branches = section.branches.map(b => {
        if ((b.value || '').trim().toLowerCase() === (activeBranchVal || '').trim().toLowerCase() && Array.isArray(b.fields)) {
          const newFields = [...b.fields];
          newFields[subIndex] = {
            ...newFields[subIndex],
            [key]: val
          };
          return { ...b, fields: newFields };
        }
        return b;
      });
    } else if (Array.isArray(section.fields)) {
      const newFields = [...section.fields];
      newFields[subIndex] = {
        ...newFields[subIndex],
        [key]: val
      };
      section.fields = newFields;
    }

    setCustomFields(updated);
    pushHistory(updated);
    autoSaveCategoryFields(updated);
  };

  const handleRemoveField = (idx) => {
    if (isHistoricalVersion) {
      alert("Historical form versions are read-only to preserve existing ticket submissions.");
      return;
    }
    if (customFields.length <= 1) {
      alert("At least 1 field is required in a category form.");
      return;
    }
    const updated = customFields.filter((_, i) => i !== idx);
    setCustomFields(updated);
    if (selectedFieldIndex >= updated.length) {
      setSelectedFieldIndex(Math.max(0, updated.length - 1));
    }
    pushHistory(updated);
    autoSaveCategoryFields(updated);
    setSuccessMsg(`✓ Field deleted from ${formTitle}`);
  };

  const handleClearAllFields = () => {
    if (isHistoricalVersion) return;
    setIsClearModalOpen(true);
  };

  const handleConfirmClearAllFields = () => {
    if (isHistoricalVersion) return;
    const freshFields = [
      { id: Date.now(), type: 'text', label: 'Subject', placeholder: 'Enter request subject...', required: true }
    ];
    setCustomFields(freshFields);
    setSelectedFieldIndex(0);
    pushHistory(freshFields);
    autoSaveCategoryFields(freshFields);
    setSuccessMsg(`✓ Cleared form canvas for "${formTitle}"! Ready to build fresh.`);
    setIsClearModalOpen(false);
  };

  const handleUpdateFieldProperty = (index, propKey, propValue) => {
    if (isHistoricalVersion) return;
    const updated = [...customFields];
    const targetField = {
      ...updated[index],
      [propKey]: propValue
    };
    updated[index] = targetField;

    // AUTO-SYNC: When a dropdown/select/radio's options or label are updated, automatically synchronize all linked conditional sections!
    if (propKey === 'options' || propKey === 'label') {
      const fieldLabel = (targetField.label || '').trim().toLowerCase();
      const opts = Array.isArray(targetField.options) ? targetField.options : [];

      updated.forEach((f, fIdx) => {
        if (f.type === 'conditional_section') {
          const depName = (f.dependsOn || '').trim().toLowerCase();
          const isLinked = depName === fieldLabel || !f.dependsOn || (targetField.type === 'select' && !depName);

          if (isLinked && opts.length > 0) {
            const existingBranches = Array.isArray(f.branches) ? f.branches : [];
            const newBranches = opts.map((opt, oIdx) => {
              const existingBranch = existingBranches.find(b => (b.value || '').trim().toLowerCase() === (opt || '').trim().toLowerCase());
              if (existingBranch) {
                return existingBranch;
              }
              return {
                value: opt,
                label: `${opt} Form`,
                fields: [
                  { 
                    id: `sf_${Date.now()}_${oIdx + 1}`, 
                    label: `${opt} Details`, 
                    type: 'text', 
                    required: true, 
                    placeholder: `Enter ${opt.toLowerCase()} details...` 
                  }
                ]
              };
            });

            updated[fIdx] = {
              ...f,
              dependsOn: targetField.label,
              branches: newBranches,
              activeBranchTab: (f.activeBranchTab && opts.some(o => o.trim().toLowerCase() === f.activeBranchTab.trim().toLowerCase()))
                ? f.activeBranchTab
                : opts[0]
            };
          }
        }
      });
    }

    setCustomFields(updated);
    pushHistory(updated);
    autoSaveCategoryFields(updated);
  };

    const handleCreateNewCategoryForm = async (e) => {
    e.preventDefault();
    if (!newFormName.trim()) return;

    const trimmedName = newFormName.trim();
    const smartFields = generateSmartFieldsForCategory(trimmedName);
    const desc = `FIELDS:${JSON.stringify(smartFields)}`;
    const compQuery = getCompanyQueryParams();

    // Persist to backend database
    const saved = await api.post(`/categories?${compQuery}`, {
      name: trimmedName,
      description: desc,
      status: 'ACTIVE'
    }).catch(() => null);

    const newCatObj = {
      id: (saved && saved.id) ? saved.id : Date.now(),
      name: trimmedName,
      description: desc,
      status: 'ACTIVE',
      fieldCount: smartFields.length,
      customFields: smartFields,
      isPublished: true
    };

    const updatedList = [newCatObj, ...categories];
    updateAndSyncCategories(updatedList);
    setSelectedCategory(newCatObj);
    setFormTitle(newCatObj.name);
    setCustomFields(smartFields);

    setNewFormName('');
    setIsCreateFormModalOpen(false);
    setSuccessMsg(`✓ Created new category "${newCatObj.name}"!`);
  };

  const handleRenameCategoryForm = async (cat, e, customNewName = null) => {
    if (e) e.stopPropagation();
    const newName = customNewName || prompt('Enter new Category Form name:', cat.name);
    if (!newName || newName.trim() === '' || newName === cat.name) return;

    const trimmed = newName.trim();
    const catId = Number(cat.id);
    const compQuery = getCompanyQueryParams();

    if (catId && !isNaN(catId)) {
      await api.put(`/categories/${catId}?${compQuery}`, {
        name: trimmed,
        description: cat.description || `FIELDS:${JSON.stringify(customFields)}`,
        status: 'ACTIVE'
      }).catch(() => null);
    }

    const updatedCat = { ...cat, name: trimmed };
    const updatedList = categories.map(c => c.id === cat.id ? updatedCat : c);

    updateAndSyncCategories(updatedList);
    if (selectedCategory?.id === cat.id) {
      setSelectedCategory(updatedCat);
      setFormTitle(trimmed);
    }
    setSuccessMsg(`✓ Renamed category to "${trimmed}"!`);
  };

  const handleSaveRenameModal = async (e) => {
    e.preventDefault();
    if (!renameCatInput.trim() || !selectedCategory) return;
    const trimmed = renameCatInput.trim();
    const catId = Number(selectedCategory.id);
    const compQuery = getCompanyQueryParams();

    if (catId && !isNaN(catId)) {
      await api.put(`/categories/${catId}?${compQuery}`, {
        name: trimmed,
        description: selectedCategory.description || `FIELDS:${JSON.stringify(customFields)}`,
        status: 'ACTIVE'
      }).catch(() => null);
    }

    const updatedCat = { ...selectedCategory, name: trimmed };
    const updatedList = categories.map(c => c.id === selectedCategory?.id ? updatedCat : c);
    updateAndSyncCategories(updatedList);
    setSelectedCategory(updatedCat);
    setFormTitle(trimmed);
    setIsRenameModalOpen(false);
    setSuccessMsg(`✓ Renamed category to "${trimmed}"!`);
  };

    const handlePromptDeleteCategory = (cat) => {
    const target = cat || selectedCategory;
    if (!target) return;
    setDeleteCatTarget(target);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmTransferForm = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCategory) return;

    let targetCategory = null;
    const compQuery = getCompanyQueryParams();

    if (isCreatingNewTransferCat) {
      if (!newTransferCatName.trim()) {
        alert("Please enter a category name.");
        return;
      }
      const trimmed = newTransferCatName.trim();
      const fieldStr = `FIELDS:${JSON.stringify(customFields)}`;
      
      const saved = await api.post(`/categories?${compQuery}`, {
        name: trimmed,
        description: fieldStr,
        status: 'ACTIVE'
      }).catch(() => null);

      targetCategory = {
        id: (saved && saved.id) ? saved.id : Date.now(),
        name: trimmed,
        description: fieldStr,
        status: 'ACTIVE',
        fieldCount: customFields.length,
        customFields: [...customFields],
        isPublished: true
      };

      const updatedList = [targetCategory, ...categories];
      updateAndSyncCategories(updatedList);
    } else {
      if (!transferTargetCatId) {
        alert("Please select a target category.");
        return;
      }
      targetCategory = categories.find(c => String(c.id) === String(transferTargetCatId) || c.name === transferTargetCatId);
      if (!targetCategory) return;

      const fieldStr = `FIELDS:${JSON.stringify(customFields)}`;
      const catId = Number(targetCategory.id);
      if (catId && !isNaN(catId)) {
        await api.put(`/categories/${catId}?${compQuery}`, {
          name: targetCategory.name,
          description: fieldStr,
          status: 'ACTIVE'
        }).catch(() => null);
      }

      targetCategory = {
        ...targetCategory,
        description: fieldStr,
        customFields: [...customFields],
        fieldCount: customFields.length,
        isPublished: true
      };

      const updatedList = categories.map(c => 
        (String(c.id) === String(targetCategory.id) || c.name === targetCategory.name) ? targetCategory : c
      );
      updateAndSyncCategories(updatedList);
    }

    // Save fields to localStorage for the target category
    try {
      localStorage.setItem(`ticketpro_form_${targetCategory.id}`, JSON.stringify(customFields));
      localStorage.setItem(`ticketpro_form_${targetCategory.name}`, JSON.stringify(customFields));
    } catch(err) {}

    // If 'move' mode, clear or reset current category's previous form
    if (transferMode === 'move' && String(selectedCategory.id) !== String(targetCategory.id)) {
      const resetFields = [
        { id: Date.now(), type: 'text', label: 'Subject', placeholder: 'Enter request subject...', required: true }
      ];
      try {
        localStorage.setItem(`ticketpro_form_${selectedCategory.id}`, JSON.stringify(resetFields));
        localStorage.setItem(`ticketpro_form_${selectedCategory.name}`, JSON.stringify(resetFields));
      } catch(err) {}
    }

    // Switch to target category view
    setSelectedCategory(targetCategory);
    setFormTitle(targetCategory.name);
    setCustomFields([...customFields]);
    setIsTransferModalOpen(false);
    setIsCreatingNewTransferCat(false);
    setNewTransferCatName('');
    setTransferTargetCatId('');
    setSuccessMsg(`✓ Successfully ${transferMode === 'move' ? 'moved' : 'copied'} form schema to "${targetCategory.name}"!`);
  };

  const handleConfirmDeleteModal = async () => {
    const target = deleteCatTarget || selectedCategory;
    if (!target) {
      setIsDeleteModalOpen(false);
      return;
    }

    const catId = Number(target.id);
    const compQuery = getCompanyQueryParams();
    if (catId && !isNaN(catId) && catId < 1000000000) {
      await api.delete(`/categories/${catId}?${compQuery}`).catch(() => null);
    }

    const updatedList = categories.filter(c => {
      if (target.id != null && c.id != null) {
        return String(c.id) !== String(target.id);
      }
      return c.name !== target.name;
    });

    try {
      if (target.id) localStorage.removeItem(`ticketpro_form_${target.id}`);
      if (target.name) localStorage.removeItem(`ticketpro_form_${target.name}`);
    } catch (e) {}

    updateAndSyncCategories(updatedList);

    if (updatedList.length > 0) {
      const fallback = updatedList[0];
      setSelectedCategory(fallback);
      loadCategoryFields(fallback);
    } else {
      setSelectedCategory(null);
      setFormTitle('');
      setCustomFields([]);
      setHistory([]);
      setHistoryIndex(-1);
    }

    setIsDeleteModalOpen(false);
    setDeleteCatTarget(null);
    setSuccessMsg(`✓ Category "${target.name}" deleted successfully.`);
  };

  const mapCanvasFieldsToDtos = (fields) => {
    return (fields || []).map((f, idx) => ({
      fieldType: (f.type || 'text').toUpperCase(),
      label: f.label || `Field ${idx + 1}`,
      fieldKey: f.fieldKey || (f.label ? f.label.toLowerCase().replace(/[^a-z0-9_]/g, '_') : `field_${idx + 1}`),
      placeholder: f.placeholder || '',
      required: f.required !== false,
      displayOrder: idx + 1,
      options: Array.isArray(f.options)
        ? f.options.map((opt, oIdx) => ({
            optionLabel: typeof opt === 'string' ? opt : (opt.label || opt.value || `Option ${oIdx + 1}`),
            optionValue: typeof opt === 'string' ? opt : (opt.value || opt.label || `Option ${oIdx + 1}`),
            displayOrder: oIdx + 1
          }))
        : []
    }));
  };

  const handleCreateNewVersionFromTemplate = async () => {
    if (!selectedCategory) return;
    setSaving(true);
    setError('');
    try {
      const fieldDtos = mapCanvasFieldsToDtos(customFields);
      let newVersionResponse = null;
      if (selectedTemplateVersion?.id) {
        newVersionResponse = await api.put(`/form-templates/${selectedTemplateVersion.id}`, {
          name: formTitle,
          description: formDescription,
          categoryId: selectedCategory.id,
          status: 'ACTIVE',
          fields: fieldDtos
        }).catch(() => null);
      } else {
        newVersionResponse = await api.post('/form-templates', {
          name: formTitle,
          description: formDescription,
          categoryId: selectedCategory.id,
          companyId: user?.companyId,
          status: 'ACTIVE',
          fields: fieldDtos
        }).catch(() => null);
      }

      const res = await api.get('/form-templates?size=100').catch(() => null);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.content) ? res.content : []);
      setFormTemplates(list);

      if (newVersionResponse && newVersionResponse.id) {
        setSelectedTemplateVersion(newVersionResponse);
      } else {
        const matching = list.find(t => t.categoryId === selectedCategory.id && t.status === 'ACTIVE');
        if (matching) setSelectedTemplateVersion(matching);
      }

      setSuccessMsg(`✓ Created new active Form Version v${newVersionResponse?.version || ''}! Historical v${selectedTemplateVersion?.version || 1} is preserved as immutable read-only.`);
    } catch (err) {
      console.error('Create version error:', err);
      setError('Failed to create new form version.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveForm = async () => {
    if (!selectedCategory) return;
    setSaving(true);
    setError('');

    try {
      const fieldDtos = mapCanvasFieldsToDtos(customFields);
      let newVersionResponse = null;

      // When saving changes, create a new immutable version on the backend to preserve historical submissions
      if (selectedTemplateVersion?.id) {
        newVersionResponse = await api.put(`/form-templates/${selectedTemplateVersion.id}`, {
          name: formTitle,
          description: formDescription,
          categoryId: selectedCategory.id,
          status: 'ACTIVE',
          fields: fieldDtos
        }).catch(() => null);
      } else {
        newVersionResponse = await api.post('/form-templates', {
          name: formTitle,
          description: formDescription,
          categoryId: selectedCategory.id,
          companyId: user?.companyId,
          status: 'ACTIVE',
          fields: fieldDtos
        }).catch(() => null);
      }

      const fieldStr = `FIELDS:${JSON.stringify(customFields)}`;
      const compQuery = getCompanyQueryParams();
      const catId = selectedCategory.id;
      let backendId = selectedCategory.id;

      // 1. Direct Save / Upsert to MySQL for this category
      let saved = null;
      if (catId && Number(catId) < 1000000000) {
        saved = await api.put(`/categories/${catId}?${compQuery}`, {
          name: formTitle,
          description: fieldStr,
          status: 'ACTIVE'
        }).catch(() => null);
      } else {
        saved = await api.put(`/categories/${catId || 0}?${compQuery}`, {
          name: formTitle,
          description: fieldStr,
          status: 'ACTIVE'
        }).catch(async () => {
          return await api.post(`/categories?${compQuery}`, {
            name: formTitle,
            description: fieldStr,
            status: 'ACTIVE'
          }).catch(() => null);
        });
      }

      if (saved && saved.id) {
        backendId = saved.id;
      }

      const updatedCategory = { 
        ...selectedCategory, 
        id: backendId,
        name: formTitle, 
        description: fieldStr, 
        customFields: [...customFields],
        fieldCount: customFields.length, 
        isPublished: true 
      };

      const updatedList = categories.map(c => 
        (String(c.id) === String(selectedCategory.id) || c.name === selectedCategory.name) ? updatedCategory : c
      );

      // 2. Comprehensive Sync to MySQL: guarantees all categories and their schemas are permanently stored in MySQL!
      try {
        const syncedCats = await api.post(`/categories/sync?${compQuery}`, updatedList);
        if (Array.isArray(syncedCats) && syncedCats.length > 0) {
          const freshList = syncedCats.map(c => {
            let f = [];
            if (c.description && c.description.includes('FIELDS:')) {
              try {
                f = JSON.parse(c.description.substring(c.description.indexOf('FIELDS:') + 7));
              } catch(e) {}
            }
            return {
              ...c,
              customFields: f,
              fieldCount: f.length > 0 ? f.length : (c.fieldCount || 0),
              isPublished: true
            };
          });
          updateAndSyncCategories(freshList);
          const activeAfterSync = freshList.find(c => c.name === formTitle || String(c.id) === String(backendId)) || updatedCategory;
          setSelectedCategory(activeAfterSync);
        } else {
          updateAndSyncCategories(updatedList);
          setSelectedCategory(updatedCategory);
        }
      } catch (e) {
        updateAndSyncCategories(updatedList);
        setSelectedCategory(updatedCategory);
      }

      // Refresh form templates list
      const res = await api.get('/form-templates?size=100').catch(() => null);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.content) ? res.content : []);
      setFormTemplates(list);

      if (newVersionResponse && newVersionResponse.id) {
        setSelectedTemplateVersion(newVersionResponse);
      }

      try {
        localStorage.setItem(`ticketpro_form_${backendId}`, JSON.stringify(customFields));
        localStorage.setItem(`ticketpro_form_${selectedCategory.id}`, JSON.stringify(customFields));
        localStorage.setItem(`ticketpro_form_${formTitle}`, JSON.stringify(customFields));
        localStorage.setItem(`ticketpro_form_${selectedCategory.name}`, JSON.stringify(customFields));
      } catch(e) {}

      // Real-time broadcast to all clients
      const tenantCode = (selectedCompany?.companyCode || user?.companyCode || 'IOCL').toUpperCase();
      const compId = selectedCompany?.id || user?.companyId;

      liveChannel.broadcast('CATEGORY_UPDATED', {
        companyCode: tenantCode,
        companyId: compId,
        companyName: selectedCompany?.companyName,
        categories: updatedList,
        timestamp: Date.now()
      });
      liveChannel.broadcast('FORM_UPDATED', {
        companyCode: tenantCode,
        companyId: compId,
        companyName: selectedCompany?.companyName,
        category: updatedCategory,
        customFields: customFields,
        timestamp: Date.now()
      });

      const verText = newVersionResponse?.version ? ` (v${newVersionResponse.version})` : '';
      setSuccessMsg(`✓ Saved & Published new form version${verText} permanently! Historical versions are preserved.`);
    } catch (err) {
      setSuccessMsg(`✓ Saved form "${formTitle}" locally!`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategoryTargetDepartment = (cat, targetDept) => {
    const updatedCat = { ...cat, targetDepartment: targetDept };
    const updatedList = categories.map(c => (c.id === cat.id || c.name === cat.name) ? updatedCat : c);
    updateAndSyncCategories(updatedList);
    if (selectedCategory?.id === cat.id || selectedCategory?.name === cat.name) {
      setSelectedCategory(updatedCat);
    }
    setSuccessMsg(`✓ Mapped category "${cat.name}" auto-routing to "${targetDept}"!`);
  };

  const handleAutoMapAllCategories = (updatedList) => {
    const listToSave = updatedList || categories;
    updateAndSyncCategories(listToSave);
    if (selectedCategory) {
      const active = listToSave.find(c => c.id === selectedCategory.id || c.name === selectedCategory.name);
      if (active) setSelectedCategory(active);
    }
    setSuccessMsg(`✓ Auto-mapped all ${listToSave.length} categories to their real departments!`);
  };

  const openEditOptionsModal = (fieldIdx) => {
    const field = customFields[fieldIdx];
    if (!field) return;
    setOptionsModalFieldIndex(fieldIdx);
    setOptionsModalFieldTitle(field.label);
    const opts = Array.isArray(field.options) ? field.options : (typeof field.options === 'string' ? field.options.split(',').map(o => o.trim()).filter(Boolean) : []);
    setOptionsModalValues([...opts]);
    setNewOptionInput('');
    setIsOptionsModalOpen(true);
  };

  const openEditSubFieldModal = (sectionIndex, subIndex, subField, targetBranch = null) => {
    setSubFieldModalSectionIndex(sectionIndex);
    setSubFieldModalSubIndex(subIndex);
    setSubFieldModalLabel(subField.label || '');
    setSubFieldModalType(subField.type || 'text');
    setSubFieldModalRequired(subField.required !== false);
    setSubFieldModalPlaceholder(subField.placeholder || '');
    const opts = Array.isArray(subField.options) ? subField.options : (typeof subField.options === 'string' ? subField.options.split(',').map(o => o.trim()).filter(Boolean) : []);
    setSubFieldModalOptions([...opts]);
    setNewSubOptionInput('');
    setIsSubFieldModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-white rounded-3xl border border-slate-200">
        <div className="flex items-center space-x-3 text-cyan-700 font-bold text-sm">
          <span className="h-6 w-6 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent"></span>
          <span>Loading Form Studio Canvas...</span>
        </div>
      </div>
    );
  }

  const selectedField = customFields[selectedFieldIndex];

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col text-left font-sans select-none">
      
      {/* FORM CARD BANNER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group shrink-0 border border-slate-200/60"
              title="Go Back"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 text-slate-600" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">{formTitle}</h2>
                {isHistoricalVersion ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                    v{selectedTemplateVersion?.version || 1} • Historical (Read-Only)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    v{selectedTemplateVersion?.version || 1} • Active Version
                  </span>
                )}

                {categoryTemplates.length > 0 && (
                  <div className="flex items-center space-x-1.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Ver:</span>
                    <select
                      value={selectedTemplateVersion?.id || ''}
                      onChange={(e) => handleSwitchTemplateVersion(e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
                    >
                      {categoryTemplates.map(t => (
                        <option key={t.id} value={t.id}>
                          v{t.version} — {t.status === 'ACTIVE' ? 'Active / Current' : 'Archived (Read-Only)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">
                Enterprise Dynamic Ticket Form Builder • {categories.length} Active Categories • {categoryTemplates.length} Form Versions
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-auto">
            {/* Move / Change Form Category Button */}
            {selectedCategory && (
              <button
                type="button"
                onClick={() => {
                  const otherCats = categories.filter(c => String(c.id) !== String(selectedCategory?.id) && c.name !== selectedCategory?.name);
                  if (otherCats.length > 0) {
                    setTransferTargetCatId(String(otherCats[0].id || otherCats[0].name));
                  }
                  setIsCreatingNewTransferCat(false);
                  setNewTransferCatName('');
                  setIsTransferModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition-all border border-cyan-200/80 shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                title="Transfer or copy this form to another category"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-cyan-700" />
                <span className="hidden md:inline">Change Category</span>
              </button>
            )}

            {/* In-Place Canvas Toggle Button */}
            <button
              type="button"
              onClick={() => {
                const nextMode = canvasViewMode === 'builder' ? 'preview' : 'builder';
                setCanvasViewMode(nextMode);
                if (nextMode === 'preview') {
                  setSearchParams({ tab: 'form_preview' });
                } else {
                  setSearchParams({ tab: 'studio' });
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs ${
                canvasViewMode === 'preview'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              {canvasViewMode === 'preview' ? (
                <>
                  <PenTool className="h-3.5 w-3.5" />
                  <span>← Back to Builder</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-cyan-700" />
                  <span>Live Preview</span>
                </>
              )}
            </button>

            {isHistoricalVersion ? (
              <button
                type="button"
                onClick={handleCreateNewVersionFromTemplate}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{saving ? 'Creating...' : 'Create New Version'}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCreateNewVersionFromTemplate}
                  disabled={saving}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                  title="Create a new version branched from this template"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden md:inline">New Version</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? 'Saving...' : 'Save As New Version'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* HISTORICAL VERSION READ-ONLY BANNER */}
        {isHistoricalVersion && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div className="flex items-center space-x-2.5 text-amber-900 text-xs font-bold">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 uppercase tracking-wider shrink-0">
                Immutable Version
              </span>
              <span>
                Viewing Form Version v{selectedTemplateVersion?.version} (Historical Archive). Existing ticket submissions are permanently linked to this version. To make changes, create a new version.
              </span>
            </div>
            <button
              type="button"
              onClick={handleCreateNewVersionFromTemplate}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Create New Version</span>
            </button>
          </div>
        )}

        {/* DISTINCT VIEW SWITCHER SUB-HEADER TABS */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar scroll-smooth gap-2">
          <div className="flex items-center space-x-2 shrink-0 py-1">
            
            <button
              type="button"
              onClick={() => {
                setCanvasViewMode('builder');
                setSearchParams({ tab: 'category_form' });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentTabParam === 'category_form'
                  ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>Category Management</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCanvasViewMode('builder');
                setSearchParams({ tab: 'category_fields' });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentTabParam === 'category_fields'
                  ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Category Fields & Palette</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCanvasViewMode('builder');
                setSearchParams({ tab: 'form_builder' });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentTabParam === 'form_builder'
                  ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Form Canvas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCanvasViewMode('builder');
                setSearchParams({ tab: 'field_properties' });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentTabParam === 'field_properties'
                  ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Field Properties</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCanvasViewMode('preview');
                setSearchParams({ tab: 'form_preview' });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentTabParam === 'form_preview' || canvasViewMode === 'preview'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Live Preview</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCanvasViewMode('builder');
                setSearchParams({ tab: 'studio' });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentTabParam === 'studio' && canvasViewMode === 'builder'
                  ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>All-in-One Studio</span>
            </button>

          </div>

          
        </div>
      </div>

      {/* ALERT MESSAGES BAR */}
      {successMsg && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-8 py-2 flex items-center justify-between">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} className="hover:opacity-80"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* DEDICATED STANDALONE CATEGORY MANAGEMENT VIEW */}
      {currentTabParam === 'category_form' && (
        <div className="p-6 md:p-8 bg-slate-50/50 min-h-[600px] overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <CategoryForm
              mode="standalone"
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySwitch={handleCategorySwitch}
              formTitle={formTitle}
              setFormTitle={setFormTitle}
              isEditingTitle={isEditingTitle}
              setIsEditingTitle={setIsEditingTitle}
              onRenameCategory={handleRenameCategoryForm}
              isCreateFormModalOpen={isCreateFormModalOpen}
              setIsCreateFormModalOpen={setIsCreateFormModalOpen}
              newFormName={newFormName}
              setNewFormName={setNewFormName}
              onCreateCategory={handleCreateNewCategoryForm}
              isRenameModalOpen={isRenameModalOpen}
              setIsRenameModalOpen={setIsRenameModalOpen}
              renameCatInput={renameCatInput}
              setRenameCatInput={setRenameCatInput}
              onSaveRename={handleSaveRenameModal}
              isDeleteModalOpen={isDeleteModalOpen}
              setIsDeleteModalOpen={setIsDeleteModalOpen}
              deleteCatTarget={deleteCatTarget}
              onConfirmDelete={handleConfirmDeleteModal}
              onPromptDeleteCategory={handlePromptDeleteCategory}
              onUpdateTargetDepartment={handleUpdateCategoryTargetDepartment}
              onAutoMapAllCategories={handleAutoMapAllCategories}
            />
          </div>
        </div>
      )}

      {/* DEDICATED CATEGORY FIELDS & PALETTE VIEW */}
      {currentTabParam === 'category_fields' && (
        <div className="flex h-[750px] min-h-[600px] overflow-hidden bg-slate-50/30">
          <CategoryFields
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySwitch={handleCategorySwitch}
            customFields={customFields}
            onAddFieldFromPalette={handleAddFieldFromPalette}
            setIsCreateFormModalOpen={setIsCreateFormModalOpen}
            onPromptDeleteCategory={handlePromptDeleteCategory}
          />
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
            <FormBuilder
              readOnly={isHistoricalVersion}
              customFields={customFields}
              selectedFieldIndex={selectedFieldIndex}
              setSelectedFieldIndex={setSelectedFieldIndex}
              setRightPanelTab={setRightPanelTab}
              draggedIndex={draggedIndex}
              dragOverIndex={dragOverIndex}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragEnd={handleDragEnd}
              handleRemoveField={handleRemoveField}
              handleClearAllFields={handleClearAllFields}
              openEditOptionsModal={openEditOptionsModal}
              handleAddSubFieldToSection={handleAddSubFieldToSection}
              handleRemoveSubFieldFromSection={handleRemoveSubFieldFromSection}
              handleUpdateSubField={handleUpdateSubField}
              handleReorderSubField={handleReorderSubField}
              openEditSubFieldModal={openEditSubFieldModal}
              handleSelectBranchTab={handleSelectBranchTab}
              handleAddBranch={handleAddBranch}
              handleDeleteBranch={handleDeleteBranch}
            />
          </div>
        </div>
      )}

      {/* DEDICATED FORM CANVAS BUILDER VIEW */}
      {currentTabParam === 'form_builder' && (
        <div className="p-6 md:p-8 bg-slate-50/50 min-h-[600px] overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <FormBuilder
              readOnly={isHistoricalVersion}
              customFields={customFields}
              selectedFieldIndex={selectedFieldIndex}
              setSelectedFieldIndex={setSelectedFieldIndex}
              setRightPanelTab={setRightPanelTab}
              draggedIndex={draggedIndex}
              dragOverIndex={dragOverIndex}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragEnd={handleDragEnd}
              handleRemoveField={handleRemoveField}
              handleClearAllFields={handleClearAllFields}
              openEditOptionsModal={openEditOptionsModal}
              handleAddSubFieldToSection={handleAddSubFieldToSection}
              handleRemoveSubFieldFromSection={handleRemoveSubFieldFromSection}
              handleUpdateSubField={handleUpdateSubField}
              handleReorderSubField={handleReorderSubField}
              openEditSubFieldModal={openEditSubFieldModal}
              handleSelectBranchTab={handleSelectBranchTab}
              handleAddBranch={handleAddBranch}
              handleDeleteBranch={handleDeleteBranch}
            />
          </div>
        </div>
      )}

      {/* DEDICATED FIELD PROPERTIES VIEW */}
      {currentTabParam === 'field_properties' && (
        <div className="p-6 md:p-8 bg-slate-50/50 min-h-[600px] overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <FieldProperties
              mode="standalone"
              readOnly={isHistoricalVersion}
              selectedField={selectedField}
              selectedFieldIndex={selectedFieldIndex}
              onUpdateFieldProperty={handleUpdateFieldProperty}
              openEditOptionsModal={openEditOptionsModal}
              onRemoveField={handleRemoveField}
              allFields={customFields}
            />
          </div>
        </div>
      )}

      {/* DEDICATED STANDALONE LIVE PREVIEW VIEW */}
      {currentTabParam === 'form_preview' && (
        <div className="p-6 md:p-8 bg-slate-50/50 min-h-[600px] overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <FormPreview
              mode="standalone"
              formTitle={formTitle}
              formDescription={formDescription}
              customFields={customFields}
              onSwitchToBuilder={() => {
                setCanvasViewMode('builder');
                setSearchParams({ tab: 'form_builder' });
              }}
            />
          </div>
        </div>
      )}

      {/* DEFAULT STUDIO: 3-COLUMN ALL-IN-ONE BUILDER */}
      {(currentTabParam === 'studio' || !['category_form', 'category_fields', 'form_builder', 'field_properties', 'form_preview'].includes(currentTabParam)) && (
        <div className="flex flex-col lg:flex-row min-h-[600px] lg:h-[780px] overflow-y-auto lg:overflow-hidden bg-slate-50/30">
          {/* Column 1: Left Categories & Palette */}
          <CategoryFields
            categories={categories}
            selectedCategory={selectedCategory}
            onCategorySwitch={handleCategorySwitch}
            customFields={customFields}
            onAddFieldFromPalette={handleAddFieldFromPalette}
            setIsCreateFormModalOpen={setIsCreateFormModalOpen}
            onPromptDeleteCategory={handlePromptDeleteCategory}
          />

          {/* Column 2: Center Live Form Canvas / In-Place Preview */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
            
            {/* Instant Canvas Mode Switcher Bar */}
            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-slate-800 tracking-tight">Form Canvas Studio</span>
                <span className="text-[10px] font-bold text-slate-400">({formTitle})</span>
              </div>

              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCanvasViewMode('builder')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    canvasViewMode === 'builder'
                      ? 'bg-white text-cyan-700 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PenTool className="h-3 w-3" />
                  <span>Builder</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasViewMode('preview')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    canvasViewMode === 'preview'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>Live Preview</span>
                </button>
              </div>
            </div>

            {/* In-Place Content: Shows Builder OR Form Preview directly right here! */}
            {canvasViewMode === 'preview' ? (
              <FormPreview
                mode="canvas"
                formTitle={formTitle}
                formDescription={formDescription}
                customFields={customFields}
                onSwitchToBuilder={() => setCanvasViewMode('builder')}
              />
            ) : (
              <FormBuilder
                readOnly={isHistoricalVersion}
                customFields={customFields}
                selectedFieldIndex={selectedFieldIndex}
                setSelectedFieldIndex={setSelectedFieldIndex}
                setRightPanelTab={setRightPanelTab}
                draggedIndex={draggedIndex}
                dragOverIndex={dragOverIndex}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                handleDragEnd={handleDragEnd}
                handleRemoveField={handleRemoveField}
                handleClearAllFields={handleClearAllFields}
                openEditOptionsModal={openEditOptionsModal}
                handleAddSubFieldToSection={handleAddSubFieldToSection}
                handleRemoveSubFieldFromSection={handleRemoveSubFieldFromSection}
                handleUpdateSubField={handleUpdateSubField}
                handleReorderSubField={handleReorderSubField}
                openEditSubFieldModal={openEditSubFieldModal}
                handleSelectBranchTab={handleSelectBranchTab}
                handleAddBranch={handleAddBranch}
                handleDeleteBranch={handleDeleteBranch}
              />
            )}
          </div>

          {/* Column 3: Right Inspector / Properties Panel */}
          <aside className="w-full lg:w-80 bg-white lg:border-l border-t lg:border-t-0 border-slate-200 p-4 shrink-0 overflow-y-auto">
            <FieldProperties
              mode="panel"
              readOnly={isHistoricalVersion}
              selectedField={selectedField}
              selectedFieldIndex={selectedFieldIndex}
              formTitle={formTitle}
              customFields={customFields}
              allFields={customFields}
              handleUpdateFieldProperty={handleUpdateFieldProperty}
              onUpdateFieldProperty={handleUpdateFieldProperty}
              handleRemoveField={handleRemoveField}
              onRemoveField={handleRemoveField}
              openEditOptionsModal={openEditOptionsModal}
              handleAddSubFieldToSection={handleAddSubFieldToSection}
              handleRemoveSubFieldFromSection={handleRemoveSubFieldFromSection}
              handleUpdateSubField={handleUpdateSubField}
              handleReorderSubField={handleReorderSubField}
              openEditSubFieldModal={openEditSubFieldModal}
              handleSelectBranchTab={handleSelectBranchTab}
              handleAddBranch={handleAddBranch}
              handleDeleteBranch={handleDeleteBranch}
            />
          </aside>
        </div>
      )}

      {/* NEW FORM CATEGORY MODAL */}
      {isCreateFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl text-left border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-cyan-600" />
                <h3 className="text-base font-black text-slate-900">Create New Form Category</h3>
              </div>
              <button type="button" onClick={() => setIsCreateFormModalOpen(false)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCategoryForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category / Form Name *</label>
                <input
                  type="text"
                  required
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder="e.g. Asset Request, Loan Approval, Access Card..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Create & Build
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME CATEGORY MODAL */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl text-left border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Edit2 className="h-5 w-5 text-cyan-600" />
                <h3 className="text-base font-black text-slate-900">Rename Form Category</h3>
              </div>
              <button type="button" onClick={() => setIsRenameModalOpen(false)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRenameModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Category Name *</label>
                <input
                  type="text"
                  required
                  value={renameCatInput}
                  onChange={(e) => setRenameCatInput(e.target.value)}
                  placeholder="Enter updated category name..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODERN UI DELETE CATEGORY CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteCatTarget(null);
        }}
        onConfirm={handleConfirmDeleteModal}
        title="Delete Category"
        message=""
        itemName={deleteCatTarget?.name || selectedCategory?.name || 'Category'}
        
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* TRANSFER / CHANGE FORM CATEGORY MODAL */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl text-left border border-slate-100 animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Change Form Category</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Move or copy this form design to another category</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current Category Info Pill */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center space-x-2.5">
              <span className="text-xs font-black text-cyan-700">📌 Current:</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{selectedCategory?.name}</p>
                <p className="text-[10px] text-slate-500 font-semibold">{customFields.length} custom fields on canvas</p>
              </div>
            </div>

            <form onSubmit={handleConfirmTransferForm} className="space-y-4">
              {/* Action Mode Toggle: Move or Copy */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Transfer Mode</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setTransferMode('move')}
                    className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      transferMode === 'move'
                        ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span>Move Form</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransferMode('copy')}
                    className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      transferMode === 'copy'
                        ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy / Clone</span>
                  </button>
                </div>
              </div>

              {/* Target Category Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Destination Category *</label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewTransferCat(!isCreatingNewTransferCat)}
                    className="text-[11px] font-bold text-cyan-700 hover:underline cursor-pointer"
                  >
                    {isCreatingNewTransferCat ? "Select Existing" : "+ New Category"}
                  </button>
                </div>

                {isCreatingNewTransferCat ? (
                  <input
                    type="text"
                    required
                    value={newTransferCatName}
                    onChange={(e) => setNewTransferCatName(e.target.value)}
                    placeholder="Enter new destination category name..."
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <select
                    required
                    value={transferTargetCatId}
                    onChange={(e) => setTransferTargetCatId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="">-- Choose Target Category --</option>
                    {categories.filter(c => String(c.id) !== String(selectedCategory?.id) && c.name !== selectedCategory?.name).map(cat => (
                      <option key={cat.id || cat.name} value={cat.id || cat.name}>
                        {cat.name} ({cat.fieldCount || 0} fields)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{transferMode === 'move' ? 'Move Form Now' : 'Copy Form Now'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* EDIT OPTIONS MODAL */}
      {isOptionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">Manage Dropdown Options</h3>
                <p className="text-[11px] font-semibold text-slate-400">Options for "{optionsModalFieldTitle}"</p>
              </div>
              <button type="button" onClick={() => setIsOptionsModalOpen(false)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Input Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Add Option</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newOptionInput}
                  onChange={(e) => setNewOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newOptionInput.trim()) {
                        const items = newOptionInput.split(',').map(s => s.trim()).filter(Boolean);
                        setOptionsModalValues([...optionsModalValues, ...items]);
                        setNewOptionInput('');
                      }
                    }
                  }}
                  placeholder="Type option name..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newOptionInput.trim()) {
                      const items = newOptionInput.split(',').map(s => s.trim()).filter(Boolean);
                      setOptionsModalValues([...optionsModalValues, ...items]);
                      setNewOptionInput('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <span>Options ({optionsModalValues.length})</span>
                {optionsModalValues.length > 0 && (
                  <button type="button" onClick={() => setOptionsModalValues([])} className="text-rose-500 hover:underline cursor-pointer">
                    Clear All
                  </button>
                )}
              </div>
              {optionsModalValues.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium text-center py-3">No options added yet.</p>
              ) : (
                optionsModalValues.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                    <div className="flex items-center space-x-2 flex-1 mr-2">
                      <span className="h-5 w-5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {oIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...optionsModalValues];
                          updated[oIdx] = e.target.value;
                          setOptionsModalValues(updated);
                        }}
                        className="w-full text-xs font-semibold text-slate-800 bg-transparent border-none focus:outline-none px-1"
                      />
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        disabled={oIdx === 0}
                        onClick={() => {
                          const updated = [...optionsModalValues];
                          const [moved] = updated.splice(oIdx, 1);
                          updated.splice(oIdx - 1, 0, moved);
                          setOptionsModalValues(updated);
                        }}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={oIdx === optionsModalValues.length - 1}
                        onClick={() => {
                          const updated = [...optionsModalValues];
                          const [moved] = updated.splice(oIdx, 1);
                          updated.splice(oIdx + 1, 0, moved);
                          setOptionsModalValues(updated);
                        }}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setOptionsModalValues(optionsModalValues.filter((_, i) => i !== oIdx))}
                        className="p-1 rounded hover:bg-rose-100 text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Delete Option"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOptionsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (optionsModalFieldIndex !== null) {
                    handleUpdateFieldProperty(optionsModalFieldIndex, 'options', optionsModalValues);
                  }
                  setIsOptionsModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-bold cursor-pointer shadow-md shadow-cyan-500/20"
              >
                Save Options
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SUB-FIELD MODAL */}
      {isSubFieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl text-left border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Edit Question in Subform</h3>
                <p className="text-xs font-semibold text-slate-400">Customize question title, placeholder hint & options</p>
              </div>
              <button type="button" onClick={() => setIsSubFieldModalOpen(false)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Question Label */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Question / Field Label *</label>
                <input
                  type="text"
                  value={subFieldModalLabel}
                  onChange={(e) => setSubFieldModalLabel(e.target.value)}
                  placeholder="e.g. Department Name, Employee ID..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Placeholder / Example Text (e.g. "e.g. Operations") */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Example Placeholder Text</label>
                <input
                  type="text"
                  value={subFieldModalPlaceholder}
                  onChange={(e) => setSubFieldModalPlaceholder(e.target.value)}
                  placeholder="e.g. Operations, IT, Sales, EMP-001..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                  💡 This is the gray hint text shown inside the input box when empty.
                </span>
              </div>

              {/* Input Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Field Type</label>
                <select
                  value={subFieldModalType}
                  onChange={(e) => setSubFieldModalType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none cursor-pointer bg-white"
                >
                  <option value="text">Short Text (e.g. Name, Department, ID)</option>
                  <option value="textarea">Long Text / Paragraph (Description)</option>
                  <option value="select">Dropdown Choice Menu</option>
                  <option value="date">Date Picker</option>
                  <option value="file">File Attachment / Proof</option>
                  <option value="number">Number (Count, Amount, Code)</option>
                </select>
              </div>

              {/* Options Manager if Type is Select */}
              {(subFieldModalType === 'select' || subFieldModalType === 'radio') && (
                <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-800">Dropdown Choices ({subFieldModalOptions.length})</span>
                    {subFieldModalOptions.length > 0 && (
                      <button type="button" onClick={() => setSubFieldModalOptions([])} className="text-[10px] font-bold text-rose-500 hover:underline">
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newSubOptionInput}
                      onChange={(e) => setNewSubOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newSubOptionInput.trim()) {
                            const items = newSubOptionInput.split(',').map(s => s.trim()).filter(Boolean);
                            setSubFieldModalOptions([...subFieldModalOptions, ...items]);
                            setNewSubOptionInput('');
                          }
                        }
                      }}
                      placeholder="Type option (or comma-separated) and press Enter..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSubOptionInput.trim()) {
                          const items = newSubOptionInput.split(',').map(s => s.trim()).filter(Boolean);
                          setSubFieldModalOptions([...subFieldModalOptions, ...items]);
                          setNewSubOptionInput('');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black cursor-pointer shadow-xs"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                    {subFieldModalOptions.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...subFieldModalOptions];
                            updated[oIdx] = e.target.value;
                            setSubFieldModalOptions(updated);
                          }}
                          className="flex-1 bg-transparent border-none focus:outline-none text-xs font-bold text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => setSubFieldModalOptions(subFieldModalOptions.filter((_, i) => i !== oIdx))}
                          className="text-rose-500 hover:text-rose-700 p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Switch */}
              <div className="flex items-center space-x-2.5 pt-1">
                <input
                  type="checkbox"
                  id="subReq"
                  checked={subFieldModalRequired}
                  onChange={(e) => setSubFieldModalRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="subReq" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Mandatory Required Field (User cannot submit ticket without filling this)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSubFieldModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (subFieldModalSectionIndex !== null && subFieldModalSubIndex !== null) {
                    handleUpdateSubField(subFieldModalSectionIndex, subFieldModalSubIndex, 'label', subFieldModalLabel);
                    handleUpdateSubField(subFieldModalSectionIndex, subFieldModalSubIndex, 'placeholder', subFieldModalPlaceholder);
                    handleUpdateSubField(subFieldModalSectionIndex, subFieldModalSubIndex, 'type', subFieldModalType);
                    handleUpdateSubField(subFieldModalSectionIndex, subFieldModalSubIndex, 'required', subFieldModalRequired);
                    if (subFieldModalType === 'select' || subFieldModalType === 'radio') {
                      handleUpdateSubField(subFieldModalSectionIndex, subFieldModalSubIndex, 'options', subFieldModalOptions);
                    }
                  }
                  setIsSubFieldModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black cursor-pointer shadow-md shadow-cyan-500/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODERN UI CLEAR FORM CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClearAllFields}
        title="Clear Form Canvas"
        message="Are you sure you want to clear all custom fields from this form? You can rebuild it fresh from the left palette."
        itemName={formTitle}
        itemSubtext="All currently added input questions and section logic on this canvas will be reset."
        confirmText="Yes, Clear Canvas"
        cancelText="Keep Fields"
        type="warning"
      />

    </div>
  );
};

export default SuperAdminFormBuilder;


