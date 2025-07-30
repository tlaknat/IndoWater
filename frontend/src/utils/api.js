import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired)
    if (error.response && error.response.status === 401) {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login page
      window.location.href = '/login?session=expired';
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (userData) => api.post('/api/auth/register', userData),
  logout: () => api.post('/api/auth/logout'),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/api/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.get(`/api/auth/verify-email/${token}`),
  resendVerification: (email) => api.post('/api/auth/resend-verification', { email }),
  refreshToken: () => api.post('/api/auth/refresh')
};

// User API
export const userAPI = {
  getCurrentUser: () => api.get('/api/users/me'),
  updateProfile: (userData) => api.put('/api/users/profile', userData),
  changePassword: (currentPassword, newPassword) => api.put('/api/users/password', {
    current_password: currentPassword,
    new_password: newPassword
  }),
  getUsers: (params) => api.get('/api/users', { params }),
  getUser: (id) => api.get(`/api/users/${id}`),
  createUser: (userData) => api.post('/api/users', userData),
  updateUser: (id, userData) => api.put(`/api/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/api/users/${id}`)
};

// Client API
export const clientAPI = {
  getClients: (params) => api.get('/api/clients', { params }),
  getClient: (id) => api.get(`/api/clients/${id}`),
  createClient: (clientData) => api.post('/api/clients', clientData),
  updateClient: (id, clientData) => api.put(`/api/clients/${id}`, clientData),
  deleteClient: (id) => api.delete(`/api/clients/${id}`),
  activateClient: (id) => api.put(`/api/clients/${id}/activate`),
  deactivateClient: (id) => api.put(`/api/clients/${id}/deactivate`),
  getClientProperties: (id, params) => api.get(`/api/clients/${id}/properties`, { params }),
  getClientCustomers: (id, params) => api.get(`/api/clients/${id}/customers`, { params }),
  getClientMeters: (id, params) => api.get(`/api/clients/${id}/meters`, { params }),
  getClientPayments: (id, params) => api.get(`/api/clients/${id}/payments`, { params }),
  getClientReports: (id, params) => api.get(`/api/clients/${id}/reports`, { params }),
  getClientInvoices: (id, params) => api.get(`/api/clients/${id}/invoices`, { params })
};

// Property API
export const propertyAPI = {
  getProperties: (params) => api.get('/api/properties', { params }),
  getProperty: (id) => api.get(`/api/properties/${id}`),
  createProperty: (propertyData) => api.post('/api/properties', propertyData),
  updateProperty: (id, propertyData) => api.put(`/api/properties/${id}`, propertyData),
  deleteProperty: (id) => api.delete(`/api/properties/${id}`),
  getPropertyMeters: (id, params) => api.get(`/api/properties/${id}/meters`, { params }),
  getPropertyCustomers: (id, params) => api.get(`/api/properties/${id}/customers`, { params })
};

// Customer API
export const customerAPI = {
  getCustomers: (params) => api.get('/api/customers', { params }),
  getCustomer: (id) => api.get(`/api/customers/${id}`),
  createCustomer: (customerData) => api.post('/api/customers', customerData),
  updateCustomer: (id, customerData) => api.put(`/api/customers/${id}`, customerData),
  deleteCustomer: (id) => api.delete(`/api/customers/${id}`),
  activateCustomer: (id) => api.put(`/api/customers/${id}/activate`),
  deactivateCustomer: (id) => api.put(`/api/customers/${id}/deactivate`),
  getCustomerMeters: (id, params) => api.get(`/api/customers/${id}/meters`, { params }),
  getCustomerTransactions: (id, params) => api.get(`/api/customers/${id}/transactions`, { params }),
  getCustomerPayments: (id, params) => api.get(`/api/customers/${id}/payments`, { params }),
  getCustomerInvoices: (id, params) => api.get(`/api/customers/${id}/invoices`, { params })
};

// Meter API
export const meterAPI = {
  getMeters: (params) => api.get('/api/meters', { params }),
  getMeter: (id) => api.get(`/api/meters/${id}`),
  createMeter: (meterData) => api.post('/api/meters', meterData),
  updateMeter: (id, meterData) => api.put(`/api/meters/${id}`, meterData),
  deleteMeter: (id) => api.delete(`/api/meters/${id}`),
  activateMeter: (id) => api.put(`/api/meters/${id}/activate`),
  deactivateMeter: (id) => api.put(`/api/meters/${id}/deactivate`),
  getMeterReadings: (id, params) => api.get(`/api/meters/${id}/readings`, { params }),
  getMeterTransactions: (id, params) => api.get(`/api/meters/${id}/transactions`, { params }),
  getMeterCredits: (id, params) => api.get(`/api/meters/${id}/credits`, { params }),
  addMeterReading: (id, readingData) => api.post(`/api/meters/${id}/readings`, readingData),
  addMeterCredit: (id, creditData) => api.post(`/api/meters/${id}/credits`, creditData)
};

// Tariff API
export const tariffAPI = {
  getTariffs: (params) => api.get('/api/tariffs', { params }),
  getTariff: (id) => api.get(`/api/tariffs/${id}`),
  createTariff: (tariffData) => api.post('/api/tariffs', tariffData),
  updateTariff: (id, tariffData) => api.put(`/api/tariffs/${id}`, tariffData),
  deleteTariff: (id) => api.delete(`/api/tariffs/${id}`),
  assignTariff: (id, assignData) => api.post(`/api/tariffs/${id}/assign`, assignData)
};

