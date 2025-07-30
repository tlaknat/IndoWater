import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize auth state from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    
    setLoading(false);
  }, []);
  
  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        email,
        password
      });
      
      const { token, user } = response.data.data;
      
      // Store token and user in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set Authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      setLoading(false);
      
      return { success: true, user };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      setLoading(false);
      
      return { success: false, error: errorMessage };
    }
  };
  
  // Register function
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if registration is enabled
      const settingsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/settings/features`);
      const { registration_enabled } = settingsResponse.data.data;
      
      if (!registration_enabled) {
        setError('Registration is currently disabled. Please contact the administrator.');
        setLoading(false);
        return { success: false, error: 'Registration is currently disabled.' };
      }
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/register`, userData);
      
      setLoading(false);
      
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      setLoading(false);
      
      return { success: false, error: errorMessage };
    }
  };
  
  // Logout function
  const logout = async () => {
    setLoading(true);
    
    try {
      // Call logout API endpoint
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/logout`);
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      // Remove token and user from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Remove Authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      setUser(null);
      setLoading(false);
    }
  };
  
  // Forgot password function
  const forgotPassword = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/forgot-password`, { email });
      
      setLoading(false);
      
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to send password reset link. Please try again.';
      setError(errorMessage);
      setLoading(false);
      
      return { success: false, error: errorMessage };
    }
  };
  
  // Reset password function
  const resetPassword = async (token, password, confirmPassword) => {
    setLoading(true);
    setError(null);
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return { success: false, error: 'Passwords do not match' };
    }
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/reset-password`, {
        token,
        password
      });
      
      setLoading(false);
      
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(errorMessage);
      setLoading(false);
      
      return { success: false, error: errorMessage };
    }
  };
  
  // Verify email function
  const verifyEmail = async (token) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/verify-email/${token}`);
      
      setLoading(false);
      
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to verify email. Please try again.';
      setError(errorMessage);
      setLoading(false);
      
      return { success: false, error: errorMessage };
    }
  };
  
  // Resend verification email function
  const resendVerification = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/resend-verification`, { email });
      
      setLoading(false);
      
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to resend verification email. Please try again.';
      setError(errorMessage);
      setLoading(false);
      
      return { success: false, error: errorMessage };
    }
  };
  
  // Update user profile function
  const updateProfile = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/api/users/profile`, userData);
      
      // Update user in state and localStorage
      const updatedUser = { ...user, ...response.data.data.user };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setLoading(false);
      
      return { success: true, message: response.data.message, user: updatedUser };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
      setLoading(false);
      
      return { success: false, error: errorMessage };
    }
  };
  
  // Change password function
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    setLoading(true);
    setError(null);
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return { success: false, error: 'Passwords do not match' };
    }
    
    try {
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/api/users/password`, {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      setLoading(false);
      
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to change password. Please try again.';
      setError(errorMessage);
      setLoading(false);
      
      return { success: false, error: errorMessage };
    }
  };
  
  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user;
  };
  
  // Check if user has a specific role
  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };
  
  // Check if user is a superadmin
  const isSuperAdmin = () => {
    return hasRole('superadmin');
  };
  
  // Check if user is a client
  const isClient = () => {
    return hasRole('client');
  };
  
  // Check if user is a customer
  const isCustomer = () => {
    return hasRole('customer');
  };
  
  // Refresh user data
  const refreshUserData = async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/me`);
      const userData = response.data.data.user;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return userData;
    } catch (err) {
      console.error('Failed to refresh user data:', err);
      
      // If unauthorized, log out the user
      if (err.response?.status === 401) {
        logout();
      }
      
      return null;
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerification,
        updateProfile,
        changePassword,
        isAuthenticated,
        hasRole,
        isSuperAdmin,
        isClient,
        isCustomer,
        refreshUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};