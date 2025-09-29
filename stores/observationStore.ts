import { create } from 'zustand';
import { Platform } from 'react-native';
import { webUrl } from '../utils/webUrl';
import { baseUrl } from '../utils/baseUrl';
import { useAuthStore } from './authStore';

const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return webUrl;
  } else {
    return baseUrl;
  }
};

const API_URL = getApiUrl();

// SBO Types
type SBOType = 'safe' | 'unsafe' | 'nearmiss';

// Observation Interfaces
interface ObservationFormData {
  type: SBOType;
  title: string;
  description: string;
  location: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high';
  image?: string;
  immediateAction?: string;
  recommendations?: string;
}

interface Observation {
  id: string;
  type: SBOType;
  title: string;
  description: string;
  location: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected' | 'in-progress' | 'completed';
  image?: string;
  immediateAction?: string;
  recommendations?: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: {
    id: string;
    username: string;
    email: string;
  };
}

// Observation Store State Interface
interface ObservationState {
  // State
  observations: Observation[];
  currentObservation: Observation | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  
  // Form state
  formData: ObservationFormData;
  
  // Recent activity state
  recentActivities: Observation[];
  isLoadingRecent: boolean;
  recentError: string | null;
  
  // Actions
  submitObservation: (data: ObservationFormData) => Promise<boolean>;
  fetchObservations: () => Promise<void>;
  fetchObservationById: (id: string) => Promise<void>;
  updateFormData: (data: Partial<ObservationFormData>) => void;
  resetForm: () => void;
  clearError: () => void;
  
  // Recent activity actions
  fetchRecentActivities: () => Promise<void>;
  addRecentActivity: (observation: Observation) => void;
  clearRecentError: () => void;
  
  // Computed values
  getObservationsByType: (type: SBOType) => Observation[];
  getPendingObservations: () => Observation[];
  getCompletedObservations: () => Observation[];
}

// Initial form data
const initialFormData: ObservationFormData = {
  type: 'safe',
  title: '',
  description: '',
  location: '',
  category: '',
  severity: 'low',
  image: '',
  immediateAction: '',
  recommendations: ''
};

