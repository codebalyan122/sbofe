import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../stores/appStore';

// Light theme colors
const lightTheme = {
  primary: '#1B4F72',
  secondary: '#2874A6',
  accent: '#3498DB',
  success: '#27AE60',
  warning: '#F39C12',
  danger: '#E74C3C',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: {
    primary: '#1A1A1A',
    secondary: '#4A5568',
    light: '#718096',
  },
  border: '#E2E8F0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  gradient: {
    primary: ['#1B4F72', '#2874A6', '#3498DB'],
    success: ['#27AE60', '#2ECC71'],
    warning: ['#F39C12', '#F4D03F'],
    danger: ['#E74C3C', '#EC7063'],
    accent: ['#3498DB', '#5DADE2'],
  },
};

// Dark theme colors
const darkTheme = {
  primary: '#2C5F8A',
  secondary: '#3A84C2',
  accent: '#52A5E8',
  success: '#2ECC71',
  warning: '#F1C40F',
  danger: '#E74C3C',
  background: '#0F172A',
  surface: '#1E293B',
  text: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    light: '#94A3B8',
  },
  border: '#334155',
  shadow: 'rgba(0, 0, 0, 0.3)',
  gradient: {
    primary: ['#2C5F8A', '#3A84C2', '#52A5E8'],
    success: ['#2ECC71', '#27AE60'],
    warning: ['#F1C40F', '#F39C12'],
    danger: ['#E74C3C', '#EC7063'],
    accent: ['#52A5E8', '#3498DB'],
  },
};

type ThemeContextType = {
  colors: typeof lightTheme;
  isDark: boolean;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { theme, setTheme } = useAppStore();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let shouldUseDark = false;
    
    switch (theme) {
      case 'dark':
        shouldUseDark = true;
        break;
      case 'light':
        shouldUseDark = false;
        break;
      case 'system':
      default:
        shouldUseDark = systemColorScheme === 'dark';
        break;
    }
    
    setIsDark(shouldUseDark);
  }, [theme, systemColorScheme]);

  const colors = isDark ? darkTheme : lightTheme;

  const value: ThemeContextType = {
    colors,
    isDark,
    theme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
