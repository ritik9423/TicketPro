import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import UserLayout from '../components/layout/UserLayout';

// Resilient lazy loader: automatically reloads the page if a chunk is missing due to a new deployment
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed = sessionStorage.getItem('page_has_been_force_refreshed') === 'true';
    try {
      const component = await componentImport();
      sessionStorage.setItem('page_has_been_force_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        sessionStorage.setItem('page_has_been_force_refreshed', 'true');
        window.location.reload();
        return new Promise(() => {}); // Pause while reloading
      }
      throw error;
    }
  });

// Lazy Loaded Pages for Optimal Production Chunking & Lightning-Fast Initial Load
const LandingPage = lazyWithRetry(() => import('../pages/LandingPage'));
const Login = lazyWithRetry(() => import('../pages/Login'));
const OnboardCompany = lazyWithRetry(() => import('../pages/OnboardCompany'));
const Dashboard = lazyWithRetry(() => import('../pages/Dashboard'));
const TicketsList = lazyWithRetry(() => import('../pages/TicketsList'));
const TicketDetails = lazyWithRetry(() => import('../pages/TicketDetails'));
const Agents = lazyWithRetry(() => import('../pages/Agents'));
const SlaPolicies = lazyWithRetry(() => import('../pages/SlaPolicies'));
const KnowledgeBase = lazyWithRetry(() => import('../pages/KnowledgeBase'));
const Announcements = lazyWithRetry(() => import('../pages/Announcements'));
const SuperAdminFormBuilder = lazyWithRetry(() => import('../pages/SuperAdminFormBuilder'));
const Profile = lazyWithRetry(() => import('../pages/Profile'));
const Reports = lazyWithRetry(() => import('../pages/Reports'));
const Departments = lazyWithRetry(() => import('../pages/Departments'));
const Companies = lazyWithRetry(() => import('../pages/Companies'));

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
        <Route path="/signup" element={<Navigate to="/onboard" replace />} />

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
