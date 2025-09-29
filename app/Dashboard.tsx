import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useObservationStore } from '../stores/observationStore';
import { usePerformanceStore } from '../stores/performanceStore';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

type SBOType = 'safe' | 'unsafe' | 'nearmiss' | null;

export default function Dashboard() {
  // ✅ ZUSTAND STORES - Centralized state management
  const { user, token, logout, isAuthenticated, checkAuthStatus } = useAuthStore();
  const {
    dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    fetchDashboardData,
    clearError
  } = useDashboardStore();

  const {
    observations,
    isLoading: observationsLoading,
    fetchObservations,
    recentActivities,
    isLoadingRecent,
    recentError,
    fetchRecentActivities,
    clearRecentError
  } = useObservationStore();

  // ✅ PERFORMANCE STORE - Real-time performance metrics
  const {
    metrics: performanceMetrics,
    isLoading: performanceLoading,
    error: performanceError,
    refreshPerformance,
    clearError: clearPerformanceError,
    isUpdating: performanceUpdating,
    pendingUpdates
  } = usePerformanceStore();

  // ✅ THEME CONTEXT - Dark mode support
  const { colors, isDark, theme, setTheme } = useTheme();
  // ✅ LOCAL UI STATE - Only for UI interactions
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [userProfileModal, setUserProfileModal] = useState(false);

  // ✅ ZUSTAND EFFECT - Check auth and fetch data
  useEffect(() => {
    const initializeDashboard = async () => {
      // Check if user is authenticated
      if (!isAuthenticated || !token || !user) {
        console.log('⚠️ User not authenticated, redirecting to login...');
        router.push('/login');
        return;
      }

      // Verify auth status with backend
      const isValid = await checkAuthStatus();
      if (!isValid) {
        console.log('⚠️ Invalid auth status, redirecting to login...');
        router.push('/login');
        return;
      }

      // Fetch all data concurrently
      console.log('🔄 [DASHBOARD] Initializing dashboard data...');
      await Promise.all([
        fetchDashboardData(),
        fetchObservations(),
        fetchRecentActivities(),
        refreshPerformance() // 🔄 NEW: Fetch performance metrics
      ]);

      console.log('✅ [DASHBOARD] Dashboard initialization complete');
    };

    initializeDashboard();
  }, [isAuthenticated, token, user, checkAuthStatus, fetchDashboardData, fetchObservations, fetchRecentActivities, refreshPerformance, router]);

  // ✅ REAL-TIME PERFORMANCE UPDATE EFFECT - Listen for real-time updates
  useEffect(() => {
    if (performanceUpdating && pendingUpdates > 0) {
      console.log(`🔄 [DASHBOARD] Real-time performance update detected (${pendingUpdates} pending updates)`);

      // Reset pending updates after a short delay to allow UI to update
      const timer = setTimeout(() => {
        const store = usePerformanceStore.getState();
        store.resetPendingUpdates();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [performanceUpdating, pendingUpdates]);

  // ✅ LOCAL DATETIME EFFECT - Update every minute
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      };
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      setCurrentDate(now.toLocaleDateString('en-US', dateOptions));
      setCurrentTime(now.toLocaleTimeString('en-US', timeOptions));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // ✅ ZUSTAND LOADING STATE - Show loading spinner
  if (dashboardLoading || observationsLoading || performanceLoading) {
    return (
      <View style={getStyles(colors, isDark).loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={getStyles(colors, isDark).loadingText}>Loading Safety Dashboard...</Text>
        <Text style={getStyles(colors, isDark).loadingSubtext}>
          {performanceLoading ? 'Loading performance metrics...' : 'Retrieving your performance data'}
        </Text>
        {performanceUpdating ? (
          <Text style={[getStyles(colors, isDark).loadingSubtext, { color: colors.success, marginTop: 8 }]}>
            🔄 Updating metrics in real-time...
          </Text>
        ) : null}
      </View>
    );
  }
  
  // ✅ ZUSTAND ERROR STATE - Show error message
  if ((dashboardError || performanceError) && !dashboardData && !performanceMetrics) {
    return (
      <View style={getStyles(colors, isDark).errorContainer}>
        <Text style={getStyles(colors, isDark).errorText}>
          {dashboardError || performanceError || 'Unable to load dashboard'}
        </Text>
        <TouchableOpacity
          style={getStyles(colors, isDark).retryButton}
          onPress={() => {
            fetchDashboardData();
            refreshPerformance();
            clearError();
            clearPerformanceError();
          }}
        >
          <Text style={getStyles(colors, isDark).retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // ✅ EXTRACT DATA FROM STORES - Use performance metrics as primary source
  const userData = {
    name: dashboardData?.userData?.name || user?.username || 'User',
    role: dashboardData?.userData?.role || user?.userType || 'Observer',
    department: dashboardData?.userData?.department || user?.area || 'Safety',
    employeeId: dashboardData?.userData?.employeeId || user?.id || 'EMP001',
    // 🔄 REAL-TIME METRICS: Use performance store for up-to-date counts
    sboThisMonth: performanceMetrics?.monthlySubmissions ?? dashboardData?.userData?.sboThisMonth ?? 0,
    sboThisYear: performanceMetrics?.annualSubmissions ?? dashboardData?.userData?.sboThisYear ?? 0,
    targetPerMonth: performanceMetrics?.monthlyTarget ?? dashboardData?.userData?.targetPerMonth ?? 10,
    yearlyTarget: performanceMetrics?.annualTarget ?? dashboardData?.userData?.yearlyTarget ?? 120,
    lastSubmission: performanceMetrics?.lastSubmissionDate
      ? new Date(performanceMetrics.lastSubmissionDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      : dashboardData?.userData?.lastSubmission || 'Never'
  };
  
  // Safe progress calculation using real-time performance metrics
  const safeProgressCalc = (current: number, target: number) => {
    if (!current || !target || target === 0) return 0;
    return Math.max(0, Math.min(100, (current / target) * 100));
  };

  // 🔄 REAL-TIME PROGRESS: Use performance store metrics for instant updates
  const monthlyProgress = performanceMetrics?.monthlyProgress ?? safeProgressCalc(userData.sboThisMonth, userData.targetPerMonth);
  const yearlyProgress = performanceMetrics?.annualProgress ?? safeProgressCalc(userData.sboThisYear, userData.yearlyTarget);

  // Real-time trend indicators
  const performanceTrend = performanceMetrics?.trend || 'stable';
  const trendPercentage = performanceMetrics?.trendPercentage || 0;

  // ✅ FORMAT RECENT ACTIVITIES - Use dashboard data if available, fallback to observation store
  const formatRecentActivities = () => {
    // First check if dashboard has pre-formatted recent activities
    if (dashboardData?.recentActivity && Array.isArray(dashboardData.recentActivity) && dashboardData.recentActivity.length > 0) {
      console.log('🔄 [DASHBOARD] Using dashboard recent activity data:', dashboardData.recentActivity.length);
      // return dashboardData.recentActivity.map((activity) => ({
      //   id: activity.id || Math.random().toString(),
      //   title: activity.title || 'Activity',
      //   description: activity.description || 'No description',
      //   time: activity.time || 'Recently',
      //   icon: activity.icon || '📝',
      //   color: activity.color || '#6b7280',
      //   location: activity.location || null
      // }));
    }

    // Fallback to observation store data
    if (!recentActivities || recentActivities.length === 0) {
      console.log('📭 [DASHBOARD] No recent activities to format');
      return [];
    }

    console.log('🔄 [DASHBOARD] Formatting recent activities from observation store:', recentActivities.length);

    return recentActivities.map((observation) => {
      const activityType = observation.type === 'safe' ? 'Safe Observation' :
        observation.type === 'unsafe' ? 'Unsafe Condition' :
          'Near Miss Report';

      const activityIcon = observation.type === 'safe' ? '✅' :
        observation.type === 'unsafe' ? '⚠️' : '🚨';

      const activityColor = observation.type === 'safe' ? '#10b981' :
        observation.type === 'unsafe' ? '#ef4444' : '#f59e0b';

      // Format time - use createdAt or fallback to "Recently"
      let timeStr = 'Recently';
      if (observation.createdAt) {
        try {
          const createdDate = new Date(observation.createdAt);
          const now = new Date();
          const diffMs = now.getTime() - createdDate.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffHours / 24);

          if (diffDays > 0) {
            timeStr = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
          } else if (diffHours > 0) {
            timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
          } else {
            timeStr = 'Recently';
          }
        } catch (error) {
          console.log('⚠️ [DASHBOARD] Error formatting time:', error);
        }
      }

      return {
        id: observation.id || Math.random().toString(),
        title: activityType || 'Activity',
        description: observation.description?.length > 50
          ? `${observation.description.substring(0, 50)}...`
          : observation.description || 'No description provided',
        time: timeStr,
        icon: activityIcon,
        color: activityColor,
        location: typeof observation.location === 'string' ? observation.location : null
      };
    });
  };

  const recentActivity = formatRecentActivities();
  
  // 🔍 DEBUG: Log dashboard data and progress calculations
  console.log('🔍 Dashboard Debug Info:');
  console.log('- Raw Dashboard Data:', dashboardData);
  console.log('- Performance Metrics:', performanceMetrics);
  console.log('- User Data:', userData);
  console.log('- Monthly Progress:', monthlyProgress);
  console.log('- Monthly Submissions:', userData.sboThisMonth);
  console.log('- Monthly Target:', userData.targetPerMonth);
  console.log('- Yearly Progress:', yearlyProgress);
  console.log('- Yearly Submissions:', userData.sboThisYear);
  console.log('- Yearly Target:', userData.yearlyTarget);
  console.log('- Performance Updating:', performanceUpdating);
  console.log('- Pending Updates:', pendingUpdates);
  console.log('- Performance Trend:', performanceTrend);
  console.log('- Trend Percentage:', trendPercentage);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handlePlusButtonPress = () => {
    setShowTypeModal(true);
  };

  const handleTypeSelection = (type: SBOType) => {
    setShowTypeModal(false);
    // Navigate to the new SBO page with the selected type
    router.push({
      pathname: '/newsbo',
      params: { type: type }
    });
  };

  const handleProfileMenu = async () => {
    console.log('🔍 Opening profile menu...');
    setUserProfileModal(true);
  };

  // ✅ ZUSTAND LOGOUT - Use auth store logout
  const handleLogout = async () => {
    try {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              console.log('🔄 Logging out user...');
              await logout();
              router.push('/login');
              console.log('✅ User logged out successfully');
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error during logout:', error);
      Alert.alert('Logout Error', 'Failed to log out. Please try again.');
    }
  };

  const handleMySBOs = () => {
    router.push('/my-observations');
  };
  
  const handleRefresh = () => {
    console.log('🔄 [DASHBOARD] Refreshing all data...');
    Promise.all([
      fetchDashboardData(),
      fetchObservations(),
      fetchRecentActivities(),
      refreshPerformance() // 🔄 NEW: Also refresh performance metrics
    ]);
  };

  type StatCardProps = {
    title: string;
    value: number | string;
    subtitle: string;
    progress?: number;
    progressColor: string[];
    icon: string;
    trend?: number;
    unit?: string;
  };
  
  const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, progress, progressColor, icon, trend, unit = '' }) => {
    // Ensure all values are properly typed and have fallbacks
    const safeTitle = String(title || 'Metric');
    const safeValue = String(value ?? 0);
    const safeSubtitle = String(subtitle || 'Progress tracking');
    const safeIcon = String(icon || '📊');
    const safeUnit = String(unit || '');
    const safeProgress = typeof progress === 'number' ? progress : 0;
    const safeTrend = typeof trend === 'number' ? trend : undefined;
    
    // Calculate target value based on title
    const target = (safeTitle.includes('month') || safeTitle.includes('Monthly')) 
      ? (userData.targetPerMonth || 10) 
      : (userData.yearlyTarget || 120);

    // Create progress text without nested Text components - ensure no undefined values
    const progressPercentage = Math.round(Math.max(safeProgress, 0));
    const progressText = `${progressPercentage}% Complete (${safeValue}/${target})`;
    const targetExceeded = safeProgress > 100;

    // 🔄 REAL-TIME INDICATOR: Show when metrics are updating
    const isThisCardUpdating = performanceUpdating && (
      (safeTitle.includes('Monthly') && pendingUpdates > 0) ||
      (safeTitle.includes('Annual') && pendingUpdates > 0)
    );

    return (
      <LinearGradient
        colors={isDark ? [colors.surface, colors.surface] : ['#FFFFFF', '#F8FAFC']}
        style={[
          getStyles(colors, isDark).statCard,
          isThisCardUpdating && {
            borderWidth: 2,
            borderColor: colors.success,
            shadowColor: colors.success,
            shadowOpacity: 0.3
          }
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={getStyles(colors, isDark).statCardHeader}>
          <View style={[getStyles(colors, isDark).statIconContainer, { backgroundColor: progressColor[0] }]}>
            <Text style={[getStyles(colors, isDark).statIcon, { color: '#FFFFFF' }]}>{safeIcon}</Text>
          </View>
          <View style={getStyles(colors, isDark).statCardActions}>
            {/* Real-time update indicator */}
            {isThisCardUpdating && (
              <View style={[getStyles(colors, isDark).realTimeIndicator, { backgroundColor: colors.success }]}>
                <Text style={getStyles(colors, isDark).realTimeText}>●</Text>
              </View>
            )}
            {safeTrend !== undefined && (
              <View style={[getStyles(colors, isDark).trendBadge, { backgroundColor: safeTrend > 0 ? colors.success : colors.danger }]}>
                <Text style={getStyles(colors, isDark).trendText}>
                  {`${safeTrend > 0 ? '↗' : '↘'} ${Math.abs(safeTrend)}%`}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={getStyles(colors, isDark).statTitle}>{safeTitle}</Text>

        <View style={getStyles(colors, isDark).statValueContainer}>
          <Text style={[
            getStyles(colors, isDark).statValue,
            isThisCardUpdating && { color: colors.success }
          ]}>{safeValue}</Text>
          {safeUnit.length > 0 && (
            <Text style={getStyles(colors, isDark).statUnit}>{safeUnit}</Text>
          )}
        </View>
        <Text style={getStyles(colors, isDark).statSubtitle}>{safeSubtitle}</Text>

        {safeProgress !== undefined && (
          <View style={getStyles(colors, isDark).progressSection}>
            <View style={getStyles(colors, isDark).progressBar}>
              <LinearGradient
                colors={progressColor as [string, string]}
                style={[getStyles(colors, isDark).progressFill, {
                  width: `${Math.min(Math.max(safeProgress, safeProgress > 0 ? 5 : 0), 100)}%`
                }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>

            <View style={getStyles(colors, isDark).progressInfoContainer}>
              <Text style={getStyles(colors, isDark).progressText}>
                {progressText}
              </Text>
              {targetExceeded && (
                <Text style={[getStyles(colors, isDark).progressExceededText, { color: colors.success }]}>
                  Target Exceeded!
                </Text>
              )}
              <Text style={getStyles(colors, isDark).progressTarget}>
                Target: {String(target)}
              </Text>
            </View>
          </View>
        )}
        <View style={[getStyles(colors, isDark).cardAccent, { backgroundColor: progressColor[0] }]} />
      </LinearGradient>
    );
  };

  type QuickActionCardProps = {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    accent: string;
  };

  const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon, title, subtitle, onPress, accent }) => {
    const safeIcon = String(icon || '📋');
    const safeTitle = String(title || 'Action');
    const safeSubtitle = String(subtitle || 'Quick action');

    return (
      <TouchableOpacity
        style={getStyles(colors, isDark).quickActionCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isDark ? [colors.surface, colors.surface] : ['#FFFFFF', '#F8FAFC']}
          style={getStyles(colors, isDark).quickActionGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[getStyles(colors, isDark).quickActionIconContainer, { backgroundColor: accent }]}>
            <Text style={[getStyles(colors, isDark).quickActionIcon, { color: '#FFFFFF' }]}>{safeIcon}</Text>
          </View>
          <View style={getStyles(colors, isDark).quickActionContent}>
            <Text style={getStyles(colors, isDark).quickActionTitle}>{safeTitle}</Text>
            <Text style={getStyles(colors, isDark).quickActionSubtitle}>{safeSubtitle}</Text>
          </View>
          <View style={getStyles(colors, isDark).quickActionArrow}>
            <Text style={getStyles(colors, isDark).arrowIcon}>→</Text>
          </View>
          <View style={[getStyles(colors, isDark).cardAccent, { backgroundColor: accent }]} />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.primary} />

      {/* Type Selection Modal */}
      <Modal
        visible={showTypeModal}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowTypeModal(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="rgba(0, 0, 0, 0.5)" translucent={true} />
        <View style={getStyles(colors, isDark).modalOverlay}>
          <View style={getStyles(colors, isDark).modalContent}>
            <View style={getStyles(colors, isDark).modalHeader}>
              <Text style={getStyles(colors, isDark).modalTitle}>Select Observation Type</Text>
              <TouchableOpacity
                style={getStyles(colors, isDark).modalCloseButton}
                onPress={() => setShowTypeModal(false)}
              >
                <Text style={getStyles(colors, isDark).modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={getStyles(colors, isDark).modalTypeGrid}>
              <TouchableOpacity
                style={[getStyles(colors, isDark).modalTypeCard, { backgroundColor: colors.success }]}
                onPress={() => handleTypeSelection('safe')}
                activeOpacity={0.8}
              >
                <View style={getStyles(colors, isDark).modalTypeIconContainer}>
                  <Text style={getStyles(colors, isDark).modalTypeIcon}>✓</Text>
                </View>
                <View style={getStyles(colors, isDark).modalTypeContent}>
                  <Text style={getStyles(colors, isDark).modalTypeTitle}>Safe Observation</Text>
                  <Text style={getStyles(colors, isDark).modalTypeSubtitle}>Report positive safety practices</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[getStyles(colors, isDark).modalTypeCard, { backgroundColor: colors.danger }]}
                onPress={() => handleTypeSelection('unsafe')}
                activeOpacity={0.8}
              >
                <View style={getStyles(colors, isDark).modalTypeIconContainer}>
                  <Text style={getStyles(colors, isDark).modalTypeIcon}>⚠</Text>
                </View>
                <View style={getStyles(colors, isDark).modalTypeContent}>
                  <Text style={getStyles(colors, isDark).modalTypeTitle}>Unsafe Condition</Text>
                  <Text style={getStyles(colors, isDark).modalTypeSubtitle}>Report hazardous situations</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[getStyles(colors, isDark).modalTypeCard, { backgroundColor: colors.warning }]}
                onPress={() => handleTypeSelection('nearmiss')}
                activeOpacity={0.8}
              >
                <View style={getStyles(colors, isDark).modalTypeIconContainer}>
                  <Text style={getStyles(colors, isDark).modalTypeIcon}>◎</Text>
                </View>
                <View style={getStyles(colors, isDark).modalTypeContent}>
                  <Text style={getStyles(colors, isDark).modalTypeTitle}>Near Miss</Text>
                  <Text style={getStyles(colors, isDark).modalTypeSubtitle}>Report close call incidents</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal
        visible={userProfileModal}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setUserProfileModal(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="rgba(0, 0, 0, 0.5)" translucent={true} />
        <View style={getStyles(colors, isDark).modalOverlay}>
          <View style={getStyles(colors, isDark).modalContent}>
            <View style={getStyles(colors, isDark).modalHeader}>
              <Text style={getStyles(colors, isDark).modalTitle}>Profile & Settings</Text>
              <TouchableOpacity
                style={getStyles(colors, isDark).modalCloseButton}
                onPress={() => setUserProfileModal(false)}
              >
                <Text style={getStyles(colors, isDark).modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {user ? (
              <View style={getStyles(colors, isDark).profileBody}>
                <View style={getStyles(colors, isDark).profileAvatarContainer}>
                  <LinearGradient
                    colors={colors.gradient.primary as [string, string, string]}
                    style={getStyles(colors, isDark).profileAvatar}
                  >
                    <Text style={getStyles(colors, isDark).profileAvatarText}>
                      {user.username
                        ? user.username
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                        : 'U'}
                    </Text>
                  </LinearGradient>
                </View>

                <Text style={getStyles(colors, isDark).profileName}>{user.username || 'User'}</Text>
                <Text style={getStyles(colors, isDark).profileEmail}>{user.email || 'No email'}</Text>

                <View style={getStyles(colors, isDark).profileInfoSection}>
                  <View style={getStyles(colors, isDark).profileInfoRow}>
                    <Text style={getStyles(colors, isDark).profileInfoLabel}>Role</Text>
                    <Text style={getStyles(colors, isDark).profileInfoValue}>{user.userType || 'Observer'}</Text>
                  </View>
                  {user.area && user.area.length > 0 && (
                    <View style={getStyles(colors, isDark).profileInfoRow}>
                      <Text style={getStyles(colors, isDark).profileInfoLabel}>Area</Text>
                      <Text style={getStyles(colors, isDark).profileInfoValue}>{user.area}</Text>
                    </View>
                  )}

                  {user.createdAt && (
                    <View style={getStyles(colors, isDark).profileInfoRow}>
                      <Text style={getStyles(colors, isDark).profileInfoLabel}>Member Since</Text>
                      <Text style={getStyles(colors, isDark).profileInfoValue}>
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                  )}

                  <View style={getStyles(colors, isDark).profileInfoRow}>
                    <Text style={getStyles(colors, isDark).profileInfoLabel}>Access Level</Text>
                    <Text style={getStyles(colors, isDark).profileInfoValue}>Standard User</Text>
                  </View>

                  {/* Dark Mode Toggle */}
                  <View style={getStyles(colors, isDark).settingsSection}>
                    <Text style={getStyles(colors, isDark).settingsSectionTitle}>Appearance</Text>

                    <View style={getStyles(colors, isDark).settingsRow}>
                      <View style={getStyles(colors, isDark).settingsRowContent}>
                        <Text style={getStyles(colors, isDark).settingsLabel}>🌙 Dark Mode</Text>
                        <Text style={getStyles(colors, isDark).settingsDescription}>
                          {theme === 'system' ? 'Auto (System)' : theme === 'dark' ? 'Enabled' : 'Disabled'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={getStyles(colors, isDark).themeSelector}
                        onPress={() => {
                          const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
                          setTheme(newTheme);
                        }}
                      >
                        <Text style={getStyles(colors, isDark).themeSelectorText}>
                          {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🔄'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={getStyles(colors, isDark).settingsRow}>
                      <View style={getStyles(colors, isDark).settingsRowContent}>
                        <Text style={getStyles(colors, isDark).settingsLabel}>🔔 Notifications</Text>
                        <Text style={getStyles(colors, isDark).settingsDescription}>Get updates on submissions</Text>
                      </View>
                      <Switch
                        value={true}
                        onValueChange={() => { }}
                        trackColor={{ false: colors.border, true: colors.success }}
                        thumbColor={colors.surface}
                      />
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={getStyles(colors, isDark).logoutButton}
                  onPress={() => {
                    setUserProfileModal(false);
                    handleLogout();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={getStyles(colors, isDark).logoutButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={getStyles(colors, isDark).profileLoadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={getStyles(colors, isDark).profileLoadingText}>Loading profile...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Premium Header */}
      <LinearGradient
        colors={colors.gradient.primary as [string, string, string]}
        style={getStyles(colors, isDark).header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={getStyles(colors, isDark).headerTop}>
          <View style={getStyles(colors, isDark).headerLeft}>
            <Text style={getStyles(colors, isDark).welcomeMessage}>
              {getGreeting()}, {userData.name || 'User'}
            </Text>
            <Text style={getStyles(colors, isDark).userRole}>
              {userData.role || 'Observer'} • {userData.department || 'Safety'}
            </Text>
          </View>

          <TouchableOpacity
            style={getStyles(colors, isDark).profileButton}
            onPress={handleProfileMenu}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
              style={getStyles(colors, isDark).profileGradient}
            >
              <Text style={getStyles(colors, isDark).profileInitials}>
                {userData.name && userData.name.length > 0
                  ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase()
                  : 'U'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={getStyles(colors, isDark).headerBottom}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
            style={getStyles(colors, isDark).headerStatsContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={getStyles(colors, isDark).headerStat}>
              <Text style={getStyles(colors, isDark).headerStatValue}>{String(userData.sboThisMonth || 0)}</Text>
              <Text style={getStyles(colors, isDark).headerStatLabel}>This Month</Text>
            </View>
            <View style={getStyles(colors, isDark).headerStatDivider} />
            <View style={getStyles(colors, isDark).headerStat}>
              <Text style={getStyles(colors, isDark).headerStatValue}>{String(userData.sboThisYear || 0)}</Text>
              <Text style={getStyles(colors, isDark).headerStatLabel}>This Year</Text>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>

      <ScrollView style={getStyles(colors, isDark).container} showsVerticalScrollIndicator={false}>
        {/* Performance Overview */}
        <View style={getStyles(colors, isDark).section}>
          <View style={getStyles(colors, isDark).sectionHeader}>
            <View style={getStyles(colors, isDark).sectionTitleContainer}>
              <Text style={getStyles(colors, isDark).sectionTitle}>Performance Overview</Text>
              {/* Real-time status indicator */}
              {performanceUpdating && (
                <View style={[getStyles(colors, isDark).realTimeStatusBadge, { backgroundColor: colors.success }]}>
                  <Text style={getStyles(colors, isDark).realTimeStatusText}>● LIVE</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={handleRefresh} style={getStyles(colors, isDark).refreshButton}>
              <Text style={getStyles(colors, isDark).refreshIcon}>↻</Text>
            </TouchableOpacity>
          </View>
          <View style={getStyles(colors, isDark).statsGrid}>
            <StatCard
              icon="📊"
              title="Monthly Submissions"
              value={String(userData.sboThisMonth)}
              subtitle={`of ${userData.targetPerMonth || 10} target observations`}
              progress={monthlyProgress}
              progressColor={monthlyProgress >= 100 ? [colors.success, colors.success] : [colors.accent, colors.accent]}
              trend={performanceTrend === 'up' ? trendPercentage : performanceTrend === 'down' ? -trendPercentage : undefined}
              unit=""
            />

            <StatCard
              icon="📈"
              title="Annual Progress"
              value={String(userData.sboThisYear)}
              subtitle={`of ${userData.yearlyTarget || 120} yearly target`}
              progress={yearlyProgress}
              progressColor={yearlyProgress >= 100 ? [colors.success, colors.success] : [colors.primary, colors.primary]}
              trend={performanceTrend === 'up' ? Math.round(trendPercentage * 0.7) : performanceTrend === 'down' ? -Math.round(trendPercentage * 0.7) : undefined}
              unit=""
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={getStyles(colors, isDark).section}>
          <Text style={getStyles(colors, isDark).sectionTitle}>Quick Actions</Text>
          <View style={getStyles(colors, isDark).quickActionsContainer}>
            <QuickActionCard
              icon="📋"
              title="My Observations"
              subtitle="View and manage submissions"
              onPress={handleMySBOs}
              accent={colors.accent}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={getStyles(colors, isDark).section}>
          <View style={getStyles(colors, isDark).recentSectionHeader}>
            <Text style={getStyles(colors, isDark).sectionTitle}>Recent Activity</Text>
            <TouchableOpacity
              style={getStyles(colors, isDark).recentRefreshButton}
              onPress={() => {
                console.log('🔄 [DASHBOARD] Manual refresh of recent activities');
                fetchRecentActivities();
              }}
            >
              <Text style={getStyles(colors, isDark).recentRefreshButtonText}>↻</Text>
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={isDark ? [colors.surface, colors.surface] : ['#FFFFFF', '#F8FAFC']}
            style={getStyles(colors, isDark).activityCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isLoadingRecent ? (
              <View style={getStyles(colors, isDark).recentLoadingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={getStyles(colors, isDark).recentLoadingText}>Loading recent activities...</Text>
              </View>
            ) : recentError ? (
              <View style={getStyles(colors, isDark).recentErrorContainer}>
                <Text style={getStyles(colors, isDark).recentErrorIcon}>⚠️</Text>
                <Text style={getStyles(colors, isDark).recentErrorText}>Failed to load recent activities</Text>
                <TouchableOpacity
                  style={getStyles(colors, isDark).recentRetryButton}
                  onPress={() => {
                    console.log('🔄 [DASHBOARD] Retrying recent activities fetch');
                    clearRecentError();
                    fetchRecentActivities();
                  }}
                >
                  <Text style={getStyles(colors, isDark).recentRetryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <View key={activity.id || index} style={[getStyles(colors, isDark).activityItem, index === recentActivity.length - 1 && getStyles(colors, isDark).lastActivityItem]}>
                  <View style={[getStyles(colors, isDark).activityIcon, { backgroundColor: activity.color }]}>
                    <Text style={getStyles(colors, isDark).activityIconText}>{String(activity.icon || '📝')}</Text>
                  </View>
                  <View style={getStyles(colors, isDark).activityContent}>
                    <Text style={getStyles(colors, isDark).activityTitle}>{activity.title || 'Activity'}</Text>
                    <Text style={getStyles(colors, isDark).activityDescription}>{activity.description || 'No description'}</Text>
                    <Text style={getStyles(colors, isDark).activityTime}>{activity.time || 'Unknown time'}</Text>
                    {activity.location && typeof activity.location === 'string' && activity.location.length > 0 && (
                      <Text style={getStyles(colors, isDark).activityLocation}>
                        📍 {activity.location}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={getStyles(colors, isDark).noActivityContainer}>
                <Text style={getStyles(colors, isDark).noActivityIcon}>📝</Text>
                <Text style={getStyles(colors, isDark).noActivityText}>No recent activity</Text>
                <Text style={getStyles(colors, isDark).noActivitySubtext}>Submit your first safety observation to get started</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        <View style={getStyles(colors, isDark).bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={getStyles(colors, isDark).fab}
        onPress={handlePlusButtonPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={colors.gradient.success as [string, string]}
          style={getStyles(colors, isDark).fabGradient}
        >
          <Text style={getStyles(colors, isDark).fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );
}

// Dynamic styles function that accepts colors and isDark
const getStyles = (colors: any, isDark: boolean = false) => StyleSheet.create({
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    color: colors.danger,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Premium Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalTypeGrid: {
    padding: 24,
    gap: 16,
  },
  modalTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalTypeIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalTypeContent: {
    flex: 1,
  },
  modalTypeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalTypeSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },

  // Premium Header Styles
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeMessage: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userRole: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  profileButton: {
    padding: 4,
  },
  profileGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  profileInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerBottom: {
    borderRadius: 16,
    padding: 4,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 20,
    borderRadius: 12,
  },
  headerStat: {
    alignItems: 'center',
    flex: 1,
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  headerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },

  // Container Styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  refreshIcon: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
  },
  realTimeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  realTimeStatusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Premium Stats Grid
  statsGrid: {
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    borderRadius: 16,
    padding: 24,
    shadowColor: 'rgba(59, 130, 246, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    position: 'relative',
    overflow: 'hidden',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  statIcon: {
    fontSize: 20,
    fontWeight: '800',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
  },
  statUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginLeft: 4,
  },
  statSubtitle: {
    fontSize: 13,
    color: colors.text.light,
    fontWeight: '500',
    marginBottom: 16,
  },
  progressSection: {
    gap: 10,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressInfoContainer: {
    gap: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  progressText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  progressExceededText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTarget: {
    fontSize: 11,
    color: colors.text.light,
    fontWeight: '500',
  },
  cardAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },

  // Premium Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: 'rgba(59, 130, 246, 0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  metricIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  metricStatus: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  metricDetail: {
    fontSize: 9,
    color: colors.text.light,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Premium Quick Actions
  quickActionsContainer: {
    gap: 12,
  },
  quickActionCard: {
    borderRadius: 16,
    shadowColor: 'rgba(59, 130, 246, 0.12)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    borderRadius: 16,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  quickActionIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  quickActionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  arrowIcon: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600',
  },

  // Premium Activity Card
  activityCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: 'rgba(59, 130, 246, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.6)',
  },
  lastActivityItem: {
    borderBottomWidth: 0,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  activityIconText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 12,
    color: colors.text.light,
    fontWeight: '500',
  },
  noActivityContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noActivityIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noActivityText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  noActivitySubtext: {
    fontSize: 14,
    color: colors.text.light,
    textAlign: 'center',
  },

  // Profile Modal Styles
  profileBody: {
    padding: 24,
    alignItems: 'center',
  },
  profileAvatarContainer: {
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  profileInfoSection: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  profileInfoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  profileInfoValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: colors.danger,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Settings Styles
  settingsSection: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  settingsRowContent: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingsDescription: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  themeSelector: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  themeSelectorText: {
    fontSize: 18,
  },

  // Premium FAB
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },

  bottomSpacing: {
    height: 32,
  },

  // Recent Activity Additional Styles
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentRefreshButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentRefreshButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  recentLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  recentLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  recentErrorContainer: {
    alignItems: 'center',
    padding: 24,
  },
  recentErrorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  recentErrorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  recentRetryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recentRetryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activityLocation: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    fontWeight: '500',
  },
  statCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  realTimeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  realTimeText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});