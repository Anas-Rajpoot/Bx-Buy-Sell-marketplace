import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone?: string;
  business_name?: string;
  profile_pic?: string;
  availability_status?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    
    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'user_data') {
        checkAuth();
      }
    };
    
    // Listen for logout events from API client
    const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:logout', handleLogout);
    
    // Also check periodically (every 5 seconds) to catch local changes
    const interval = setInterval(() => {
      checkAuth();
    }, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:logout', handleLogout);
      clearInterval(interval);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          // Ensure API client has the token
          apiClient.setToken(token);
          apiClient.setBearerToken(token);
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          // Clear invalid data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          setUser(null);
        }
      } else {
        // No token or user data - ensure user is null
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiClient.signIn({ email, password });
    
    if (response.success && response.data?.user) {
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    }
    
    return { success: false, error: response.error };
  };

  const signup = async (userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    confirm_password: string;
  }) => {
    const response = await apiClient.signUp(userData);
    
    if (response.success && response.data?.user) {
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    }
    
    return { success: false, error: response.error };
  };

  const logout = async () => {
    if (user?.id) {
      await apiClient.logout(user.id);
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  const refreshUser = async () => {
    if (user?.id) {
      const response = await apiClient.getUserById(user.id);
      if (response.success && response.data) {
        setUser(response.data);
        localStorage.setItem('user_data', JSON.stringify(response.data));
      }
    }
  };

  return {
    user,
    loading,
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };
};