// Payment API
export const paymentAPI = {
  getPayments: (params) => api.get('/api/payments', { params }),
  getPayment: (id) => api.get(`/api/payments/${id}`),
  createPayment: (paymentData) => api.post('/api/payments', paymentData),
  updatePayment: (id, paymentData) => api.put(`/api/payments/${id}`, paymentData),
  verifyPayment: (id) => api.put(`/api/payments/${id}/verify`),
  cancelPayment: (id) => api.put(`/api/payments/${id}/cancel`),
  getPaymentMethods: () => api.get('/api/payment-methods'),
  getPaymentGateways: () => api.get('/api/payment-gateways')
};

// Invoice API
export const invoiceAPI = {
  getInvoices: (params) => api.get('/api/invoices', { params }),
  getInvoice: (id) => api.get(`/api/invoices/${id}`),
  createInvoice: (invoiceData) => api.post('/api/invoices', invoiceData),
  updateInvoice: (id, invoiceData) => api.put(`/api/invoices/${id}`, invoiceData),
  deleteInvoice: (id) => api.delete(`/api/invoices/${id}`),
  sendInvoice: (id) => api.post(`/api/invoices/${id}/send`),
  markAsPaid: (id, paymentData) => api.put(`/api/invoices/${id}/mark-as-paid`, paymentData),
  markAsUnpaid: (id) => api.put(`/api/invoices/${id}/mark-as-unpaid`)
};

// Service Fee API
export const serviceFeeAPI = {
  getServiceFees: (params) => api.get('/api/service-fees', { params }),
  getServiceFee: (id) => api.get(`/api/service-fees/${id}`),
  createServiceFee: (serviceFeeData) => api.post('/api/service-fees', serviceFeeData),
  updateServiceFee: (id, serviceFeeData) => api.put(`/api/service-fees/${id}`, serviceFeeData),
  deleteServiceFee: (id) => api.delete(`/api/service-fees/${id}`),
  payServiceFee: (id, paymentData) => api.post(`/api/service-fees/${id}/pay`, paymentData),
  uploadPaymentProof: (id, formData) => api.post(`/api/service-fees/${id}/upload-proof`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
};

// Settings API
export const settingsAPI = {
  getSettings: () => api.get('/api/settings'),
  updateSettings: (settingsData) => api.put('/api/settings', settingsData),
  getFeatureSettings: () => api.get('/api/settings/features'),
  updateFeatureSettings: (featureData) => api.put('/api/settings/features', featureData),
  getPaymentSettings: () => api.get('/api/settings/payment'),
  updatePaymentSettings: (paymentData) => api.put('/api/settings/payment', paymentData),
  getEmailSettings: () => api.get('/api/settings/email'),
  updateEmailSettings: (emailData) => api.put('/api/settings/email', emailData),
  testEmailSettings: (emailData) => api.post('/api/settings/email/test', emailData),
  getSmsSettings: () => api.get('/api/settings/sms'),
  updateSmsSettings: (smsData) => api.put('/api/settings/sms', smsData),
  testSmsSettings: (smsData) => api.post('/api/settings/sms/test', smsData),
  getWhatsappSettings: () => api.get('/api/settings/whatsapp'),
  updateWhatsappSettings: (whatsappData) => api.put('/api/settings/whatsapp', whatsappData),
  testWhatsappSettings: (whatsappData) => api.post('/api/settings/whatsapp/test', whatsappData)
};

// Report API
export const reportAPI = {
  getReports: (params) => api.get('/api/reports', { params }),
  getReport: (id) => api.get(`/api/reports/${id}`),
  generateReport: (reportData) => api.post('/api/reports', reportData),
  downloadReport: (id, format) => api.get(`/api/reports/${id}/download`, {
    params: { format },
    responseType: 'blob'
  })
};

// Dashboard API
export const dashboardAPI = {
  getSummary: () => api.get('/api/dashboard/summary'),
  getRevenueChart: (params) => api.get('/api/dashboard/revenue-chart', { params }),
  getConsumptionChart: (params) => api.get('/api/dashboard/consumption-chart', { params }),
  getCustomerStats: () => api.get('/api/dashboard/customer-stats'),
  getMeterStats: () => api.get('/api/dashboard/meter-stats'),
  getRecentTransactions: () => api.get('/api/dashboard/recent-transactions'),
  getRecentPayments: () => api.get('/api/dashboard/recent-payments'),
  getAlerts: () => api.get('/api/dashboard/alerts')
};

// Topup API
export const topupAPI = {
  validateMeter: (meterId) => api.get(`/api/topup/validate-meter/${meterId}`),
  validateCustomer: (customerNumber) => api.get(`/api/topup/validate-customer/${customerNumber}`),
  getTopupAmounts: () => api.get('/api/topup/amounts'),
  calculateFee: (amount, paymentMethod) => api.post('/api/topup/calculate-fee', { amount, payment_method: paymentMethod }),
  createTopup: (topupData) => api.post('/api/topup', topupData),
  getTopupStatus: (id) => api.get(`/api/topup/${id}/status`),
  getTopupReceipt: (id) => api.get(`/api/topup/${id}/receipt`, { responseType: 'blob' })
};

export default api;