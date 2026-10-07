import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  Ticket,
  Users, 
  CreditCard,
  Clock, 
  BarChart3, 
  History, 
  Sliders, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ShieldCheck,
  User
} from 'lucide-react';

const Sidebar = ({ isOpenMobile, onCloseMobile, isCollapsed, setIsCollapsed }) => {
  const { logout } = useAuth();

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/companies', label: 'Tenants & Workspaces', icon: Building2 },
    { to: '/tickets', label: 'Global Tickets', icon: Ticket },
    { to: '/users', label: 'Staff & Directory', icon: Users },
    { to: '/form-builder', label: 'Custom Forms & Categories', icon: Sliders },
    { to: '/plans', label: 'Plans & Subscriptions', icon: CreditCard },
    { to: '/sla-policies', label: 'SLA Escalations', icon: Clock },
    { to: '/reports', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/audit-logs', label: 'Security & Audit Logs', icon: History },
    { to: '/profile', label: 'Admin Profile & Settings', icon: User },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between py-4 relative z-10 bg-white select-none">
      
      {/* Top: Super Admin Role / Authority Badge */}
      <div className="px-3 sm:px-4 pb-3 border-b border-slate-200/80">
        <div className="flex items-center justify-between">
          {!isCollapsed || isOpenMobile ? (
            <div className="p-2.5 rounded-2xl bg-indigo-50/70 border border-indigo-100/80 shadow-2xs flex items-center space-x-3 w-full">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#06b6d4] via-[#3b82f6] to-[#6366f1] flex items-center justify-center text-white shadow-xs shrink-0">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div className="leading-tight overflow-hidden text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black text-slate-900 tracking-tight">Super Admin</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="text-[9.5px] font-extrabold text-cyan-700 uppercase tracking-wider block">
                    PLATFORM ROOT
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-2xs flex items-center justify-center w-full" title="Super Admin Platform Root">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="h-4.5 w-4.5 text-white" />
              </div>
            </div>
          )}

          {isOpenMobile && (
            <button
              onClick={onCloseMobile}
              aria-label="Close mobile sidebar menu"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl md:hidden cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 space-y-1.5 pt-3 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              title={isCollapsed ? link.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed && !isOpenMobile ? 'justify-center px-2 py-3' : 'space-x-3.5 px-4 py-2.5'} rounded-2xl text-[13px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 font-extrabold shadow-2xs ring-1 ring-cyan-300/60'
                    : 'text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-50/90'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {(!isCollapsed || isOpenMobile) && (
                <span className="truncate">{link.label}</span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Area: Collapse toggle & Logout */}
      <div className="px-3 border-t border-slate-200/80 pt-3 space-y-1.5">
        
        {/* Desktop Collapse Toggle */}
        <div className="hidden md:flex items-center justify-between">
          {(!isCollapsed || isOpenMobile) && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">
              Minimize Menu
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ${isCollapsed ? 'mx-auto' : ''}`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className={`w-full flex items-center ${isCollapsed && !isOpenMobile ? 'justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} rounded-2xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 transition-all cursor-pointer`}
          title="Logout"
        >
          <LogOut className="h-4.5 w-4.5 text-rose-500 shrink-0" />
          {(!isCollapsed || isOpenMobile) && <span>Sign Out</span>}
        </button>

      </div>

    </div>
  );

  return (
    <>
      {/* DESKTOP FIXED SIDEBAR (Starts at top-16 right below header) */}
      <aside
        className={`fixed bottom-0 left-0 top-16 z-30 hidden md:block border-r border-slate-200/80 bg-white transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-[270px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* MOBILE DRAWER OVERLAY */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex select-none">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          ></div>
          <div className="relative flex w-72 max-w-[85vw] flex-1 flex-col bg-white shadow-2xl border-r border-slate-200 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
