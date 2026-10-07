import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import UserLayout from '../components/layout/UserLayout';

// Lazy Loaded Pages for Optimal Production Chunking & Lightning-Fast Initial Load
const LandingPage = lazy(() => import('../pages/LandingPage'));
const Login = lazy(() => import('../pages/Login'));
const OnboardCompany = lazy(() => import('../pages/OnboardCompany'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const TicketsList = lazy(() => import('../pages/TicketsList'));
const TicketDetails = lazy(() => import('../pages/TicketDetails'));
const Agents = lazy(() => import('../pages/Agents'));
const SlaPolicies = lazy(() => import('../pages/SlaPolicies'));
const KnowledgeBase = lazy(() => import('../pages/KnowledgeBase'));
const Announcements = lazy(() => import('../pages/Announcements'));
const SuperAdminFormBuilder = lazy(() => import('../pages/SuperAdminFormBuilder'));
const Profile = lazy(() => import('../pages/Profile'));
const Reports = lazy(() => import('../pages/Reports'));
const Departments = lazy(() => import('../pages/Departments'));
const Companies = lazy(() => import('../pages/Companies'));

// Route Suspense Fallback Spinner
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center space-y-3">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent"></div>
      <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading TicketPro...</span>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login/:companyCodeParam" element={<Login />} />
        <Route path="/:companyCodeParam" element={<Login />} />
        <Route path="/onboard" element={<OnboardCompany />} />
        <Route path="/onboard-company" element={<OnboardCompany />} />

        {/* Base Protected Routes for All Authenticated Roles (Company Admin, Manager, Agent, End User) */}
        <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT', 'USER', 'END_USER', 'CUSTOMER']} />}>
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tickets" element={<TicketsList />} />
            <Route path="/tickets/:id" element={<TicketDetails />} />
            <Route path="/kb" element={<KnowledgeBase />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />

            {/* STRICT ADMIN & MANAGER ONLY: Reports, Departments, Staff, Dynamic Forms, SLA */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER']} />}>
              <Route path="/reports" element={<Reports />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/users" element={<Agents />} />
              <Route path="/form-builder" element={<SuperAdminFormBuilder />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/sla" element={<SlaPolicies />} />
              <Route path="/categories" element={<Navigate to="/form-builder" replace />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
