import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const CustomSelect = ({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  disabled = false,
  required = false,
  name,
  'aria-label': ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: String(opt), label: String(opt) };
    }
    return {
      value: String(opt.value ?? opt.id ?? ''),
      label: String(opt.label ?? opt.name ?? opt.value ?? '')
    };
  });

  const selectedOpt = normalizedOptions.find((opt) => String(opt.value) === String(value));
  const displayText = selectedOpt ? selectedOpt.label : placeholder;

  return (
    <div className={`relative w-full max-w-full ${className}`} ref={containerRef}>
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
          value={value || ''}
          onChange={() => {}}
          required={required}
        />
      )}

      <button
        id={id}
        name={name}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors cursor-pointer h-10 shadow-2xs truncate ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${buttonClassName}`}
      >
        <span className={`truncate mr-2 ${!selectedOpt && !value ? 'text-slate-400 font-medium' : 'text-slate-900'}`}>
          {displayText}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-cyan-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 w-full bg-white rounded-2xl border border-slate-200 shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-3.5 py-2 text-xs text-slate-400 font-medium">No options available</div>
          ) : (
            normalizedOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  onClick={() => {
                    if (typeof onChange === 'function') {
                      onChange(opt.value, { target: { value: opt.value, name } });
                    }
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-50 text-cyan-800 font-black'
                      : 'text-slate-700 hover:bg-slate-50 font-semibold'
                  }`}
                >
                  <span className="truncate mr-2">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-cyan-700 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
