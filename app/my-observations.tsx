import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useObservationStore } from '../stores/observationStore';
import { useTheme } from '../context/ThemeContext';

// Import types from store
type SBOType = 'safe' | 'unsafe' | 'nearmiss';

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

const { width } = Dimensions.get('window');

const getTypeConfig = (type: SBOType) => {
  switch (type) {
    case 'safe':
      return {
        icon: '✓',
        label: 'Safe Observation',
        color: '#10B981',
        bgColor: '#ECFDF5',
      };
    case 'unsafe':
      return {
        icon: '⚠',
        label: 'Unsafe Condition',
        color: '#EF4444',
        bgColor: '#FEF2F2',
      };
    case 'nearmiss':
      return {
        icon: '◎',
        label: 'Near Miss',
        color: '#F59E0B',
        bgColor: '#FFFBEB',
      };
    default:
      return {
        icon: '?',
        label: 'Unknown',
        color: '#6B7280',
        bgColor: '#F9FAFB',
      };
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending Review', color: '#F59E0B', bgColor: '#FFFBEB' };
    case 'approved':
      return { label: 'Approved', color: '#10B981', bgColor: '#ECFDF5' };
    case 'rejected':
      return { label: 'Rejected', color: '#EF4444', bgColor: '#FEF2F2' };
    case 'in-progress':
      return { label: 'In Progress', color: '#3B82F6', bgColor: '#EFF6FF' };
    case 'completed':
      return { label: 'Completed', color: '#059669', bgColor: '#ECFDF5' };
    default:
      return { label: 'Unknown', color: '#6B7280', bgColor: '#F9FAFB' };
  }
};

