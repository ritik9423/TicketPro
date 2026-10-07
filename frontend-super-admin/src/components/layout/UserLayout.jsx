import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const UserLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
      {/* FIXED TOP HEADER */}
      <Header 
        isMobileOpen={isMobileOpen} 
        onToggleMobileMenu={() => setIsMobileOpen(prev => !prev)} 
      />
      
      {/* MAIN VIEWPORT WITH SIDEBAR & RESPONSIVE CONTENT AREA */}
      <div className="flex flex-1 pt-16 relative overflow-x-hidden">
        <Sidebar 
          isOpenMobile={isMobileOpen} 
          onCloseMobile={() => setIsMobileOpen(false)}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
        
        {/* Dynamic pl-[270px] when expanded, pl-20 when collapsed. */}
        <main className={`flex-1 w-full min-w-0 px-3 sm:px-6 py-4 overflow-x-hidden transition-all duration-300 ${
          isCollapsed ? 'md:pl-20' : 'md:pl-[270px]'
        }`}>
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserLayout;
