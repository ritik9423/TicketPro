import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Clock, 
  BookOpen, 
  Megaphone, 
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Sliders,
  FileSpreadsheet,
  Building,
  Building2,
  X,
  FileText,
  Layers,
  PenTool,
  SlidersHorizontal,
  Eye
} from 'lucide-react';

const Sidebar = ({ isOpenMobile, onCloseMobile, isCollapsed: propCollapsed, setIsCollapsed: propSetCollapsed }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : internalCollapsed;
  const setIsCollapsed = propSetCollapsed !== undefined ? propSetCollapsed : setInternalCollapsed;
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);

  const getLinks = () => {
    const role = user?.role;
    if (role === 'SUPER_ADMIN' || role === 'COMPANY_ADMIN' || role === 'MANAGER') {
      const adminLinks = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/tickets', label: 'Tickets', icon: Ticket, end: true },
      ];
      if (role === 'SUPER_ADMIN') {
        adminLinks.push({ to: '/companies', label: 'Companies', icon: Building2 });
      }
      adminLinks.push(
        { to: '/departments', label: 'Departments', icon: Building2 },
        { to: '/form-builder', label: 'Category', icon: Sliders },
        { to: '/agents', label: 'Agents / Staff', icon: Users },
        { to: '/sla', label: 'SLA Management', icon: Clock },
        { to: '/kb', label: 'Knowledge Base', icon: BookOpen },
        { to: '/reports', label: 'Reports', icon: FileSpreadsheet },
        { to: '/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/profile', label: 'Company Profile', icon: Building }
      );
      return adminLinks;
    } else if (role === 'AGENT') {
      return [
        { to: '/dashboard', label: 'My Worklist', icon: LayoutDashboard },
        { to: '/tickets', label: 'Tickets Queue', icon: Ticket, end: true },
        { to: '/kb', label: 'Knowledge Base', icon: BookOpen },
        { to: '/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/profile', label: 'My Profile', icon: User },
      ];
    } else {
      return [
        { to: '/dashboard', label: 'My Support Hub', icon: LayoutDashboard },
        { to: '/tickets', label: 'My Tickets', icon: Ticket, end: true },
        { to: '/kb', label: 'Help Center & FAQ', icon: BookOpen },
        { to: '/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/profile', label: 'My Profile', icon: User },
      ];
    }
  };

  const links = getLinks();

  const renderCompanyLogo = () => {
    if (user?.logoUrl) {
      return (
        <img src={user.logoUrl} alt={user?.companyName || 'Company Logo'} className="h-9 w-9 rounded-xl object-contain bg-white p-1 border border-slate-200/80 shadow-xs shrink-0" />
      );
    }
    return (
      <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#ff7300] to-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
        {user?.companyCode ? user.companyCode.slice(0, 4) : 'IOCL'}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between py-4 relative z-10 bg-white select-none">
      
      {/* Header / Company Badge */}
      <div className="px-3 sm:px-4 pb-3 border-b border-slate-200/80">
        <div className="flex items-center justify-between">
          {(!isCollapsed || isOpenMobile) ? (
            <div className="p-2.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs flex items-center space-x-3 w-full">
              {renderCompanyLogo()}
              <div className="leading-tight overflow-hidden text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black text-slate-900 tracking-tight truncate max-w-[140px]">
                    {user?.companyName || user?.companyCode || 'IOCL Workspace'}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="text-[9.5px] font-extrabold text-cyan-700 uppercase tracking-wider block">
                    {user?.role === 'SUPER_ADMIN' 
                      ? 'SUPER ADMIN'
                      : user?.role === 'COMPANY_ADMIN' 
                        ? 'COMPANY ADMIN' 
                        : (user?.role === 'END_USER' || user?.role === 'USER' || user?.role === 'CUSTOMER')
                          ? 'CUSTOMER'
                          : user?.role?.replace('_', ' ')
                    }
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-center w-full" title={user?.companyName || 'Workspace'}>
              {renderCompanyLogo()}
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

      {/* Links Menu */}
      <div className="flex-1 px-3 space-y-1.5 pt-3 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isCategoryMenu = link.label === 'Category';

          if (isCategoryMenu) {
            const isCategoryActive = location.pathname === '/form-builder' || location.pathname === '/categories';
            const currentTab = new URLSearchParams(location.search).get('tab');

            return (
              <div key="category-group" className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                  title={isCollapsed ? 'Category' : undefined}
                  className={`w-full flex items-center ${isCollapsed && !isOpenMobile ? 'justify-center px-2 py-3' : 'justify-between space-x-3.5 px-4 py-2.5'} rounded-2xl text-[13px] transition-all cursor-pointer ${
                    isCategoryActive
                      ? 'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 font-extrabold shadow-2xs ring-1 ring-cyan-300/60'
                      : 'text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-50/90'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <Sliders className="h-5 w-5 shrink-0" />
                    {(!isCollapsed || isOpenMobile) && <span>Category</span>}
                  </div>
                  {(!isCollapsed || isOpenMobile) && (
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isCategoryExpanded ? 'rotate-180 text-cyan-700' : 'text-slate-400'}`} />
                  )}
                </button>

                {/* Sub-menu links beneath Category in Dashboard Sidebar */}
                {isCategoryExpanded && (!isCollapsed || isOpenMobile) && (
                  <div className="pl-4 space-y-1 pt-1 border-l-2 border-cyan-200/80 ml-4 text-left">
                    <NavLink
                      to="/form-builder?tab=category_form"
                      onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                      className={`flex items-center space-x-2 rounded-xl px-3 py-1.5 text-[11.5px] transition-colors ${
                        isCategoryActive && currentTab === 'category_form'
                          ? 'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 font-extrabold shadow-2xs ring-1 ring-cyan-300/60'
                          : 'text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
                      <span>Category Form</span>
                    </NavLink>

                    <NavLink
                      to="/form-builder?tab=category_fields"
                      onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                      className={`flex items-center space-x-2 rounded-xl px-3 py-1.5 text-[11.5px] transition-colors ${
                        isCategoryActive && currentTab === 'category_fields'
                          ? 'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 font-extrabold shadow-2xs ring-1 ring-cyan-300/60'
                          : 'text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
                      <span>Category Fields</span>
                    </NavLink>

                    <NavLink
                      to="/form-builder?tab=form_builder"
                      onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                      className={`flex items-center space-x-2 rounded-xl px-3 py-1.5 text-[11.5px] transition-colors ${
                        isCategoryActive && (currentTab === 'form_builder' || !currentTab)
                          ? 'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 font-extrabold shadow-2xs ring-1 ring-cyan-300/60'
                          : 'text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <PenTool className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
                      <span>Form Builder</span>
                    </NavLink>

                    <NavLink
                      to="/form-builder?tab=field_properties"
                      onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                      className={`flex items-center space-x-2 rounded-xl px-3 py-1.5 text-[11.5px] transition-colors ${
                        isCategoryActive && currentTab === 'field_properties'
                          ? 'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 font-extrabold shadow-2xs ring-1 ring-cyan-300/60'
                          : 'text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
                      <span>Field Properties</span>
                    </NavLink>

                    <NavLink
                      to="/form-builder?tab=form_preview"
                      onClick={() => { if (onCloseMobile) onCloseMobile(); }}
                      className={`flex items-center space-x-2 rounded-xl px-3 py-1.5 text-[11.5px] transition-colors ${
                        isCategoryActive && currentTab === 'form_preview'
                          ? 'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 font-extrabold shadow-2xs ring-1 ring-cyan-300/60'
                          : 'text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
                      <span>Form Preview</span>
                    </NavLink>

                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => { if (onCloseMobile) onCloseMobile(); }}
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

      {/* Bottom Area: Collapse toggle & Logout (EXACT MATCH TO SUPER-ADMIN) */}
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
          onClick={() => { logout(); if (onCloseMobile) onCloseMobile(); }}
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
      {/* Desktop Fixed Sidebar */}
      <aside className={`fixed bottom-0 left-0 top-16 z-30 bg-white text-slate-800 border-r border-slate-200/80 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-[240px]'} hidden md:block text-left shadow-xs select-none overflow-hidden`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 z-40 md:hidden bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={onCloseMobile}
        >
          <aside 
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white text-slate-800 border-r border-slate-200 shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
