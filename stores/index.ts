// Central export file for all Zustand stores
// This makes importing stores easier and more organized

// Centralized export for all Zustand stores
export { useAuthStore } from './authStore';
export { useDashboardStore } from './dashboardStore';
export { useAppStore } from './appStore';
export { useObservationStore } from './observationStore';
export { usePerformanceStore, usePerformanceMetrics } from './performanceStore';

// Store combination hook for components that need multiple stores
import { useAuthStore } from './authStore';
import { useDashboardStore } from './dashboardStore';
import { useAppStore } from './appStore';
import { useObservationStore } from './observationStore';
import { usePerformanceStore } from './performanceStore';

// Combined store hook for convenience
export const useStores = () => ({
  auth: useAuthStore(),
  dashboard: useDashboardStore(),
  app: useAppStore(),
  observation: useObservationStore(),
  performance: usePerformanceStore(),
});

// Selective store hooks for specific features
export const useAuth = () => useAuthStore();
export const useDashboard = () => useDashboardStore();
export const useObservation = () => useObservationStore();
export const usePerformance = () => usePerformanceStore();
export const useApp = () => useAppStore();
