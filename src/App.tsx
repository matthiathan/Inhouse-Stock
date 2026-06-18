/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import { SCLDispatchForm } from './components/SCLDispatchForm';
import { StockPage, AssetsPage, ScannerPage, SettingsPage, LoginPage, AssetDetailsPage, CustomerDetailsPage, AnalyticsPage, OrdersPage, OrderFulfillmentPage, RoutePlannerPage, TechRoutePage, SCLTechClosurePage, ServiceBillingReport } from './pages';
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Core Application Error Boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('demo_user_role');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-base text-text-primary p-6 font-sans">
          <div className="bg-bg-elevated max-w-md w-full p-8 border border-brand-border rounded-xl shadow-lg text-center flex flex-col items-center">
            <span className="text-4xl mb-4">⚠️</span>
            <h1 className="text-xl font-bold text-text-primary mb-2">System Interruption</h1>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              Dallmayr SA portal encountered an unhandled exception. This could be due to network fluctuations or unauthorized routing.
            </p>
            {this.state.error && (
              <pre className="bg-bg-base text-[11px] text-red-500 font-mono p-4 rounded border border-brand-border w-full text-left overflow-auto max-h-32 mb-6">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => window.location.reload()} 
                className="flex-1 bg-brand-gold text-white p-3 rounded-lg hover:bg-brand-gold/90 transition-colors text-xs font-semibold cursor-pointer"
              >
                Reload Portal
              </button>
              <button 
                onClick={this.handleReset} 
                className="flex-1 bg-text-secondary/15 text-text-primary p-3 rounded-lg hover:bg-text-secondary/25 transition-colors text-xs font-semibold cursor-pointer border border-brand-border"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
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
    <ErrorBoundary>
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
              path="finance-audit" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'finance']}>
                  <ServiceBillingReport />
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
    </ErrorBoundary>
  );
}
