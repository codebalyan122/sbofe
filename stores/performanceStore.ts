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

// Performance Overview Interfaces
interface PerformanceMetrics {
  monthlySubmissions: number;
  monthlyTarget: number;
  annualSubmissions: number;
  annualTarget: number;
  completionRate: number;
  streak: number;
  lastSubmissionDate: string | null;
  averagePerMonth: number;
  daysLeftInMonth: number;
  daysLeftInYear: number;
  monthlyProgress: number;
  annualProgress: number;
  targetExceeded: boolean;
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface MonthlyBreakdown {
  month: string;
  year: number;
  submissions: number;
  target: number;
  percentage: number;
}

interface PerformanceHistory {
  totalSubmissions: number;
  monthlyBreakdown: MonthlyBreakdown[];
  bestMonth: MonthlyBreakdown | null;
  averageMonthly: number;
  consistencyScore: number;
}

interface PerformanceState {
  // State
  metrics: PerformanceMetrics | null;
  history: PerformanceHistory | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Real-time update state
  isUpdating: boolean;
  pendingUpdates: number;
  
  // Actions
  fetchPerformanceMetrics: () => Promise<void>;
  fetchPerformanceHistory: () => Promise<void>;
  refreshPerformance: () => Promise<void>;
  
  // Real-time update actions
  updateMetricsRealTime: (type: 'safe' | 'unsafe' | 'nearmiss') => void;
  incrementSubmissions: (type: 'safe' | 'unsafe' | 'nearmiss') => void;
  resetPendingUpdates: () => void;
  
