import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import UserLayout from '../components/layout/UserLayout';

// Resilient lazy loader: automatically reloads the page if a chunk is missing due to a new deployment
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed = sessionStorage.getItem('sa_page_has_been_force_refreshed') === 'true';
    try {
      const component = await componentImport();
      sessionStorage.setItem('sa_page_has_been_force_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        sessionStorage.setItem('sa_page_has_been_force_refreshed', 'true');
        window.location.reload();
        return new Promise(() => {}); // Pause while reloading
      }
      throw error;
    }
  });

// Lazy Loaded Pages for Optimal Code-Splitting and Instant Load Time
const Login = lazyWithRetry(() => import('../pages/Login'));
const Dashboard = lazyWithRetry(() => import('../pages/Dashboard'));
const Companies = lazyWithRetry(() => import('../pages/Companies'));
const FormBuilderPage = lazyWithRetry(() => import('../pages/FormBuilderPage'));
const TicketsPage = lazyWithRetry(() => import('../pages/TicketsPage'));
const Users = lazyWithRetry(() => import('../pages/Users'));
const PlansPage = lazyWithRetry(() => import('../pages/PlansPage'));
const SLAPoliciesPage = lazyWithRetry(() => import('../pages/SLAPoliciesPage'));
const ReportsPage = lazyWithRetry(() => import('../pages/ReportsPage'));
const AuditLogsPage = lazyWithRetry(() => import('../pages/AuditLogsPage'));
const Profile = lazyWithRetry(() => import('../pages/Profile'));

// Elegant Route Suspense Fallback Loader
const SuperAdminPageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
      <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">
        Loading Super Admin Hub...
      </span>
    </div>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<SuperAdminPageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes strictly for SUPER_ADMIN role */}
        <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/form-builder" element={<FormBuilderPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/users" element={<Users />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/sla-policies" element={<SLAPoliciesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
