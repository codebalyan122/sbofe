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

// Dashboard Data Interfaces
interface UserData {
  name: string;
  role: string;
  department: string;
  employeeId: string;
  sboThisMonth: number;
  sboThisYear: number;
  targetPerMonth: number;
  yearlyTarget: number;
  lastSubmission: string;
  completionRate: number;
  teamRanking: number;
  totalTeamMembers: number;
  daysSinceLastSubmission: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  icon: string;
  color: string;
}

interface DashboardData {
  userData: UserData;
  recentActivity: ActivityItem[];
  stats: {
    totalObservations: number;
    safeObservations: number;
    unsafeObservations: number;
    nearMisses: number;
  };
}

interface TeamStats {
  teamName?: string;
  totalMembers: number;
  averageScore: number;
  monthlyTarget: number;
  currentProgress: number;
  topPerformers: Array<{
    name: string;
    score: number;
    observations: number;
  }>;
}

// Dashboard Store State Interface
interface DashboardState {
  // State
  dashboardData: DashboardData | null;
  teamStats: TeamStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  fetchDashboardData: () => Promise<void>;
  fetchTeamStats: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  
  // Computed values
  getCompletionRate: () => number;
  getMonthlyProgress: () => number;
  getRecentActivity: () => ActivityItem[];
}

// Create the dashboard store
export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial State
  dashboardData: null,
  teamStats: null,
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Actions
  fetchDashboardData: async (): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      console.log('🔄 [DASHBOARD STORE] Fetching dashboard data...');

      // Get auth headers from auth store
      const authHeaders = useAuthStore.getState().getAuthHeaders();
      
      const response = await fetch(`${API_URL}/api/dashboard`, {
        method: 'GET',
        headers: authHeaders,
      });

      console.log(`📊 [DASHBOARD STORE] Response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, logout user
          useAuthStore.getState().logout();
          throw new Error('Session expired. Please log in again.');
        }
        
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to access this resource.');
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📊 [DASHBOARD STORE] Dashboard data received:', result.success ? 'Success' : 'Failed');
      
      if (result.success && result.data) {
        set({
          dashboardData: result.data,
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        });

        console.log('✅ [DASHBOARD STORE] Dashboard data loaded successfully');
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }
      
    } catch (error) {
      console.error('❌ [DASHBOARD STORE] Dashboard fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      
      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },

  fetchTeamStats: async (): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      console.log('🔄 [DASHBOARD STORE] Fetching team stats...');

      const authHeaders = useAuthStore.getState().getAuthHeaders();
      
      const response = await fetch(`${API_URL}/api/dashboard/team-stats`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (!response.ok) {
        if (response.status === 401) {
          useAuthStore.getState().logout();
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        set({
          teamStats: result.data,
          isLoading: false,
          error: null
        });

        console.log('✅ [DASHBOARD STORE] Team stats loaded successfully');
      } else {
        throw new Error(result.message || 'Failed to fetch team stats');
      }
      
    } catch (error) {
      console.error('❌ [DASHBOARD STORE] Team stats fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load team stats';
      
      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },

  refreshData: async (): Promise<void> => {
    console.log('🔄 [DASHBOARD STORE] Refreshing all dashboard data...');
    
    // Refresh both dashboard data and team stats
    await Promise.all([
      get().fetchDashboardData(),
      get().fetchTeamStats()
    ]);
    
    console.log('✅ [DASHBOARD STORE] All data refreshed');
  },

  clearError: () => {
    set({ error: null });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  // Computed values (getters)
  getCompletionRate: (): number => {
    const { dashboardData } = get();
    if (!dashboardData?.userData) return 0;
    
    const { sboThisMonth, targetPerMonth } = dashboardData.userData;
    return targetPerMonth > 0 ? Math.round((sboThisMonth / targetPerMonth) * 100) : 0;
  },

  getMonthlyProgress: (): number => {
    const { dashboardData } = get();
    if (!dashboardData?.userData) return 0;
    
    const { sboThisMonth, targetPerMonth } = dashboardData.userData;
    return Math.min((sboThisMonth / targetPerMonth) * 100, 100);
  },

  getRecentActivity: (): ActivityItem[] => {
    const { dashboardData } = get();
    return dashboardData?.recentActivity || [];
  }
}));
