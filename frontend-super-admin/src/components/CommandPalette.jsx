import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Ticket, 
  Building2, 
  Users, 
  ShieldCheck, 
  Layers, 
  FileSpreadsheet, 
  ArrowRight, 
  CreditCard,
  Settings,
  BarChart2,
  FileText
} from 'lucide-react';
import { exportTicketsDataset } from '../utils/excelExporter';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const defaultActions = [
    {
      id: 'super-tickets',
      title: 'Global Tickets Queue',
      subtitle: 'Triage and bulk manage cross-tenant tickets',
      icon: Ticket,
      category: 'Operations',
      action: () => {
        navigate('/tickets');
        setIsOpen(false);
      }
    },
    {
      id: 'super-companies',
      title: 'Tenant Companies Directory',
      subtitle: 'Manage onboarded enterprise clients',
      icon: Building2,
      category: 'Management',
      action: () => {
        navigate('/companies');
        setIsOpen(false);
      }
    },
    {
      id: 'super-form-builder',
      title: 'Industry Form Template Builder',
      subtitle: 'Customize dynamic ticketing schemas',
      icon: Layers,
      category: 'Configuration',
      action: () => {
        navigate('/form-builder');
        setIsOpen(false);
      }
    },
    {
      id: 'super-sla',
      title: 'Global SLA Escalation Matrix',
      subtitle: 'Platform-wide response & resolution targets',
      icon: ShieldCheck,
      category: 'Configuration',
      action: () => {
        navigate('/sla-policies');
        setIsOpen(false);
      }
    },
    {
      id: 'super-users',
      title: 'Platform Staff & Agents',
      subtitle: 'Manage Super Admins and Support staff',
      icon: Users,
      category: 'Management',
      action: () => {
        navigate('/users');
        setIsOpen(false);
      }
    },
    {
      id: 'super-reports',
      title: 'Executive Platform Analytics',
      subtitle: 'Cross-tenant performance and CSAT reports',
      icon: BarChart2,
      category: 'Analytics',
      action: () => {
        navigate('/reports');
        setIsOpen(false);
      }
    },
    {
      id: 'super-plans',
      title: 'Subscription Plans & Tiers',
      subtitle: 'Manage pricing models and feature quotas',
      icon: CreditCard,
      category: 'Billing',
      action: () => {
        navigate('/plans');
        setIsOpen(false);
      }
    },
    {
      id: 'super-audit',
      title: 'Security & Audit Logs',
      subtitle: 'Full traceability of admin actions',
      icon: FileText,
      category: 'Security',
      action: () => {
        navigate('/audit-logs');
        setIsOpen(false);
      }
    },
    {
      id: 'super-profile',
      title: 'Admin Profile & Platform Settings',
      subtitle: 'Credentials, branding, SMTP relay, and security guardrails',
      icon: ShieldCheck,
      category: 'System',
      action: () => {
        navigate('/profile');
        setIsOpen(false);
      }
    }
  ];

  const filteredActions = defaultActions.filter((item) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleSelect = (action) => {
    if (action) {
      action();
    }
  };

  const handleKeyDownInMenu = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden text-left font-sans animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-950/50">
          <Search className="h-5 w-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Super Admin Spotlight — jump anywhere (Ctrl+K)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInMenu}
            className="w-full bg-transparent text-sm font-semibold text-white placeholder-slate-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
          {filteredActions.length > 0 ? (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.action)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-black block ${isSelected ? 'text-white' : 'text-slate-100'}`}>
                        {item.title}
                      </span>
                      <span className={`text-[10px] block font-medium ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.category}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              No matching commands found for "{search}".
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center space-x-3">
            <span>Use <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]">↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-[10px]">Enter</kbd> to select</span>
          </div>
          <span className="font-bold text-indigo-400">Super Admin Console</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
