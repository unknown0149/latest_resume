import api from './api';

/**
 * Authentication Service
 * Handles all auth-related API calls including OTP verification
 */

export const authService = {
  /**
   * Register new user
   */
  async register(name, email, password) {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  /**
   * Login user
   */
  async login(email, password, otp = null) {
    const response = await api.post('/auth/login', { email, password, otp });
    return response.data;
  },

  /**
   * Verify email with OTP
   */
  async verifyEmail(email, otp) {
    const response = await api.post('/auth/verify-email', { email, otp });
    return response.data;
  },

  /**
   * Resend verification OTP
   */
  async resendVerification(email) {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  /**
   * Send forgot password OTP
   */
  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with OTP
   */
  async resetPassword(email, otp, newPassword) {
    const response = await api.post('/auth/reset-password', { email, otp, newPassword });
    return response.data;
  },

  /**
   * Enable 2FA
   */
  async enable2FA() {
    const response = await api.post('/auth/enable-2fa');
    return response.data;
  },

  /**
   * Disable 2FA
   */
  async disable2FA() {
    const response = await api.post('/auth/disable-2fa');
    return response.data;
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Logout user
   */
  async logout() {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return response.data;
  },

  /**
   * Verify token validity
   */
  async verifyToken(token) {
    const response = await api.post('/auth/verify-token', { token });
    return response.data;
  }
};

export default authService;
