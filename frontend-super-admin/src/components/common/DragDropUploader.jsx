import React, { useState, useRef } from 'react';
import { 
  Paperclip, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  X,
  FolderOpen
} from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

const BLOCKED_EXTENSIONS = new Set([
  '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.3gp', '.m4v', '.mpg', '.mpeg',
  '.exe', '.bat', '.sh', '.cmd', '.vbs', '.msi', '.com', '.ps1', '.jar'
]);

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileIcon = (fileName = '', fileType = '') => {
  const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : '';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.jfif'].includes(ext) || (fileType && fileType.startsWith('image/'))) {
    return <ImageIcon className="h-4 w-4 text-cyan-700 shrink-0" />;
  }
  if (['.xls', '.xlsx', '.csv', '.ods'].includes(ext)) {
    return <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />;
  }
  if (['.pdf'].includes(ext)) {
    return <FileText className="h-4 w-4 text-rose-600 shrink-0" />;
  }
  return <Paperclip className="h-4 w-4 text-cyan-700 shrink-0" />;
};

const DragDropUploader = ({
  onFileSelected,
  initialFilename = '',
  isUploading = false,
  label = '',
  required = false,
  fieldId = null
}) => {
  const fileInputRef = useRef(null);
  const stableIdRef = useRef(fieldId || `file_input_${Math.random().toString(36).substring(2, 9)}`);
  const inputId = fieldId || stableIdRef.current;

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const processSelectedFile = (file) => {
    if (!file) return;
    setErrorMsg('');

    // Size limit check (10MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = `File exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`;
      setErrorMsg(msg);
      alert(msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Blocked extensions check
    const name = file.name || '';
    const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')).toLowerCase() : '';
    const type = (file.type || '').toLowerCase();

    if (type.startsWith('video/') || BLOCKED_EXTENSIONS.has(ext)) {
      const msg = `This file type (${ext || type}) is not allowed. Please upload documents (PDF, Word, Excel) or images (PNG, JPG).`;
      setErrorMsg(msg);
      alert(msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Immediately update local state
    setSelectedFile(file);

    // Instant local image preview if applicable
    if (file.type && file.type.startsWith('image/')) {
      try {
        const blobUrl = URL.createObjectURL(file);
        setPreviewUrl(blobUrl);
      } catch (_e) {
        setPreviewUrl('');
      }
    } else {
      setPreviewUrl('');
    }

    // Immediately inform parent form state with raw file
    if (onFileSelected) {
      onFileSelected(file);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl('');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onFileSelected) {
      onFileSelected(null);
    }
  };

  const currentDisplayName = selectedFile?.name || initialFilename;

  return (
    <div className="w-full space-y-1.5">
      {/* Hidden Native File Input */}
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        onChange={handleInputChange}
        disabled={isUploading}
        className="hidden"
      />

      {currentDisplayName ? (
        /* STATE 1: UPLOADED / SELECTED FILE CARD */
        <div className="border border-emerald-300 bg-emerald-50/90 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3 truncate min-w-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                className="h-8 w-8 rounded-lg object-cover border border-emerald-300 shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-white border border-emerald-200 flex items-center justify-center shrink-0">
                {getFileIcon(currentDisplayName, selectedFile?.type)}
              </div>
            )}
            <div className="truncate text-left">
              <span className="text-xs font-black text-slate-900 block truncate" title={currentDisplayName}>
                {currentDisplayName}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {selectedFile?.size ? formatBytes(selectedFile.size) : 'File selected'} • Ready to attach
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <label
              htmlFor={inputId}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black text-cyan-800 hover:bg-white bg-white/70 border border-cyan-200 cursor-pointer shadow-2xs transition-all active:scale-95 ${
                isUploading ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              Change
            </label>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isUploading}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: EMPTY DROPZONE WITH NATIVE HTML LABEL CLICK */
        <label
          htmlFor={inputId}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            isDragOver
              ? 'border-cyan-500 bg-cyan-50/80 scale-[0.99]'
              : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50/50 shadow-2xs'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <div className="flex items-center space-x-3 truncate min-w-0 w-full sm:w-auto">
            <div className="h-9 w-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 shrink-0">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-black text-slate-800 leading-tight truncate">
                {label || 'Upload Attachment / Proof'}
                {required && <span className="text-rose-500 ml-0.5">*</span>}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                PNG, JPG, PDF, Word, Excel (Max 10MB)
              </p>
            </div>
          </div>

          <span
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black cursor-pointer shadow-xs transition-all shrink-0"
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span>Upload File</span>
          </span>
        </label>
      )}

      {errorMsg && (
        <div className="flex items-center space-x-1.5 text-[11px] text-rose-600 font-semibold px-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default DragDropUploader;
