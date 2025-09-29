import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../stores/authStore';
import { baseUrl } from '../utils/baseUrl';
import { webUrl } from '../utils/webUrl';

const { width } = Dimensions.get('window');

interface DashboardSummary {
  total: number;
  pending: number;
  reviewed: number;
  closed: number;
}

interface DashboardStatistics {
  safetyRate: number;
  responseTime: number;
  completionRate: number;
  trendsData: {
    date: string;
    count: number;
  }[];
}

interface PendingObservation {
  _id: string;
  type: 'safe' | 'unsafe' | 'nearmiss';
  location: string;
  unit: string;
  category: string;
  subcategory: string;
  description: string;
  immediateAction: string;
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'reviewed' | 'closed';
  image?: string;
}

interface AreaManagerProfile {
  id: string;
  username: string;
  email: string;
  userType: 'areaManager' | 'moderator' | 'admin';
  area: string;
  managedAreas?: string[];
  department?: string;
  createdAt?: string;
}

// Enhanced Professional Color Palette
const colors = {
  primary: '#1B4F72',        // Deep professional blue
  secondary: '#2874A6',      // Medium blue
  accent: '#3498DB',         // Bright blue
  success: '#27AE60',        // Green for safe observations
  warning: '#F39C12',        // Orange for near-miss
  danger: '#E74C3C',         // Red for unsafe
  background: '#F8FAFC',     // Light gray background
  surface: '#FFFFFF',        // White surfaces
  text: {
    primary: '#1A1A1A',
    secondary: '#4A5568',
    light: '#718096',
  },
  border: '#E2E8F0',
  shadow: 'rgba(0, 0, 0, 0.1)',
  gradient: {
    primary: ['#1B4F72', '#2874A6', '#3498DB'] as [string, string, string],
    success: ['#27AE60', '#2ECC71'] as [string, string],
    warning: ['#F39C12', '#F4D03F'] as [string, string],
    danger: ['#E74C3C', '#EC7063'] as [string, string],
    accent: ['#3498DB', '#5DADE2'] as [string, string],
  },
};

