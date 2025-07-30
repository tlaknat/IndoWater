import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './utils/ThemeContext';
import { AuthProvider, useAuth } from './utils/AuthContext';
import './utils/i18n';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
              
              {/* Protected routes (require authentication) */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              {/* Superadmin routes */}
              <Route path="/admin/*" element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  {/* Admin routes will be defined here */}
                  <div>Admin Panel</div>
                </ProtectedRoute>
              } />
              
              {/* Client routes */}
              <Route path="/client/*" element={
                <ProtectedRoute allowedRoles={['client']}>
                  {/* Client routes will be defined here */}
                  <div>Client Panel</div>
                </ProtectedRoute>
              } />
              
              {/* Customer routes */}
              <Route path="/customer/*" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  {/* Customer routes will be defined here */}
                  <div>Customer Panel</div>
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