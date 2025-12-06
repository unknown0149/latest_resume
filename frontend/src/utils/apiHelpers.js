/**
 * Enhanced API utility with retry logic and error handling
 */

import axios from 'axios';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Exponential backoff calculator
 */
const getRetryDelay = (retryCount) => {
  const delay = Math.min(
    RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
    RETRY_CONFIG.maxDelay
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
};

/**
 * Check if error is retryable
 */
const isRetryable = (error) => {
  if (!error.response) return true; // Network error, retry
  if (RETRY_CONFIG.retryableStatuses.includes(error.response.status)) return true;
  return false;
};

/**
 * Retry wrapper for API calls
 */
export const withRetry = async (fn, retries = RETRY_CONFIG.maxRetries) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && isRetryable(error)) {
      const delay = getRetryDelay(RETRY_CONFIG.maxRetries - retries);
      console.log(`Retrying request in ${Math.round(delay)}ms... (${retries} retries left)`);
      
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
};

/**
 * Format error for user display
 */
export const formatApiError = (error) => {
  if (error.response?.data) {
    const { message, errors, code } = error.response.data;
    
    if (errors && Array.isArray(errors)) {
      return {
        message: message || 'Validation failed',
        details: errors.map((e) => e.message || e.field).join(', '),
        code: code || 'VALIDATION_ERROR',
      };
    }
    
    return {
      message: message || 'An error occurred',
      code: code || 'ERROR',
    };
  }
  
  if (error.request) {
    return {
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
    };
  }
  
  return {
    message: error.message || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
};

/**
 * Check if token needs refresh (within 5 minutes of expiry)
 */
export const shouldRefreshToken = () => {
  const tokenExpiry = localStorage.getItem('token_expiry');
  if (!tokenExpiry) return false;
  
  const expiryTime = new Date(tokenExpiry).getTime();
  const currentTime = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return expiryTime - currentTime < fiveMinutes;
};

/**
 * Refresh authentication token
 */
export const refreshAuthToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      console.warn('No refresh token available - user needs to login again');
      throw new Error('No refresh token available');
    }
    
    console.log('🔄 Attempting to refresh authentication token...');
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/refresh`,
      { refreshToken }
    );
    
    const { token, expiresIn } = response.data;
    localStorage.setItem('auth_token', token);
    
    const expiryTime = new Date(Date.now() + expiresIn * 1000);
    localStorage.setItem('token_expiry', expiryTime.toISOString());
    
    console.log('✅ Token refreshed successfully');
    return token;
  } catch (error) {
    console.error('❌ Token refresh failed:', error.response?.data || error.message);
    // Refresh failed, clear tokens and redirect to login
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('user');
    
    // Redirect without alert (silent)
    console.warn('Session expired, redirecting to login...');
    
    window.location.href = '/login';
    throw error;
  }
};

/**
 * Queue for pending requests during token refresh
 */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

/**
 * Enhanced axios interceptor for token refresh
 */
export const setupTokenRefreshInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // Handle 401 (token expired)
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Queue this request until token is refreshed
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axiosInstance(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }
        
        originalRequest._retry = true;
        isRefreshing = true;
        
        try {
          const token = await refreshAuthToken();
          originalRequest.headers.Authorization = `Bearer ${token}`;
          processQueue(null, token);
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
      
      return Promise.reject(error);
    }
  );
};

/**
 * Proactive token refresh before API calls
 */
export const ensureValidToken = async () => {
  if (shouldRefreshToken()) {
    try {
      await refreshAuthToken();
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  }
};

export default {
  withRetry,
  formatApiError,
  shouldRefreshToken,
  refreshAuthToken,
  setupTokenRefreshInterceptor,
  ensureValidToken,
};
