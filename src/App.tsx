/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import { SCLDispatchForm } from './components/SCLDispatchForm';
import { StockPage, AssetsPage, ScannerPage, SettingsPage, LoginPage, AssetDetailsPage, CustomerDetailsPage, AnalyticsPage, OrdersPage, OrderFulfillmentPage, RoutePlannerPage, TechRoutePage, SCLTechClosurePage } from './pages';
import { useAuth } from './hooks/useAuth';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-base text-brand-gold font-mono">
        <div className="animate-pulse">Verifying security parameters...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = role || 'user';

  if (!allowedRoles.includes(userRole)) {
    const redirectTarget = (userRole === 'tech' || userRole === 'road_tech' || userRole === 'user') ? '/scanner' : '/stock';
    return <Navigate to={redirectTarget} replace />;
  }

  return <>{children}</>;
}

function IndexRedirect() {
  const { role } = useAuth();
  const target = (role === 'tech' || role === 'road_tech') ? '/my-route' : (role === 'user' ? '/scanner' : '/stock');
  return <Navigate to={target} replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base text-brand-gold font-mono">
        <div className="animate-pulse">Loading Dallmayr SA system...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        
        <Route 
          path="/*" 
          element={user ? <DashboardLayout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<IndexRedirect />} />
          <Route 
            path="stock" 
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'ops_manager', 'warehouse']}>
                <StockPage />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="orders" 
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'ops_manager', 'warehouse']}>
                <OrdersPage />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="fulfillment" 
            element={
              <RoleProtectedRoute allowedRoles={['warehouse']}>
                <OrderFulfillmentPage />
              </RoleProtectedRoute>
            } 
          />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="assets/:id" element={<AssetDetailsPage />} />
          <Route path="customers/:code" element={<CustomerDetailsPage />} />
          <Route path="scanner" element={<ScannerPage />} />
          <Route 
            path="analytics" 
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'ops_manager']}>
                <AnalyticsPage />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="routes" 
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'ops_manager']}>
                <RoutePlannerPage />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="route-planner" 
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'ops_manager']}>
                <RoutePlannerPage />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="dispatch" 
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'ops_manager']}>
                <SCLDispatchForm />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="my-route" 
            element={
              <RoleProtectedRoute allowedRoles={['tech', 'road_tech']}>
                <TechRoutePage />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="tech-closure/:id" 
            element={
              <RoleProtectedRoute allowedRoles={['tech', 'road_tech']}>
                <SCLTechClosurePage />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="tech-route" 
            element={
              <RoleProtectedRoute allowedRoles={['tech', 'road_tech']}>
                <TechRoutePage />
              </RoleProtectedRoute>
            } 
          />
          <Route 
            path="settings" 
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'ops_manager']}>
                <SettingsPage />
              </RoleProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
