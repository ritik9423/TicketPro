import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Ticket, 
  PlusCircle, 
  BarChart2, 
  Users, 
  ShieldCheck, 
  Settings, 
  User, 
  FileSpreadsheet, 
  ArrowRight, 
  Command, 
  X,
  Sparkles,
  BookOpen,
  Building
} from 'lucide-react';
import { exportTicketsDataset } from '../utils/excelExporter';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Global Keyboard shortcut listener (Ctrl+K or Cmd+K)
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
      id: 'new-ticket',
      title: 'Create New Support Ticket',
      subtitle: 'Open a dynamic enterprise ticket form',
      icon: PlusCircle,
      category: 'Actions',
      action: () => {
        navigate('/tickets?action=new');
        setIsOpen(false);
      }
    },
    {
      id: 'view-tickets',
      title: 'View Tickets Queue',
      subtitle: 'Manage and filter all assigned tickets',
      icon: Ticket,
      category: 'Navigation',
      action: () => {
        navigate('/tickets');
        setIsOpen(false);
      }
    },
    {
      id: 'dashboard',
      title: 'Dashboard & Analytics',
      subtitle: 'Live ticket metrics and KPI cards',
      icon: BarChart2,
      category: 'Navigation',
      action: () => {
        navigate('/dashboard');
        setIsOpen(false);
      }
    },
    {
      id: 'knowledge-base',
      title: 'Knowledge Base & Articles',
      subtitle: 'Self-service documentation and FAQs',
      icon: BookOpen,
      category: 'Navigation',
      action: () => {
        navigate('/knowledge-base');
        setIsOpen(false);
      }
    },
    {
      id: 'sla-policies',
      title: 'SLA Escalation Policies',
      subtitle: 'Response times and target deadlines',
      icon: ShieldCheck,
      category: 'Management',
      action: () => {
        navigate('/sla-policies');
        setIsOpen(false);
      }
    },
    {
      id: 'agents',
      title: 'Agents & Teams',
      subtitle: 'Manage team members and routing',
      icon: Users,
      category: 'Management',
      action: () => {
        navigate('/agents');
        setIsOpen(false);
      }
    },
    {
      id: 'reports',
      title: 'Performance Reports & CSAT',
      subtitle: 'Download analytics and customer feedback',
      icon: BarChart2,
      category: 'Management',
      action: () => {
        navigate('/reports');
        setIsOpen(false);
      }
    },
    {
      id: 'export-excel',
      title: 'Export Real Tickets to Excel (.xlsx)',
      subtitle: 'Download dataset spreadsheet',
      icon: FileSpreadsheet,
      category: 'Data & Export',
      action: () => {
        let tickets = [];
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('tp_tickets_')) {
              const raw = sessionStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  tickets = parsed;
                  break;
                }
              }
            }
          }
        } catch (_e) {}
        exportTicketsDataset(tickets, 'excel', 'COMMAND_PALETTE');
        setIsOpen(false);
      }
    },
    {
      id: 'my-profile',
      title: 'Account Settings & Profile',
      subtitle: 'Personal details and credentials',
      icon: User,
      category: 'Account',
      action: () => {
        navigate('/profile');
        setIsOpen(false);
      }
    }
  ];

  // Dynamic ticket jump filtering
  const filteredActions = defaultActions.filter((item) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const isTicketNumberSearch = search.trim().startsWith('#') || (!isNaN(search.trim()) && search.trim().length > 0);

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
      if (isTicketNumberSearch) {
        const cleanNum = search.replace('#', '').trim();
        navigate(`/tickets/${cleanNum}`);
        setIsOpen(false);
      } else if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-14 p-3 sm:pt-20 sm:p-4 animate-in fade-in duration-150" onClick={() => setIsOpen(false)}>
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-left font-sans animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center space-x-3 bg-slate-50/50">
          <Search className="h-5 w-5 text-cyan-700 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or jump to ticket #ID... (e.g. #101, Reports)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInMenu}
            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase text-slate-400 bg-white border border-slate-200 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto p-2 space-y-1 divide-y divide-slate-50">
          {isTicketNumberSearch && (
            <div
              onClick={() => {
                const cleanNum = search.replace('#', '').trim();
                navigate(`/tickets/${cleanNum}`);
                setIsOpen(false);
              }}
              className="p-3 rounded-2xl bg-cyan-50 hover:bg-cyan-100 cursor-pointer flex items-center justify-between transition-colors mb-1"
            >
              <div className="flex items-center space-x-3">
                <Ticket className="h-4 w-4 text-cyan-700" />
                <div>
                  <span className="text-xs font-black text-indigo-900">Jump directly to Ticket #{search.replace('#', '')}</span>
                  <span className="text-[10px] text-cyan-700 block">Open ticket details and conversation</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-cyan-700" />
            </div>
          )}

          {filteredActions.length > 0 ? (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.action)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-xs font-black block truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {item.title}
                      </span>
                      <span className={`text-[10px] block font-medium truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.category}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              No matching commands or pages found for "{search}".
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center space-x-3">
            <span>Use <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Enter</kbd> to select</span>
          </div>
          <span className="font-bold text-cyan-700">TicketPro Spotlight</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