  // Utility actions
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  
  // Computed values
  getMonthlyProgress: () => number;
  getAnnualProgress: () => number;
  getCompletionRate: () => number;
  getRemainingToTarget: () => { monthly: number; annual: number };
  getProjectedAnnual: () => number;
  isOnTrack: () => boolean;
}

// Create the performance store
export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  // Initial State
  metrics: null,
  history: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  isUpdating: false,
  pendingUpdates: 0,
  // Actions
  fetchPerformanceMetrics: async (): Promise<void> => {
    try {
      set({ isLoading: true, error: null });

      console.log('🔄 [PERFORMANCE STORE] Fetching performance metrics...');

      const authHeaders = useAuthStore.getState().getAuthHeaders();
      
      const response = await fetch(`${API_URL}/api/dashboard/performance`, {
        method: 'GET',
        headers: authHeaders,
      });

      console.log(`📊 [PERFORMANCE STORE] Response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 401) {
          useAuthStore.getState().logout();
          throw new Error('Session expired. Please log in again.');
        }
        
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to access performance data.');
        }
          // Handle 404 - endpoint doesn't exist yet, use dashboard data as fallback
        if (response.status === 404) {
          console.log('📊 [PERFORMANCE STORE] Performance endpoint not found, trying dashboard fallback');
          
          try {
            // Try to get data from dashboard store
            const { useDashboardStore } = await import('./dashboardStore');
            const dashboardData = useDashboardStore.getState().dashboardData;
            
            if (dashboardData?.userData) {
              const userData = dashboardData.userData;
              
              // Create performance metrics from dashboard data
              const fallbackMetrics: PerformanceMetrics = {
                monthlySubmissions: userData.sboThisMonth || 0,
                monthlyTarget: userData.targetPerMonth || 10,
                annualSubmissions: userData.sboThisYear || 0,
                annualTarget: userData.yearlyTarget || 120,
                completionRate: userData.targetPerMonth > 0 
                  ? Math.round(((userData.sboThisMonth || 0) / userData.targetPerMonth) * 100)
                  : 0,
                streak: 0,
                lastSubmissionDate: userData.lastSubmission === 'Never' ? null : userData.lastSubmission || null,
                averagePerMonth: (userData.sboThisYear || 0) / (new Date().getMonth() + 1),
                daysLeftInMonth: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate(),
                daysLeftInYear: Math.ceil((new Date(new Date().getFullYear(), 11, 31).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
                monthlyProgress: userData.targetPerMonth > 0 
                  ? Math.min(((userData.sboThisMonth || 0) / userData.targetPerMonth) * 100, 100)
                  : 0,
                annualProgress: userData.yearlyTarget > 0 
                  ? Math.min(((userData.sboThisYear || 0) / userData.yearlyTarget) * 100, 100)
                  : 0,
                targetExceeded: false,
                performanceGrade: 'C',
                trend: 'stable',
                trendPercentage: 0,
              };

              // Update target exceeded flag
              fallbackMetrics.targetExceeded = fallbackMetrics.monthlyProgress > 100 || fallbackMetrics.annualProgress > 100;
              
              // Calculate performance grade
              fallbackMetrics.performanceGrade = 
                fallbackMetrics.monthlyProgress >= 90 ? 'A' :
                fallbackMetrics.monthlyProgress >= 80 ? 'B' :
                fallbackMetrics.monthlyProgress >= 70 ? 'C' :
                fallbackMetrics.monthlyProgress >= 60 ? 'D' : 'F';

              set({
                metrics: fallbackMetrics,
                isLoading: false,
                error: null,
                lastUpdated: new Date()
              });

              console.log('✅ [PERFORMANCE STORE] Using dashboard data as fallback for performance metrics');
              return;
            }
          } catch (importError) {
            console.warn('⚠️ [PERFORMANCE STORE] Could not import dashboard store for fallback');
          }
          
          // Final fallback with default values
          const defaultMetrics: PerformanceMetrics = {
            monthlySubmissions: 0,
            monthlyTarget: 10,
            annualSubmissions: 0,
            annualTarget: 120,
            completionRate: 0,
            streak: 0,
            lastSubmissionDate: null,
            averagePerMonth: 0,
            daysLeftInMonth: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate(),
            daysLeftInYear: Math.ceil((new Date(new Date().getFullYear(), 11, 31).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
            monthlyProgress: 0,
            annualProgress: 0,
            targetExceeded: false,
            performanceGrade: 'F',
            trend: 'stable',
            trendPercentage: 0,
          };

          set({
            metrics: defaultMetrics,
            isLoading: false,
            error: null,
            lastUpdated: new Date()
          });

          console.log('✅ [PERFORMANCE STORE] Using default performance metrics');
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📊 [PERFORMANCE STORE] Performance data received:', result.success ? 'Success' : 'Failed');
        if (result.success && result.data) {
        // Calculate derived metrics with validation
        const rawMetrics = result.data;
        
        // Validate and sanitize the data
        const monthlySubmissions = Math.max(0, Number(rawMetrics.monthlySubmissions) || 0);
        const monthlyTarget = Math.max(1, Number(rawMetrics.monthlyTarget) || 10);
        const annualSubmissions = Math.max(0, Number(rawMetrics.annualSubmissions) || 0);
        const annualTarget = Math.max(1, Number(rawMetrics.annualTarget) || 120);
        
        const monthlyProgress = monthlyTarget > 0 
          ? Math.min((monthlySubmissions / monthlyTarget) * 100, 100)
          : 0;
        
        const annualProgress = annualTarget > 0 
          ? Math.min((annualSubmissions / annualTarget) * 100, 100)
          : 0;

        // Create validated metrics object
        const validatedMetrics: PerformanceMetrics = {
          monthlySubmissions,
          monthlyTarget,
          annualSubmissions,
          annualTarget,
          completionRate: Math.round(monthlyProgress),
          streak: Math.max(0, Number(rawMetrics.streak) || 0),
          lastSubmissionDate: rawMetrics.lastSubmissionDate || null,
          averagePerMonth: Math.max(0, Number(rawMetrics.averagePerMonth) || 0),
          daysLeftInMonth: Math.max(0, Number(rawMetrics.daysLeftInMonth) || 0),
          daysLeftInYear: Math.max(0, Number(rawMetrics.daysLeftInYear) || 0),
          monthlyProgress: Math.round(monthlyProgress * 100) / 100,
          annualProgress: Math.round(annualProgress * 100) / 100,
          targetExceeded: monthlyProgress > 100 || annualProgress > 100,
          performanceGrade: rawMetrics.performanceGrade || (monthlyProgress >= 90 ? 'A' : monthlyProgress >= 80 ? 'B' : monthlyProgress >= 70 ? 'C' : monthlyProgress >= 60 ? 'D' : 'F'),
          trend: rawMetrics.trend || 'stable',
          trendPercentage: Math.max(0, Number(rawMetrics.trendPercentage) || 0),
        };

        set({
          metrics: validatedMetrics,
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        });

        console.log('✅ [PERFORMANCE STORE] Performance metrics loaded successfully');
      } else {
        throw new Error(result.message || 'Failed to fetch performance metrics');
      }
      
    } catch (error) {
      console.error('❌ [PERFORMANCE STORE] Performance fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load performance data';
      
      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },
  fetchPerformanceHistory: async (): Promise<void> => {
    try {
      console.log('🔄 [PERFORMANCE STORE] Fetching performance history...');

      const authHeaders = useAuthStore.getState().getAuthHeaders();
      
      const response = await fetch(`${API_URL}/api/dashboard/performance/history`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (!response.ok) {
        if (response.status === 401) {
          useAuthStore.getState().logout();
          throw new Error('Session expired. Please log in again.');
        }
        
        // Handle 404 - endpoint doesn't exist yet, use fallback data
        if (response.status === 404) {
          console.log('📊 [PERFORMANCE STORE] Performance history endpoint not found, using fallback data');
          
          const fallbackHistory: PerformanceHistory = {
            totalSubmissions: 0,
            monthlyBreakdown: [],
            bestMonth: null,
            averageMonthly: 0,
            consistencyScore: 0,
          };

          set({
            history: fallbackHistory,
            error: null
          });

          console.log('✅ [PERFORMANCE STORE] Using fallback performance history');
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        set({
          history: result.data,
          error: null
        });

        console.log('✅ [PERFORMANCE STORE] Performance history loaded successfully');
      } else {
        throw new Error(result.message || 'Failed to fetch performance history');
      }
      
    } catch (error) {
      console.error('❌ [PERFORMANCE STORE] Performance history fetch error:', error);
      // Don't set error for history fetch failure as it's not critical
      // Set fallback data instead
      const fallbackHistory: PerformanceHistory = {
        totalSubmissions: 0,
        monthlyBreakdown: [],
        bestMonth: null,
        averageMonthly: 0,
        consistencyScore: 0,
      };

      set({
        history: fallbackHistory,
        error: null
      });
    }
  },

  refreshPerformance: async (): Promise<void> => {
    console.log('🔄 [PERFORMANCE STORE] Refreshing performance data...');
    
    await Promise.all([
      get().fetchPerformanceMetrics(),
      get().fetchPerformanceHistory()
    ]);
    
    console.log('✅ [PERFORMANCE STORE] Performance data refreshed');
  },

  // Real-time update actions
  updateMetricsRealTime: (type: 'safe' | 'unsafe' | 'nearmiss'): void => {
    const state = get();
    if (!state.metrics) return;

    console.log(`🔄 [PERFORMANCE STORE] Real-time update for ${type} observation`);

    set({
      isUpdating: true,
      pendingUpdates: state.pendingUpdates + 1
    });

    // Optimistically update the metrics
    const updatedMetrics = {
      ...state.metrics,
      monthlySubmissions: state.metrics.monthlySubmissions + 1,
      annualSubmissions: state.metrics.annualSubmissions + 1,
      lastSubmissionDate: new Date().toISOString(),
    };

    // Recalculate progress
    const monthlyProgress = updatedMetrics.monthlyTarget > 0 
      ? Math.min((updatedMetrics.monthlySubmissions / updatedMetrics.monthlyTarget) * 100, 100)
      : 0;
    
    const annualProgress = updatedMetrics.annualTarget > 0 
      ? Math.min((updatedMetrics.annualSubmissions / updatedMetrics.annualTarget) * 100, 100)
      : 0;    // Update completion rate
    const completionRate = updatedMetrics.monthlyTarget > 0 
      ? Math.round((updatedMetrics.monthlySubmissions / updatedMetrics.monthlyTarget) * 100)
      : 0;

    // Calculate trend
    const previousProgress = state.metrics.monthlyProgress || 0;
    const trendPercentage = monthlyProgress - previousProgress;
    const trend: 'up' | 'down' | 'stable' = trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'stable';

    set({
      metrics: {
        ...updatedMetrics,
        monthlyProgress,
        annualProgress,
        completionRate,
        targetExceeded: monthlyProgress > 100 || annualProgress > 100,
        trend,
        trendPercentage: Math.abs(trendPercentage),
      },
      isUpdating: false,
      lastUpdated: new Date()
    });

    console.log('✅ [PERFORMANCE STORE] Real-time metrics updated', {
      monthly: updatedMetrics.monthlySubmissions,
      annual: updatedMetrics.annualSubmissions,
      monthlyProgress: Math.round(monthlyProgress),
      annualProgress: Math.round(annualProgress)
    });
  },

  incrementSubmissions: (type: 'safe' | 'unsafe' | 'nearmiss'): void => {
    get().updateMetricsRealTime(type);
  },

  resetPendingUpdates: (): void => {
    set({ pendingUpdates: 0 });
  },

  clearError: (): void => {
    set({ error: null });
  },

  setLoading: (loading: boolean): void => {
    set({ isLoading: loading });
  },
  // Computed values (getters)
  getMonthlyProgress: (): number => {
    const { metrics } = get();
    if (!metrics || !metrics.monthlyTarget || metrics.monthlyTarget <= 0) return 0;
    
    return Math.min((metrics.monthlySubmissions / metrics.monthlyTarget) * 100, 100);
  },

  getAnnualProgress: (): number => {
    const { metrics } = get();
    if (!metrics || !metrics.annualTarget || metrics.annualTarget <= 0) return 0;
    
    return Math.min((metrics.annualSubmissions / metrics.annualTarget) * 100, 100);
  },

  getCompletionRate: (): number => {
    const { metrics } = get();
    if (!metrics) return 0;
    
    return Math.max(0, Math.min(100, metrics.completionRate || 0));
  },

  getRemainingToTarget: (): { monthly: number; annual: number } => {
    const { metrics } = get();
    if (!metrics) return { monthly: 0, annual: 0 };
    
    return {
      monthly: Math.max(0, (metrics.monthlyTarget || 0) - (metrics.monthlySubmissions || 0)),
      annual: Math.max(0, (metrics.annualTarget || 0) - (metrics.annualSubmissions || 0))
    };
  },

  getProjectedAnnual: (): number => {
    const { metrics } = get();
    if (!metrics || !metrics.annualSubmissions) return 0;
    
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const monthsRemaining = 12 - currentMonth;
    
    if (monthsRemaining <= 0) return metrics.annualSubmissions;
    
    const averagePerMonth = currentMonth > 0 ? metrics.annualSubmissions / currentMonth : 0;
    return Math.round(metrics.annualSubmissions + (averagePerMonth * monthsRemaining));
  },

  isOnTrack: (): boolean => {
    const { metrics } = get();
    if (!metrics || !metrics.annualTarget || metrics.annualTarget <= 0) return false;
    
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth <= 0) return true; // Beginning of year
    
    const expectedMonthly = (metrics.annualTarget / 12) * currentMonth;
    const currentSubmissions = metrics.annualSubmissions || 0;
    
    return currentSubmissions >= expectedMonthly * 0.8; // 80% of expected
  }
}));

// Export utility functions
export const usePerformanceMetrics = () => {
  const store = usePerformanceStore();
  return {
    metrics: store.metrics,
    history: store.history,
    isLoading: store.isLoading,
    isUpdating: store.isUpdating,
    pendingUpdates: store.pendingUpdates,
    error: store.error,
    lastUpdated: store.lastUpdated,
    refresh: store.refreshPerformance,
    incrementSubmissions: store.incrementSubmissions,
    clearError: store.clearError,
    getMonthlyProgress: store.getMonthlyProgress,
    getAnnualProgress: store.getAnnualProgress,
    getCompletionRate: store.getCompletionRate,
    getRemainingToTarget: store.getRemainingToTarget,
    getProjectedAnnual: store.getProjectedAnnual,
    isOnTrack: store.isOnTrack,
  };
};