// Create the observation store
export const useObservationStore = create<ObservationState>((set, get) => ({
  // Initial State
  observations: [],
  currentObservation: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  formData: initialFormData,
  
  // Recent activity initial state
  recentActivities: [],
  isLoadingRecent: false,
  recentError: null,

  // Actions
  submitObservation: async (data: ObservationFormData): Promise<boolean> => {
    try {
      set({ isSubmitting: true, error: null });

      console.log('🔄 [OBSERVATION STORE] Submitting observation...', data.type);

      const authHeaders = useAuthStore.getState().getAuthHeaders();
      
      // Determine the endpoint based on observation type
      let endpoint = '';
      switch (data.type) {        case 'safe':
          endpoint = `${API_URL}/api/safety/observations`;
          break;
        case 'unsafe':
          endpoint = `${API_URL}/api/unsafe/observations`;
          break;
        case 'nearmiss':
          endpoint = `${API_URL}/api/nearmiss/observations`;
          break;
        default:
          throw new Error('Invalid observation type');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(data),
      });

      console.log(`📝 [OBSERVATION STORE] Submit response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 401) {
          useAuthStore.getState().logout();
          throw new Error('Session expired. Please log in again.');
        }
        
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }      const result = await response.json();
        if (result.success) {
        // Add the new observation to the store if it exists in response
        if (result.data) {
          set(state => ({
            observations: [result.data, ...state.observations],
            isSubmitting: false,
            error: null
          }));          // Add to recent activities
          get().addRecentActivity(result.data);
          
          // 🔄 REAL-TIME UPDATE: Trigger performance metrics update
          console.log('🔄 [OBSERVATION STORE] Triggering real-time performance update for', data.type);
          
          // Use setTimeout to avoid circular dependency issues
          setTimeout(async () => {
            try {
              // Import performance store dynamically to avoid circular dependency
              const performanceModule = await import('./performanceStore');
              performanceModule.usePerformanceStore.getState().incrementSubmissions(data.type);
              
              // Also trigger dashboard refresh for other components
              const dashboardModule = await import('./dashboardStore');
              dashboardModule.useDashboardStore.getState().fetchDashboardData();
            } catch (error) {
              console.warn('⚠️ [OBSERVATION STORE] Failed to trigger performance update:', error);
            }
          }, 0);
        } else {
          set({ isSubmitting: false, error: null });
        }

        // Reset form data
        get().resetForm();

        console.log('✅ [OBSERVATION STORE] Observation submitted successfully');
        return true;
      } else {
        throw new Error(result.message || 'Failed to submit observation');
      }
      
    } catch (error) {
      console.error('❌ [OBSERVATION STORE] Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit observation';
      
      set({
        error: errorMessage,
        isSubmitting: false
      });
      
      return false;
    }
  },

  fetchObservations: async (): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      console.log('🔄 [OBSERVATION STORE] Fetching observations...');

      const authHeaders = useAuthStore.getState().getAuthHeaders();
        // Fetch all types of observations
      const endpoints = [
        `${API_URL}/api/safety/observations`,
        `${API_URL}/api/unsafe/observations`,
        `${API_URL}/api/nearmiss/observations`
      ];

      const responses = await Promise.allSettled(
        endpoints.map(endpoint => 
          fetch(endpoint, {
            method: 'GET',
            headers: authHeaders,
          })
        )
      );

      const allObservations: Observation[] = [];

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (response.status === 'fulfilled' && response.value.ok) {
          try {
            const result = await response.value.json();
            if (result.success && Array.isArray(result.data)) {
              allObservations.push(...result.data);
            }
          } catch (parseError) {
            console.error('Failed to parse response:', parseError);
          }
        }
      }

      // Sort by creation date (newest first)
      allObservations.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      set({
        observations: allObservations,
        isLoading: false,
        error: null
      });

      console.log(`✅ [OBSERVATION STORE] Loaded ${allObservations.length} observations`);
      
    } catch (error) {
      console.error('❌ [OBSERVATION STORE] Fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load observations';
      
      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },

  fetchObservationById: async (id: string): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      console.log('🔄 [OBSERVATION STORE] Fetching observation by ID:', id);

      const authHeaders = useAuthStore.getState().getAuthHeaders();
        // Try to find in different endpoints
      const endpoints = [
        `${API_URL}/api/safety/observations/${id}`,
        `${API_URL}/api/unsafe/observations/${id}`,
        `${API_URL}/api/nearmiss/observations/${id}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: authHeaders,
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              set({
                currentObservation: result.data,
                isLoading: false,
                error: null
              });
              
              console.log('✅ [OBSERVATION STORE] Observation found');
              return;
            }
          }
        } catch (endpointError) {
          // Continue to next endpoint
          continue;
        }
      }

      throw new Error('Observation not found');
      
    } catch (error) {
      console.error('❌ [OBSERVATION STORE] Fetch by ID error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load observation';
      
      set({
        error: errorMessage,
        isLoading: false,
        currentObservation: null
      });
    }
  },

  updateFormData: (data: Partial<ObservationFormData>) => {
    set(state => ({
      formData: { ...state.formData, ...data }
    }));
  },

  resetForm: () => {
    set({ formData: initialFormData });
  },
  clearError: () => {
    set({ error: null });
  },

  // Recent activity actions
  fetchRecentActivities: async (): Promise<void> => {
    try {
      set({ isLoadingRecent: true, recentError: null });

      console.log('🔄 [OBSERVATION STORE] Fetching recent activities...');

      const authHeaders = useAuthStore.getState().getAuthHeaders();
      
      // Try different endpoints for recent activities
      const endpoints = [
        `${API_URL}/api/observations/recent`,
        `${API_URL}/api/dashboard/recent-activities`,
        `${API_URL}/api/safety/recent`,
        `${API_URL}/api/unsafe/recent`
      ];

      let recentActivities: Observation[] = [];

      // Try each endpoint until we find one that works
      for (const endpoint of endpoints) {
        try {
          console.log(`📡 [OBSERVATION STORE] Trying endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: authHeaders,
          });

          console.log(`📡 [OBSERVATION STORE] Response status: ${response.status} for ${endpoint}`);

          if (response.ok) {
            const result = await response.json();
            console.log(`✅ [OBSERVATION STORE] Response data:`, result);

            // Handle different response structures
            if (result.success && Array.isArray(result.data)) {
              recentActivities = result.data;
              break;
            } else if (result.observations && Array.isArray(result.observations)) {
              recentActivities = result.observations;
              break;
            } else if (Array.isArray(result)) {
              recentActivities = result;
              break;
            }
          }
        } catch (endpointError) {
          console.log(`⚠️ [OBSERVATION STORE] Endpoint ${endpoint} failed:`, endpointError);
          continue;
        }
      }

      // If no endpoint worked, fall back to using existing observations
      if (recentActivities.length === 0) {
        console.log('🔄 [OBSERVATION STORE] No recent activities endpoint available, using existing observations');
        recentActivities = get().observations.slice(0, 5);
      }

      // Sort by creation date (newest first) and limit to 5
      recentActivities.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      const limitedActivities = recentActivities.slice(0, 5);

      set({
        recentActivities: limitedActivities,
        isLoadingRecent: false,
        recentError: null
      });

      console.log(`✅ [OBSERVATION STORE] Loaded ${limitedActivities.length} recent activities`);
      
    } catch (error) {
      console.error('❌ [OBSERVATION STORE] Recent activities fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load recent activities';
      
      set({
        recentError: errorMessage,
        isLoadingRecent: false
      });
    }
  },

  addRecentActivity: (observation: Observation): void => {
    console.log('➕ [OBSERVATION STORE] Adding new activity to recent list:', observation.id);
    
    set(state => ({
      recentActivities: [observation, ...state.recentActivities.slice(0, 4)], // Keep only 5 items
      recentError: null
    }));
  },

  clearRecentError: () => {
    set({ recentError: null });
  },

  // Computed values (getters)
  getObservationsByType: (type: SBOType): Observation[] => {
    const { observations } = get();
    return observations.filter(obs => obs.type === type);
  },

  getPendingObservations: (): Observation[] => {
    const { observations } = get();
    return observations.filter(obs => obs.status === 'pending');
  },

  getCompletedObservations: (): Observation[] => {
    const { observations } = get();
    return observations.filter(obs => obs.status === 'completed');
  }
}));