// Helper function to safely format dates
const formatDate = (dateString: string | undefined, options?: Intl.DateTimeFormatOptions) => {
  if (!dateString) return 'Date not available';
  
  try {
    return new Date(dateString).toLocaleDateString('en-US', options || {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
};

export default function MyObservations() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { 
    observations, 
    isLoading, 
    error, 
    fetchObservations, 
    clearError 
  } = useObservationStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<SBOType | 'all'>('all');
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadObservations();
  }, []);

  const loadObservations = async () => {
    await fetchObservations();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadObservations();
    setRefreshing(false);
  };

  const filteredObservations = selectedType === 'all' 
    ? observations 
    : observations.filter(obs => obs.type === selectedType);

  const handleObservationPress = (observation: Observation) => {
    setSelectedObservation(observation);
    setDetailModalVisible(true);
  };

  // Helper function to get submission text
  const getSubmissionText = (count: number) => {
    return `${count} total submission${count !== 1 ? 's' : ''}`;
  };

  // Helper function to get filter text
  const getFilterText = (label: string, count: number) => {
    return `${label} (${count})`;
  };

  // Helper function to get empty state title
  const getEmptyStateTitle = (type: SBOType | 'all') => {
    if (type === 'all') {
      return 'No observations yet';
    }
    return `No ${getTypeConfig(type).label.toLowerCase()}s yet`;
  };

  const renderFilterTabs = () => {
    const filterItems = [
      {
        key: 'all',
        type: 'all' as const,
        label: 'All',
        count: observations.length,
        config: null
      },
      ...(['safe', 'unsafe', 'nearmiss'] as SBOType[]).map((type) => ({
        key: type,
        type: type,
        label: getTypeConfig(type).label,
        count: observations.filter(obs => obs.type === type).length,
        config: getTypeConfig(type)
      }))
    ];

    return (
      <View style={getStyles(colors, isDark).filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={getStyles(colors, isDark).filterScrollView}>
          {filterItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                getStyles(colors, isDark).filterTab,
                selectedType === item.type && getStyles(colors, isDark).filterTabActive,
                item.config && { borderColor: item.config.color }
              ]}
              onPress={() => setSelectedType(item.type)}
            >
              {item.config && (
                <Text style={getStyles(colors, isDark).filterTabIcon}>{item.config.icon}</Text>
              )}
              <Text style={[
                getStyles(colors, isDark).filterTabText,
                selectedType === item.type && getStyles(colors, isDark).filterTabTextActive
              ]}>
                {getFilterText(item.label, item.count)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderObservationCard = (observation: Observation) => {
    const typeConfig = getTypeConfig(observation.type);
    const statusConfig = getStatusConfig(observation.status);
    
    return (
      <TouchableOpacity
        style={getStyles(colors, isDark).observationCard}
        onPress={() => handleObservationPress(observation)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isDark ? [colors.surface, colors.surface] : ['#FFFFFF', '#F8FAFC']}
          style={getStyles(colors, isDark).cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={getStyles(colors, isDark).cardHeader}>
            <View style={getStyles(colors, isDark).cardHeaderLeft}>
              <View style={[getStyles(colors, isDark).typeIcon, { backgroundColor: typeConfig.color }]}>
                <Text style={getStyles(colors, isDark).typeIconText}>{typeConfig.icon}</Text>
              </View>
              <View style={getStyles(colors, isDark).cardHeaderInfo}>
                <Text style={getStyles(colors, isDark).observationTitle} numberOfLines={1}>
                  {observation.title || 'Untitled Observation'}
                </Text>
                <Text style={getStyles(colors, isDark).observationType}>
                  {typeConfig.label}
                </Text>
              </View>
            </View>
            <View style={[getStyles(colors, isDark).statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={[getStyles(colors, isDark).statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <Text style={getStyles(colors, isDark).observationDescription} numberOfLines={2}>
            {observation.description || 'No description provided'}
          </Text>

          <View style={getStyles(colors, isDark).cardFooter}>
            <View style={getStyles(colors, isDark).locationInfo}>
              <Text style={getStyles(colors, isDark).locationIcon}>📍</Text>
              <Text style={getStyles(colors, isDark).locationText} numberOfLines={1}>
                {observation.location || 'Location not specified'}
              </Text>
            </View>
            <Text style={getStyles(colors, isDark).dateText}>
              {formatDate(observation.createdAt)}
            </Text>
          </View>

          {observation.severity && (
            <View style={[getStyles(colors, isDark).severityBadge, { 
              backgroundColor: observation.severity === 'high' ? '#FEF2F2' : 
                              observation.severity === 'medium' ? '#FFFBEB' : '#F0FDF4'
            }]}>
              <Text style={[getStyles(colors, isDark).severityText, {
                color: observation.severity === 'high' ? '#DC2626' : 
                       observation.severity === 'medium' ? '#D97706' : '#059669'
              }]}>
                {`${observation.severity.toUpperCase()} SEVERITY`}
              </Text>
            </View>
          )}

          <View style={[getStyles(colors, isDark).cardAccent, { backgroundColor: typeConfig.color }]} />
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedObservation) return null;

    const typeConfig = getTypeConfig(selectedObservation.type);
    const statusConfig = getStatusConfig(selectedObservation.status);

    return (
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={getStyles(colors, isDark).modalOverlay}>
          <View style={getStyles(colors, isDark).modalContent}>
            <View style={getStyles(colors, isDark).modalHeader}>
              <Text style={getStyles(colors, isDark).modalTitle} numberOfLines={2}>
                {selectedObservation.title || 'Untitled Observation'}
              </Text>
              <TouchableOpacity
                style={getStyles(colors, isDark).modalCloseButton}
                onPress={() => setDetailModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={getStyles(colors, isDark).modalBody} showsVerticalScrollIndicator={false}>
              <View style={getStyles(colors, isDark).modalSection}>
                <View style={getStyles(colors, isDark).modalRow}>
                  <View style={[getStyles(colors, isDark).typeIcon, { backgroundColor: typeConfig.color }]}>
                    <Text style={getStyles(colors, isDark).typeIconText}>{typeConfig.icon}</Text>
                  </View>
                  <Text style={getStyles(colors, isDark).modalSectionTitle}>
                    {typeConfig.label}
                  </Text>
                </View>
                <View style={[getStyles(colors, isDark).statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                  <Text style={[getStyles(colors, isDark).statusText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>

              <View style={getStyles(colors, isDark).modalSection}>
                <Text style={getStyles(colors, isDark).modalSectionTitle}>Description</Text>
                <Text style={getStyles(colors, isDark).modalSectionContent}>
                  {selectedObservation.description || 'No description provided'}
                </Text>
              </View>

              <View style={getStyles(colors, isDark).modalSection}>
                <Text style={getStyles(colors, isDark).modalSectionTitle}>Location</Text>
                <Text style={getStyles(colors, isDark).modalSectionContent}>
                  {`📍 ${selectedObservation.location || 'Location not specified'}`}
                </Text>
              </View>

              {selectedObservation.category && (
                <View style={getStyles(colors, isDark).modalSection}>
                  <Text style={getStyles(colors, isDark).modalSectionTitle}>Category</Text>
                  <Text style={getStyles(colors, isDark).modalSectionContent}>
                    {selectedObservation.category}
                  </Text>
                </View>
              )}

              {selectedObservation.severity && (
                <View style={getStyles(colors, isDark).modalSection}>
                  <Text style={getStyles(colors, isDark).modalSectionTitle}>Severity Level</Text>
                  <View style={[getStyles(colors, isDark).severityBadge, { 
                    backgroundColor: selectedObservation.severity === 'high' ? '#FEF2F2' : 
                                    selectedObservation.severity === 'medium' ? '#FFFBEB' : '#F0FDF4'
                  }]}>
                    <Text style={[getStyles(colors, isDark).severityText, {
                      color: selectedObservation.severity === 'high' ? '#DC2626' : 
                             selectedObservation.severity === 'medium' ? '#D97706' : '#059669'
                    }]}>
                      {`${selectedObservation.severity.toUpperCase()} SEVERITY`}
                    </Text>
                  </View>
                </View>
              )}

              {selectedObservation.immediateAction && (
                <View style={getStyles(colors, isDark).modalSection}>
                  <Text style={getStyles(colors, isDark).modalSectionTitle}>Immediate Action Taken</Text>
                  <Text style={getStyles(colors, isDark).modalSectionContent}>
                    {selectedObservation.immediateAction}
                  </Text>
                </View>
              )}

              {selectedObservation.recommendations && (
                <View style={getStyles(colors, isDark).modalSection}>
                  <Text style={getStyles(colors, isDark).modalSectionTitle}>Recommendations</Text>
                  <Text style={getStyles(colors, isDark).modalSectionContent}>
                    {selectedObservation.recommendations}
                  </Text>
                </View>
              )}

              <View style={getStyles(colors, isDark).modalSection}>
                <Text style={getStyles(colors, isDark).modalSectionTitle}>Submission Details</Text>
                <Text style={getStyles(colors, isDark).modalSectionContent}>
                  {`Submitted: ${formatDate(selectedObservation.createdAt, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}`}
                </Text>
                {selectedObservation.updatedAt && selectedObservation.updatedAt !== selectedObservation.createdAt && (
                  <Text style={getStyles(colors, isDark).modalSectionContent}>
                    {`Last Updated: ${formatDate(selectedObservation.updatedAt, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`}
                  </Text>
                )}
                {selectedObservation.submittedBy && (
                  <Text style={getStyles(colors, isDark).modalSectionContent}>
                    {`Reporter: ${selectedObservation.submittedBy.username || selectedObservation.submittedBy.email || 'Unknown'}`}
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading && observations.length === 0) {
    return (
      <View style={getStyles(colors, isDark).loadingContainer}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.primary} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={getStyles(colors, isDark).loadingText}>Loading your observations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={getStyles(colors, isDark).errorContainer}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.primary} />
        <Text style={getStyles(colors, isDark).errorText}>{error}</Text>
        <TouchableOpacity 
          style={getStyles(colors, isDark).retryButton} 
          onPress={() => {
            clearError();
            loadObservations();
          }}
        >
          <Text style={getStyles(colors, isDark).retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={getStyles(colors, isDark).container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={colors.gradient.primary as [string, string, string]}
        style={getStyles(colors, isDark).header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={getStyles(colors, isDark).headerContent}>
          <TouchableOpacity
            style={getStyles(colors, isDark).backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={getStyles(colors, isDark).headerTitleContainer}>
            <Text style={getStyles(colors, isDark).headerTitle}>My Observations</Text>
            <Text style={getStyles(colors, isDark).headerSubtitle}>
              {getSubmissionText(observations.length)}
            </Text>
          </View>          
          <View style={getStyles(colors, isDark).headerRight} />
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Observations List */}
      {filteredObservations.length === 0 ? (
        <ScrollView
          style={getStyles(colors, isDark).emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
        >
          <View style={getStyles(colors, isDark).emptyStateContainer}>
            <Text style={getStyles(colors, isDark).emptyStateIcon}>📝</Text>
            <Text style={getStyles(colors, isDark).emptyStateTitle}>
              {getEmptyStateTitle(selectedType)}
            </Text>            
            <Text style={getStyles(colors, isDark).emptyStateSubtitle}>
              Your safety observation submissions will appear here once you have submitted some.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={getStyles(colors, isDark).scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
        >
          <View style={getStyles(colors, isDark).observationsList}>
            {filteredObservations.map((observation) => (
              <View key={observation.id}>
                {renderObservationCard(observation)}
              </View>
            ))}
          </View>
          <View style={getStyles(colors, isDark).bottomSpacing} />
        </ScrollView>
      )}

      {/* Detail Modal */}
      {renderDetailModal()}
    </View>
  );
}

// Dynamic styles function
const getStyles = (colors: any, isDark: boolean = false) => StyleSheet.create({
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
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header Styles
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },  
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    height: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },

  // Filter Styles
  filterContainer: {
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScrollView: {
    paddingHorizontal: 20,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterTabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterTabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // List Styles
  scrollView: {
    flex: 1,
  },
  observationsList: {
    padding: 20,
    gap: 16,
  },
  observationCard: {
    borderRadius: 16,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIconText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  observationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  observationType: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  observationDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  locationText: {
    fontSize: 13,
    color: colors.text.light,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: colors.text.light,
    fontWeight: '500',
  },
  severityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,    
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    marginLeft: 12,
  },
  modalSectionContent: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  bottomSpacing: {
    height: 20,
  },
});