export default function AreaManagerDashboard() {
  const router = useRouter();
  
  // ✅ ZUSTAND AUTH STORE - Use centralized authentication
  const { user, token, logout, isAuthenticated, getAuthHeaders } = useAuthStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
  const [pendingObservations, setPendingObservations] = useState<PendingObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittedReports, setSubmittedReports] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<AreaManagerProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Get API URL based on platform
  const getApiUrl = () => {
    if (Platform.OS === 'web') {
      return webUrl;
    } else {
      return baseUrl;
    }
  };

  const API_URL = getApiUrl();

  // ✅ AUTH CHECK - Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      console.log('⚠️ User not authenticated, redirecting to login...');
      router.push('/login');
      return;
    }

    if (user.userType !== 'areaManager') {
      console.log('⚠️ User is not an area manager, redirecting...');
      Alert.alert('Access Denied', 'You do not have permission to access this dashboard.', [
        { text: 'OK', onPress: () => router.push('/login') }
      ]);
      return;
    }

    console.log('✅ Area Manager authenticated:', user.username);
  }, [isAuthenticated, token, user, router]);

  // Set user profile from Zustand store
  useEffect(() => {
    if (user) {
      setUserProfile({
        id: user.id,
        username: user.username,
        email: user.email,
        userType: user.userType as 'areaManager',
        area: user.area || 'Not assigned',
        createdAt: user.createdAt
      });
    }
  }, [user]);

  // Handle logout using Zustand store
  const handleLogout = async () => {
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
            try {
              console.log('🔄 Logging out area manager...');
              await logout();
              router.replace('/login');
              console.log('✅ Area manager logged out successfully');
            } catch (error) {
              console.error('❌ Error during logout:', error);
              Alert.alert('Logout Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Show profile modal
  const handleProfile = () => {
    console.log('🔍 Opening Area Manager profile modal...');
    setShowProfileModal(true);
  };

  // Fetch dashboard summary
  const fetchSummary = async () => {
    try {
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('🔄 Fetching dashboard summary...');
      const response = await fetch(`${API_URL}/api/area-manager-dashboard/summary`, {
        headers: getAuthHeaders(),
      });
     
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch summary:', errorText);
        throw new Error('Failed to fetch summary');
      }

      const data = await response.json();
      setSummary(data);
      console.log('✅ Dashboard summary fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching summary:', error);
      Alert.alert('Connection Error', 'Unable to fetch dashboard summary. Please check your connection.');
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('🔄 Fetching dashboard statistics...');
      const response = await fetch(`${API_URL}/api/area-manager-dashboard/statistics`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      
      const data = await response.json();
      setStatistics(data);
      console.log('✅ Dashboard statistics fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
      Alert.alert('Connection Error', 'Unable to fetch performance metrics.');
    }
  };

  // Fetch pending observations
  const fetchPendingObservations = async () => {
    try {
      if (!token) {
        console.error('❌ No auth token found');
        throw new Error('Authentication required');
      }
      
      console.log('🔄 Fetching pending observations...');
      const response = await fetch(`${API_URL}/api/area-manager-dashboard/pending`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch pending observations:', errorText);
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 Pending observations response:', data);

      if (!Array.isArray(data)) {
        console.error('❌ Data is not an array:', data);
        throw new Error('Invalid data format received');
      }

      setPendingObservations(data);
      console.log('✅ Pending observations fetched successfully:', data.length, 'items');
    } catch (error) {
      console.error('❌ Error fetching pending observations:', error);
      setPendingObservations([]);
    }
  };

  // Fetch submitted reports
  const fetchSubmittedReports = async () => {
    try {
      if (!token || !user) {
        console.error('❌ No auth token or user found');
        throw new Error('Authentication required');
      }

      console.log('🔄 Fetching submitted reports for area manager:', user.id);
      const response = await fetch(`${API_URL}/api/area-manager-dashboard/submitted-reports/${user.id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch submitted reports:', errorText);
        throw new Error(`Server responded with ${response.status}`);
      }

      const responseData = await response.json();
      console.log('🔍 Submitted reports response:', responseData);

      if (!responseData.success || !Array.isArray(responseData.data)) {
        console.error('❌ Invalid response format:', responseData);
        throw new Error('Invalid data format received');
      }

      setSubmittedReports(responseData.data);
      console.log('✅ Submitted reports fetched successfully:', responseData.data.length, 'items');
    } catch (error) {
      console.error('❌ Error fetching submitted reports:', error);
      setSubmittedReports([]);
    }
  };

  // Update observation status
  const updateObservationStatus = async (observationType: string, observationId: string, newStatus: 'reviewed' | 'closed') => {
    try {
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('🔄 Updating observation status:', { observationType, observationId, newStatus });
      const response = await fetch(
        `${API_URL}/api/area-manager-dashboard/${observationType}/${observationId}/status`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: newStatus }),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to update status:', errorText);
        throw new Error('Failed to update status');
      }
      
      // Refresh the data after successful update
      await fetchPendingObservations();
      await fetchSummary();
      Alert.alert('Success', `Observation ${newStatus === 'reviewed' ? 'reviewed' : 'closed'} successfully`);
      console.log('✅ Observation status updated successfully');
    } catch (error) {
      console.error('❌ Error updating observation status:', error);
      Alert.alert('Update Error', 'Failed to update observation status. Please try again.');
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    if (!isAuthenticated || !token || !user) {
      console.log('⚠️ Not authenticated, skipping data fetch');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Fetching all dashboard data...');
      await Promise.all([
        fetchSummary(),
        fetchStatistics(),
        fetchPendingObservations(),
        fetchSubmittedReports()
      ]);
      console.log('✅ All dashboard data fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      Alert.alert(
        'Loading Error',
        'Some dashboard data could not be loaded. Pull down to refresh and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Initialize dashboard data
  useEffect(() => {
    if (isAuthenticated && token && user && user.userType === 'areaManager') {
      fetchAllData();
    }
  }, [isAuthenticated, token, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const getObservationTypeColor = (type: string) => {
    switch (type) {
      case 'safe': return colors.success;
      case 'unsafe': return colors.danger;
      case 'nearmiss': return colors.warning;
      default: return colors.text.secondary;
    }
  };

  const getObservationTypeIcon = (type: string) => {
    switch (type) {
      case 'safe': return '✓';
      case 'unsafe': return '⚠';
      case 'nearmiss': return '◎';
      default: return '•';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return colors.warning;
      case 'reviewed': return colors.accent;
      case 'closed': return colors.success;
      case 'completed': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading SBO Dashboard...</Text>
        <Text style={styles.loadingSubtext}>Retrieving safety observations</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Enhanced Modern Header */}
      <LinearGradient
        colors={colors.gradient.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Safety Dashboard</Text>
            <Text style={styles.headerSubtitle}>Area Manager Overview</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={handleProfile}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.avatarContainer}
            >
              <Text style={styles.avatarText}>
                {userProfile?.username?.charAt(0)?.toUpperCase() || 'A'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Enhanced Stats Container */}
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.statsBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{summary?.total || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{summary?.pending || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{summary?.closed || 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Observation Summary</Text>
            <Text style={styles.sectionSubtitle}>Current period overview</Text>
          </View>
          
          <View style={styles.summaryGrid}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={[styles.summaryCard, styles.totalCard]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.primary }]}>
                <Text style={[styles.summaryIcon, { color: '#FFFFFF' }]}>#</Text>
              </View>
              <Text style={styles.summaryValue}>{summary?.total || 0}</Text>
              <Text style={styles.summaryLabel}>Total Observations</Text>
              <View style={styles.summaryAccent} />
            </LinearGradient>
            
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={[styles.summaryCard, styles.closedCard]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.success }]}>
                <Text style={[styles.summaryIcon, { color: '#FFFFFF' }]}>✓</Text>
              </View>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{summary?.closed || 0}</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
              <View style={[styles.summaryAccent, { backgroundColor: colors.success }]} />
            </LinearGradient>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Performance Metrics</Text>
            <Text style={styles.sectionSubtitle}>Key safety indicators</Text>
          </View>
          
          <View style={styles.metricsContainer}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.metricCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.metricHeader}>
                <View style={[styles.metricIconContainer, { backgroundColor: colors.success }]}>
                  <Text style={[styles.metricIcon, { color: '#FFFFFF' }]}>◉</Text>
                </View>
                <Text style={styles.metricValue}>{statistics?.safetyRate || 0}%</Text>
              </View>
              <Text style={styles.metricLabel}>Safety Rate</Text>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={colors.gradient.success}
                  style={[styles.progressFill, { width: `${statistics?.safetyRate || 0}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </LinearGradient>
            
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.metricCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.metricHeader}>
                <View style={[styles.metricIconContainer, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.metricIcon, { color: '#FFFFFF' }]}>◷</Text>
                </View>
                <Text style={styles.metricValue}>{statistics?.responseTime || 0}h</Text>
              </View>
              <Text style={styles.metricLabel}>Avg Response Time</Text>
              <Text style={styles.metricDescription}>Target: &lt; 24h</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.metricCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.metricHeader}>
                <View style={[styles.metricIconContainer, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.metricIcon, { color: '#FFFFFF' }]}>%</Text>
                </View>
                <Text style={styles.metricValue}>{statistics?.completionRate || 0}%</Text>
              </View>
              <Text style={styles.metricLabel}>Completion Rate</Text>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={colors.gradient.accent}
                  style={[styles.progressFill, { width: `${statistics?.completionRate || 0}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Pending Observations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Actions</Text>
            <Text style={styles.sectionSubtitle}>
              {pendingObservations.length} observation{pendingObservations.length !== 1 ? 's' : ''} require attention
            </Text>
          </View>
          
          <View style={styles.observationsContainer}>
            {!pendingObservations || pendingObservations.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>✓</Text>
                <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
                <Text style={styles.emptyStateText}>No pending observations require your attention</Text>
              </View>
            ) : (
              pendingObservations.map((observation) => (
                <View key={observation._id} style={styles.observationCard}>
                  <View style={styles.observationHeader}>
                    <View style={styles.observationTypeContainer}>
                      <View style={[styles.typeIndicator, { backgroundColor: getObservationTypeColor(observation.type) }]}>
                        <Text style={styles.typeIcon}>{getObservationTypeIcon(observation.type)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.observationType, { color: getObservationTypeColor(observation.type) }]}>
                          {observation.type.toUpperCase()}
                        </Text>
                        <Text style={styles.observationTime}>{formatDate(observation.submittedAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityText}>HIGH</Text>
                    </View>
                  </View>

                  <View style={styles.observationContent}>
                    <Text style={styles.observationLocation}>📍 {observation.location}</Text>
                    <Text style={styles.observationCategory}>{observation.category} • {observation.subcategory}</Text>
                    <Text style={styles.observationDescription} numberOfLines={2}>{observation.description}</Text>
                    <Text style={styles.observationSubmitter}>Reported by: {observation.submittedBy}</Text>
                  </View>

                  <View style={styles.actionSection}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.reviewButton]}
                      onPress={() => updateObservationStatus(observation.type, observation._id, 'reviewed')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonText}>Mark Reviewed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.closeButton]}
                      onPress={() => updateObservationStatus(observation.type, observation._id, 'closed')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonText}>Close Case</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Submitted Reports Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Submitted Reports</Text>
            <Text style={styles.sectionSubtitle}>
              {submittedReports.length} report{submittedReports.length !== 1 ? 's' : ''} in your area
            </Text>
          </View>
          
          <View style={styles.observationsContainer}>
            {!submittedReports || submittedReports.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📋</Text>
                <Text style={styles.emptyStateTitle}>No Reports Yet</Text>
                <Text style={styles.emptyStateText}>No safety reports have been submitted in your area</Text>
              </View>
            ) : (
              submittedReports.slice(0, 10).map((report) => (
                <View key={report._id} style={styles.observationCard}>
                  <View style={styles.observationHeader}>
                    <View style={styles.observationTypeContainer}>
                      <View style={[styles.typeIndicator, { backgroundColor: getObservationTypeColor(report.type) }]}>
                        <Text style={styles.typeIcon}>{getObservationTypeIcon(report.type)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.observationType, { color: getObservationTypeColor(report.type) }]}>
                          {report.type.toUpperCase()}
                        </Text>
                        <Text style={styles.observationTime}>{formatDate(report.createdAt || report.submittedAt)}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                      <Text style={styles.statusText}>{(report.status || 'pending').toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.observationContent}>
                    <Text style={styles.observationLocation}>📍 {report.location}</Text>
               
                         <Text style={styles.observationCategory}>
                      {report.category}{report.subcategory ? ` • ${report.subcategory}` : ''}
                    </Text>
                    <Text style={styles.observationDescription} numberOfLines={2}>
                      {report.description}
                    </Text>
                    <Text style={styles.observationSubmitter}>
                      Reported by: {report.submittedBy || report.reportedBy || 'Unknown'}
                    </Text>
                  </View>
                </View>
              ))
            )}
            
            {submittedReports.length > 10 && (
              <TouchableOpacity style={styles.viewMoreButton} activeOpacity={0.8}>
                <Text style={styles.viewMoreText}>View All {submittedReports.length} Reports</Text>
                <Text style={styles.viewMoreIcon}>→</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom padding for better scrolling */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Professional Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="rgba(0, 0, 0, 0.5)" translucent={true} />
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {userProfile ? (
              <View style={styles.profileBody}>
                <View style={styles.profileAvatarContainer}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={styles.profileAvatar}
                  >
                    <Text style={styles.profileAvatarText}>
                      {userProfile.username
                        ? userProfile.username
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()
                        : 'AM'}
                    </Text>
                  </LinearGradient>
                </View>
                
                <Text style={styles.profileName}>{userProfile.username}</Text>
                <Text style={styles.profileEmail}>{userProfile.email}</Text>
                
                <View style={styles.profileInfoSection}>
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Role</Text>
                    <Text style={styles.profileInfoValue}>Area Manager</Text>
                  </View>
                  
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Managed Area</Text>
                    <Text style={styles.profileInfoValue}>{userProfile.area || 'Not assigned'}</Text>
                  </View>
                  
                  {userProfile.department && (
                    <View style={styles.profileInfoRow}>
                      <Text style={styles.profileInfoLabel}>Department</Text>
                      <Text style={styles.profileInfoValue}>{userProfile.department}</Text>
                    </View>
                  )}
                  
                  {userProfile.createdAt && (
                    <View style={styles.profileInfoRow}>
                      <Text style={styles.profileInfoLabel}>Member Since</Text>
                      <Text style={styles.profileInfoValue}>
                        {new Date(userProfile.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.profileInfoRow}>
                    <Text style={styles.profileInfoLabel}>Access Level</Text>
                    <Text style={styles.profileInfoValue}>Area Management</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={() => {
                    setShowProfileModal(false);
                    handleLogout();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.profileLoadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.profileLoadingText}>Loading profile...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  // Enhanced Header - No Border Radius
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  // Enhanced Profile Button
  profileButton: {
    padding: 4,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Enhanced Stats Container
  statsContainer: {
    borderRadius: 16,
    padding: 4,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  statsBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 20,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  summaryCard: {
    width: (width - 56) / 2,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: 'rgba(59, 130, 246, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    position: 'relative',
    overflow: 'hidden',
  },
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryIcon: {
    fontSize: 24,
    fontWeight: '800',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.primary,
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  reviewedCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  closedCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  metricsContainer: {
    gap: 16,
  },
  metricCard: {
    borderRadius: 16,
    padding: 24,
    shadowColor: 'rgba(59, 130, 246, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  metricIcon: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  metricDescription: {
    fontSize: 13,
    color: colors.text.light,
    fontStyle: 'italic',
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  observationsContainer: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  observationCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: 'rgba(59, 130, 246, 0.12)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  observationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  observationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  observationType: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  observationTime: {
    fontSize: 11,
    color: colors.text.light,
    fontWeight: '500',
  },
  priorityBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  observationContent: {
    marginBottom: 16,
    gap: 6,
  },
  observationLocation: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  observationCategory: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  observationDescription: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginTop: 2,
  },
  observationSubmitter: {
    fontSize: 12,
    color: colors.text.light,
    fontStyle: 'italic',
    marginTop: 2,
  },
  actionSection: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  reviewButton: {
    backgroundColor: colors.accent,
  },
  closeButton: {
    backgroundColor: colors.text.secondary,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  viewMoreButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  viewMoreIcon: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 20,
  },
  // Professional Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  profileBody: {
    padding: 20,
  },
  profileAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  profileInfoSection: {
    marginBottom: 24,
    gap: 12,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
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
  // Clean Logout Button
  logoutButton: {
    backgroundColor: colors.danger,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
});