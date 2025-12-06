import { useState, useEffect, createContext, useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { RESUME_CACHE_EVENT, RESUME_CACHE_STORAGE_KEY } from './useResumeContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Setup axios interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('auth_token');
    
    if (!storedToken) {
      setLoading(false);
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });

      if (response.data.success) {
        setUser(response.data.user);
        setToken(storedToken);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        // Token invalid
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role = 'user') => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password,
        role
      });

      if (response.data.success) {
        const { user, token, refreshToken } = response.data;
        
        setUser(user);
        setToken(token);
        setIsAuthenticated(true);
        
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        return { success: true, user };
      }

      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login...');
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      if (response.data.success) {
        const { user, token, refreshToken } = response.data;
        
        console.log('✅ Login successful, storing credentials...');
        console.log('Token length:', token?.length);
        
        setUser(user);
        setToken(token);
        setIsAuthenticated(true);
        
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Set on axios defaults as backup
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('✅ Credentials stored, token set in axios');
        console.log('Stored token:', localStorage.getItem('auth_token')?.substring(0, 20) + '...');
        
        return { success: true, user };
      }

      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem(RESUME_CACHE_STORAGE_KEY);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(RESUME_CACHE_EVENT));
      }
      
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const refreshToken = async () => {
    const storedRefreshToken = localStorage.getItem('refresh_token');
    
    if (!storedRefreshToken) {
      logout();
      return false;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken: storedRefreshToken
      });

      if (response.data.success) {
        const newToken = response.data.token;
        setToken(newToken);
        localStorage.setItem('auth_token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        return true;
      }

      logout();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    register,
    login,
    logout,
    checkAuth,
    refreshToken,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Protected Route Component
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length && !allowedRoles.includes(user?.role)) {
    const fallback = user?.role === 'recruiter' ? '/recruiter' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

// Axios interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken
          });

          if (response.data.success) {
            const newToken = response.data.token;
            localStorage.setItem('auth_token', newToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return axios(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Logout and redirect
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default useAuth;
