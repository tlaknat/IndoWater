import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './utils/ThemeContext';
import { AuthProvider, useAuth } from './utils/AuthContext';
import './utils/i18n';

// Lazy load auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Lazy load common pages
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Lazy load role-specific dashboards
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));

// Protected route component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, hasRole } = useAuth();
  
  if (!isAuthenticated()) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  // If roles are specified, check if user has any of the allowed roles
  if (allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => hasRole(role));
    
    if (!hasAllowedRole) {
      // Redirect to dashboard if authenticated but doesn't have the required role
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return children;
};

// Public route component (accessible only when not authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated()) {
    // Redirect to dashboard if already authenticated
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Dashboard router - redirects to the appropriate dashboard based on user role
const DashboardRouter = () => {
  const { hasRole } = useAuth();
  
  if (hasRole('superadmin')) {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (hasRole('client')) {
    return <Navigate to="/client/dashboard" replace />;
  } else if (hasRole('customer')) {
    return <Navigate to="/customer/dashboard" replace />;
  }
  
  // Default fallback
  return <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          }>
            <Routes>
              {/* Public routes (only accessible when not authenticated) */}
              <Route path="/login" element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } />
              <Route path="/register" element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              } />
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              } />
              <Route path="/reset-password/:token" element={
                <PublicRoute>
                  <ResetPasswordPage />
                </PublicRoute>
              } />
              
              {/* Dashboard router */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              } />
              
              {/* Profile page (accessible to all authenticated users) */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              
              {/* Superadmin routes */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/clients" element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  {/* Client management page will be implemented here */}
                  <div>Client Management</div>
                </ProtectedRoute>
              } />
              <Route path="/admin/clients/add" element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  {/* Add client page will be implemented here */}
                  <div>Add Client</div>
                </ProtectedRoute>
              } />
              <Route path="/admin/clients/:id" element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  {/* Client details page will be implemented here */}
                  <div>Client Details</div>
                </ProtectedRoute>
              } />
              <Route path="/admin/clients/:id/edit" element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  {/* Edit client page will be implemented here */}
                  <div>Edit Client</div>
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  {/* User management page will be implemented here */}
                  <div>User Management</div>
                </ProtectedRoute>
              } />
              <Route path="/admin/settings/*" element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  {/* Settings pages will be implemented here */}
                  <div>Settings</div>
                </ProtectedRoute>
              } />
              <Route path="/admin/reports/*" element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  {/* Reports pages will be implemented here */}
                  <div>Reports</div>
                </ProtectedRoute>
              } />
              
              {/* Client routes */}
              <Route path="/client/dashboard" element={
                <ProtectedRoute allowedRoles={['client']}>
                  <ClientDashboard />
                </ProtectedRoute>
              } />
              <Route path="/client/properties" element={
                <ProtectedRoute allowedRoles={['client']}>
                  {/* Properties management page will be implemented here */}
                  <div>Properties Management</div>
                </ProtectedRoute>
              } />
              <Route path="/client/customers" element={
                <ProtectedRoute allowedRoles={['client']}>
                  {/* Customers management page will be implemented here */}
                  <div>Customers Management</div>
                </ProtectedRoute>
              } />
              <Route path="/client/meters" element={
                <ProtectedRoute allowedRoles={['client']}>
                  {/* Meters management page will be implemented here */}
                  <div>Meters Management</div>
                </ProtectedRoute>
              } />
              <Route path="/client/tariffs" element={
                <ProtectedRoute allowedRoles={['client']}>
                  {/* Tariffs management page will be implemented here */}
                  <div>Tariffs Management</div>
                </ProtectedRoute>
              } />
              <Route path="/client/payments" element={
                <ProtectedRoute allowedRoles={['client']}>
                  {/* Payments management page will be implemented here */}
                  <div>Payments Management</div>
                </ProtectedRoute>
              } />
              <Route path="/client/invoices" element={
                <ProtectedRoute allowedRoles={['client']}>
                  {/* Invoices management page will be implemented here */}
                  <div>Invoices Management</div>
                </ProtectedRoute>
              } />
              <Route path="/client/reports/*" element={
                <ProtectedRoute allowedRoles={['client']}>
                  {/* Reports pages will be implemented here */}
                  <div>Reports</div>
                </ProtectedRoute>
              } />
              <Route path="/client/settings" element={
                <ProtectedRoute allowedRoles={['client']}>
                  {/* Settings page will be implemented here */}
                  <div>Settings</div>
                </ProtectedRoute>
              } />
              
              {/* Customer routes */}
              <Route path="/customer/dashboard" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <CustomerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/customer/meters" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  {/* Meters page will be implemented here */}
                  <div>My Meters</div>
                </ProtectedRoute>
              } />
              <Route path="/customer/meters/:id" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  {/* Meter details page will be implemented here */}
                  <div>Meter Details</div>
                </ProtectedRoute>
              } />
              <Route path="/customer/topup" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  {/* Top up page will be implemented here */}
                  <div>Top Up</div>
                </ProtectedRoute>
              } />
              <Route path="/customer/payments" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  {/* Payments page will be implemented here */}
                  <div>My Payments</div>
                </ProtectedRoute>
              } />
              <Route path="/customer/usage" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  {/* Usage page will be implemented here */}
                  <div>My Usage</div>
                </ProtectedRoute>
              } />
              <Route path="/customer/invoices" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  {/* Invoices page will be implemented here */}
                  <div>My Invoices</div>
                </ProtectedRoute>
              } />
              <Route path="/customer/support" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  {/* Support page will be implemented here */}
                  <div>Support</div>
                </ProtectedRoute>
              } />
              
              {/* Redirect root to login or dashboard based on authentication */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;