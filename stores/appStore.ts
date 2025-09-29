import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// App Store for global UI state and preferences
interface AppState {
  // UI State
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  soundEnabled: boolean;
  offlineMode: boolean;
  lastSync: string | null;
  
  // App Settings
  language: 'en' | 'es' | 'fr';
  autoSubmit: boolean;
  photoQuality: 'low' | 'medium' | 'high';
  
  // Navigation State
  currentRoute: string | null;
  previousRoute: string | null;
  
  // Network State
  isOnline: boolean;
  isConnected: boolean;
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleNotifications: () => void;
  toggleSound: () => void;
  toggleOfflineMode: () => void;
  setLanguage: (language: 'en' | 'es' | 'fr') => void;
  setPhotoQuality: (quality: 'low' | 'medium' | 'high') => void;
  toggleAutoSubmit: () => void;
  
  // Navigation Actions
  setCurrentRoute: (route: string) => void;
  
  // Network Actions
  setOnlineStatus: (isOnline: boolean) => void;
  setConnectionStatus: (isConnected: boolean) => void;
  updateLastSync: () => void;
  
  // Helper Methods
  resetAppState: () => void;
  getAppInfo: () => {
    theme: string;
    notifications: boolean;
    language: string;
    version: string;
  };
}

// Create the app store with persistence
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      theme: 'system',
      notifications: true,
      soundEnabled: true,
      offlineMode: false,
      lastSync: null,
      language: 'en',
      autoSubmit: false,
      photoQuality: 'medium',
      currentRoute: null,
      previousRoute: null,
      isOnline: true,
      isConnected: true,

      // Theme Actions
      setTheme: (theme: 'light' | 'dark' | 'system') => {
        console.log(`🎨 [APP STORE] Theme changed to: ${theme}`);
        set({ theme });
      },

      // Settings Actions
      toggleNotifications: () => {
        const { notifications } = get();
        console.log(`🔔 [APP STORE] Notifications ${!notifications ? 'enabled' : 'disabled'}`);
        set({ notifications: !notifications });
      },

      toggleSound: () => {
        const { soundEnabled } = get();
        console.log(`🔊 [APP STORE] Sound ${!soundEnabled ? 'enabled' : 'disabled'}`);
        set({ soundEnabled: !soundEnabled });
      },

      toggleOfflineMode: () => {
        const { offlineMode } = get();
        console.log(`📡 [APP STORE] Offline mode ${!offlineMode ? 'enabled' : 'disabled'}`);
        set({ offlineMode: !offlineMode });
      },

      setLanguage: (language: 'en' | 'es' | 'fr') => {
        console.log(`🌐 [APP STORE] Language changed to: ${language}`);
        set({ language });
      },

      setPhotoQuality: (quality: 'low' | 'medium' | 'high') => {
        console.log(`📸 [APP STORE] Photo quality set to: ${quality}`);
        set({ photoQuality: quality });
      },

      toggleAutoSubmit: () => {
        const { autoSubmit } = get();
        console.log(`⚡ [APP STORE] Auto-submit ${!autoSubmit ? 'enabled' : 'disabled'}`);
        set({ autoSubmit: !autoSubmit });
      },

      // Navigation Actions
      setCurrentRoute: (route: string) => {
        const { currentRoute } = get();
        set({ 
          currentRoute: route,
          previousRoute: currentRoute 
        });
        console.log(`🧭 [APP STORE] Route changed: ${currentRoute} → ${route}`);
      },

      // Network Actions
      setOnlineStatus: (isOnline: boolean) => {
        console.log(`🌐 [APP STORE] Online status: ${isOnline ? 'Online' : 'Offline'}`);
        set({ isOnline });
      },

      setConnectionStatus: (isConnected: boolean) => {
        console.log(`📡 [APP STORE] Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
        set({ isConnected });
      },

      updateLastSync: () => {
        const now = new Date().toISOString();
        console.log(`🔄 [APP STORE] Last sync updated: ${now}`);
        set({ lastSync: now });
      },

      // Utility Actions
      resetAppState: () => {
        console.log('🔄 [APP STORE] Resetting app state to defaults');
        set({
          theme: 'system',
          notifications: true,
          soundEnabled: true,
          offlineMode: false,
          lastSync: null,
          language: 'en',
          autoSubmit: false,
          photoQuality: 'medium',
          currentRoute: null,
          previousRoute: null,
          isOnline: true,
          isConnected: true,
        });
      },

      getAppInfo: () => {
        const { theme, notifications, language } = get();
        return {
          theme,
          notifications,
          language,
          version: '1.0.0', // You can import this from package.json
        };
      },
    }),
    {
      name: 'sbo-app-storage', // Storage key
      storage: {
        getItem: async (name: string) => {
          try {
            const value = await AsyncStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch (error) {
            console.error('Error getting app storage:', error);
            return null;
          }
        },
        setItem: async (name: string, value: any) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('Error setting app storage:', error);
          }
        },
        removeItem: async (name: string) => {
          try {
            await AsyncStorage.removeItem(name);
          } catch (error) {
            console.error('Error removing app storage:', error);
          }
        },
      },
      partialize: (state) => ({
        theme: state.theme,
        notifications: state.notifications,
        soundEnabled: state.soundEnabled,
        language: state.language,
        autoSubmit: state.autoSubmit,
        photoQuality: state.photoQuality,
        lastSync: state.lastSync,
      }),
    }
  )
);
