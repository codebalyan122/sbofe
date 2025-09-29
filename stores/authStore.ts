import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { webUrl } from '../utils/webUrl';
import { baseUrl } from '../utils/baseUrl';

// Get API URL based on platform
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return webUrl;
  } else {
    return baseUrl;
  }
};

const API_URL = getApiUrl();

// Create platform-specific storage adapter
const createStorage = () => {
  if (Platform.OS === 'web') {
    // Web storage using localStorage
    return {
      getItem: async (name: string) => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const value = window.localStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          }
          return null;
        } catch (error) {
          console.error('Error getting item from localStorage:', error);
          return null;
        }
      },
      setItem: async (name: string, value: any) => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(name, JSON.stringify(value));
          }
        } catch (error) {
          console.error('Error setting item to localStorage:', error);
        }
      },
      removeItem: async (name: string) => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(name);
          }
        } catch (error) {
          console.error('Error removing item from localStorage:', error);
        }
      },
    };
  } else {
    // Mobile storage using AsyncStorage
    return {
      getItem: async (name: string) => {
        try {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        } catch (error) {
          console.error('Error getting item from AsyncStorage:', error);
          return null;
        }
      },
      setItem: async (name: string, value: any) => {
        try {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        } catch (error) {
          console.error('Error setting item to AsyncStorage:', error);
        }
      },
      removeItem: async (name: string) => {
        try {
          await AsyncStorage.removeItem(name);
        } catch (error) {
          console.error('Error removing item from AsyncStorage:', error);
        }
      },
    };
  }
};

// User interface
interface User {
  id: string;
  username: string;
  email: string;
  userType: 'user' | 'areaManager' | 'moderator' | 'admin';
  area?: string;
  createdAt?: string;
}

// Auth Store State Interface
interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string, userType: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  
  // Helper methods
  getAuthHeaders: () => { [key: string]: string };
  checkAuthStatus: () => Promise<boolean>;
}

// Create the auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      // Actions
      login: async (email: string, password: string, userType: string): Promise<boolean> => {
        try {
          set({ isLoading: true, error: null });

          console.log('🔄 [AUTH STORE] Making login request...');
          
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email.trim(),
              password: password.trim(),
              userType: userType
            }),
          });

          const data = await response.json();
          console.log('🔍 [AUTH STORE] Login response:', data);      
          if (response.ok && data.token && data.user) {
            console.log('🔍 [AUTH STORE] Setting token:', data.token.substring(0, 20) + '...');
            console.log('🔍 [AUTH STORE] Setting user:', data.user.username);
            
            set({
              user: {
                id: data.user._id || data.user.id,
                username: data.user.username,
                email: data.user.email,
                userType: data.user.userType,
                area: data.user.area,
                createdAt: data.user.createdAt
              },
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });

            // Verify the token was set correctly
            const { token: savedToken } = get();
            console.log('✅ [AUTH STORE] Token saved successfully:', !!savedToken);
            console.log('✅ [AUTH STORE] Login successful');
            return true;
          } else {
            set({
              error: data.error || 'Login failed',
              isLoading: false
            });
            return false;
          }
        } catch (error) {
          console.error('❌ [AUTH STORE] Login error:', error);
          set({
            error: error instanceof Error ? error.message : 'Network error',
            isLoading: false
          });
          return false;
        }
      },

      logout: async (): Promise<void> => {
        try {
          console.log('🔄 [AUTH STORE] Logging out...');
          
          // Clear the store state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null
          });

          console.log('✅ [AUTH STORE] Logout successful');
        } catch (error) {
          console.error('❌ [AUTH STORE] Logout error:', error);
        }
      },

      fetchUserProfile: async (): Promise<void> => {
        try {
          const { token } = get();
          if (!token) {
            throw new Error('No authentication token found');
          }

          set({ isLoading: true, error: null });       
          console.log('🔄 [AUTH STORE] Fetching user profile...');
          
          const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            if (response.status === 401) {
              // Invalid token, logout user
              get().logout();
              throw new Error('Session expired. Please log in again.');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          console.log('🔍 [AUTH STORE] Profile response:', result);

          if (result.success && result.data) {
            set({
              user: {
                id: result.data.id,
                username: result.data.username,
                email: result.data.email,
                userType: result.data.userType,
                area: result.data.area,
                createdAt: result.data.createdAt
              },
              isLoading: false,
              error: null
            });

            console.log('✅ [AUTH STORE] Profile updated successfully');
          } else {
            throw new Error(result.error || 'Failed to fetch profile');
          }
        } catch (error) {
          console.error('❌ [AUTH STORE] Profile fetch error:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch profile',
            isLoading: false
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },      // Helper method to get auth headers
      getAuthHeaders: (): { [key: string]: string } => {
        const { token } = get();
        console.log('🔍 [AUTH STORE] Getting auth headers, token exists:', !!token);
        if (token) {
          console.log('🔍 [AUTH STORE] Token preview:', token.substring(0, 20) + '...');
        } else {
          console.log('❌ [AUTH STORE] No auth token found');
        }
        return {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };
      },      // Check if user is still authenticated
      checkAuthStatus: async (): Promise<boolean> => {
        try {
          const { token, user } = get();
          
          console.log('🔍 [AUTH STORE] Checking auth status...');
          console.log('🔍 [AUTH STORE] Token exists:', !!token);
          console.log('🔍 [AUTH STORE] User exists:', !!user);
          
          if (!token || !user) {
            console.log('❌ [AUTH STORE] No token or user found');
            return false;
          }          
          
          console.log('🔄 [AUTH STORE] Verifying token with backend...');
          // Optionally verify token with backend
          const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'GET',
            headers: get().getAuthHeaders(),
          });

          console.log('🔍 [AUTH STORE] Auth check response status:', response.status);

          if (response.ok) {
            console.log('✅ [AUTH STORE] Auth status verified');
            return true;
          } else {
            console.log('❌ [AUTH STORE] Auth verification failed, logging out...');
            // Token is invalid, logout
            get().logout();
            return false;
          }
        } catch (error) {
          console.error('❌ [AUTH STORE] Auth check error:', error);
          return false;
        }
      }}),    {
      name: 'sbo-auth-storage', // Storage key
      storage: createStorage(),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        console.log('🔄 [AUTH STORE] Starting hydration from storage...');
        return (state, error) => {
          if (error) {
            console.error('❌ [AUTH STORE] Hydration error:', error);
          } else {
            console.log('✅ [AUTH STORE] Hydration complete');
            console.log('🔍 [AUTH STORE] Hydrated state:', {
              hasUser: !!state?.user,
              hasToken: !!state?.token,
              isAuthenticated: state?.isAuthenticated,
              username: state?.user?.username
            });
          }
        };
      },
    }
  )
);
