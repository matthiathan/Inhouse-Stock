/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import { SCLDispatchForm } from './components/SCLDispatchForm';
import { StockPage, WarehousePage, AssetsPage, NewAssetPage, ScannerPage, SettingsPage, LoginPage, AssetDetailsPage, CustomerDetailsPage, AnalyticsPage, OrdersPage, OrderFulfillmentPage, TechRoutePage, TechTicketPage, ServiceTasksPage, DispatchRoutingHub } from './pages';
import { useAuth } from './hooks/useAuth';
import { isConfigured } from './lib/supabase';

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
    const redirectTarget = (userRole === 'tech' || userRole === 'road_tech' || userRole === 'user') ? '/scanner' : '/warehouse';
    return <Navigate to={redirectTarget} replace />;
  }

  return <>{children}</>;
}

function IndexRedirect() {
  const { role } = useAuth();
  const target = (role === 'tech' || role === 'road_tech') ? '/my-route' : (role === 'user' ? '/scanner' : '/warehouse');
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

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#111111] text-white p-6 font-sans">
        <div className="bg-[#1c1c1c] max-w-2xl w-full p-8 rounded-2xl border border-amber-500/20 shadow-2xl space-y-6">
          <div className="flex items-center gap-4 border-b border-amber-500/10 pb-5">
            <span className="p-3 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database-backup"><path d="M4 15a8 8 0 0 0 16 0"/><path d="M12 2v4"/><path d="m9 5 3-3 3 3"/><path d="M3 15h12c1.7 0 3 1.3 3 3v2c0 .6-.4 1-1 1H4a1 1 0 0 1-1-1v-2c0-1.7 1.3-3 3-3z"/></svg>
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight uppercase">Database Connection Required</h1>
              <p className="text-xs text-stone-400 mt-1">Dallmayr SA Enterprise core operations dashboard requires active linkage to Supabase.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4.5 bg-stone-900/60 rounded-xl border border-stone-800/80 text-xs text-stone-300 leading-relaxed space-y-2">
              <p className="font-bold text-amber-400">Missing Configuration Keys:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-[11px] text-stone-400">
                <li><code className="text-amber-500 font-mono">VITE_SUPABASE_URL</code>: Central database web linkage.</li>
                <li><code className="text-amber-500 font-mono">VITE_SUPABASE_ANON_KEY</code>: Client public authorization key.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">How to configure connectivity:</h3>
              <div className="space-y-3 text-xs text-stone-300">
                <div className="flex gap-3 items-start">
                  <span className="w-5.5 h-5.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-[11px] font-black font-mono shrink-0">1</span>
                  <p className="leading-relaxed">Go to your **Project Settings** (the gear symbol or tab on the left-side panel) inside Google AI Studio.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5.5 h-5.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-[11px] font-black font-mono shrink-0">2</span>
                  <p className="leading-relaxed">Under the **Secrets / Environment Variables** section, configure the following key-value pairings:</p>
                </div>
                <div className="pl-8 bg-[#111111] p-3.5 rounded-xl border border-stone-800/60 font-mono text-[10.5px] text-amber-500/90 space-y-1.5 max-w-full overflow-x-auto">
                  <div>VITE_SUPABASE_URL = <span className="text-stone-400 font-sans italic">"https://your-project.supabase.co"</span></div>
                  <div>VITE_SUPABASE_ANON_KEY = <span className="text-stone-400 font-sans italic">"your_api_anon_public_key"</span></div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5.5 h-5.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-[11px] font-black font-mono shrink-0">3</span>
                  <p className="leading-relaxed">Once saved, type <code className="text-amber-400 bg-amber-400/5 px-1.5 py-0.5 rounded font-mono">proceed</code> or launch development to authorize.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800/80 flex justify-between items-center flex-wrap gap-4">
            <span className="text-[10px] text-stone-500 font-mono uppercase tracking-widest">Awaiting Link Establishment</span>
            <button 
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
            >
              Verify Active Linkage
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              path="warehouse" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'ops_manager', 'warehouse']}>
                  <WarehousePage />
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
            <Route path="assets/new" element={<NewAssetPage />} />
            <Route path="assets/:id" element={<AssetDetailsPage />} />
            <Route path="customers/:code" element={<CustomerDetailsPage />} />
            <Route path="scan" element={<ScannerPage />} />
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
              path="dispatch" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'ops_manager']}>
                  <DispatchRoutingHub />
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
              path="tech-ticket/:id" 
              element={
                <RoleProtectedRoute allowedRoles={['tech', 'road_tech']}>
                  <TechTicketPage />
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
              path="tasks" 
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'finance']}>
                  <ServiceTasksPage />
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
