import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import SafeObservation from './observations/safeObservation';
import UnsafeObservation from './observations/unsafeObservation';
import NearMissObservation from './observations/NearMiss';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {baseUrl} from '../utils/baseUrl';

type SBOType = 'safe' | 'unsafe' | 'nearmiss';

export default function NewSBO() {
  const router = useRouter();
  const { type } = useLocalSearchParams();

  // If type is provided, render the specific observation component
  if (type && ['safe', 'unsafe', 'nearmiss'].includes(type as string)) {
    switch (type as SBOType) {
      case 'safe':
        return <SafeObservation />;
      case 'unsafe':
        return <UnsafeObservation />;
      case 'nearmiss':
        return <NearMissObservation />;
      default:
        return <ObservationSelector />;
    }
  }

  // If no type is provided, show the selection screen
  return <ObservationSelector />;
}

function ObservationSelector() {
  const router = useRouter();

  const observationTypes = [
    {
      type: 'safe',
      title: 'Safe Observation',
      subtitle: 'Report safe practices you observe',
      description: 'Recognize and share positive safety behaviors to encourage good practices across the workplace.',
      icon: '✓',
      colors: ['#10b981', '#059669'] as [string, string],
    },
    {
      type: 'unsafe',
      title: 'Unsafe Condition',
      subtitle: 'Report unsafe conditions or behaviors',
      description: 'Report hazards, unsafe behaviors, or conditions that could lead to incidents or injuries.',
      icon: '!',
      colors: ['#ef4444', '#dc2626'] as [string, string],
    },
    {
      type: 'nearmiss',
      title: 'Near Miss Incident',
      subtitle: 'Report incidents that could have caused harm',
      description: 'Report situations where an incident almost occurred but was avoided, helping prevent future accidents.',
      icon: '⚡',
      colors: ['#f59e0b', '#d97706'] as [string, string],
    }
  ];

  const handleObservationTypePress = (type: string) => {
    // Navigate with type parameter
    router.push(`/newsbo?type=${type}` as any);
    // Or navigate to separate files
    // router.push(`/observations/${type}` as any);
  };

  const ObservationCard = ({ item }: { item: typeof observationTypes[0] }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleObservationTypePress(item.type)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={item.colors}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Text style={styles.cardIcon}>{item.icon}</Text>
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
          
          <Text style={styles.cardDescription}>{item.description}</Text>
          
          <View style={styles.cardFooter}>
            <Text style={styles.reportButton}>Report Now →</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={false} />
      
      {/* Header */}
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Safety Observation</Text>
            <Text style={styles.headerSubtitle}>Choose observation type</Text>
          </View>

          <View style={styles.placeholderButton} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What would you like to report?</Text>          <Text style={styles.sectionDescription}>
            Select the type of safety observation you&apos;d like to submit. Your reports help create a safer workplace for everyone.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {observationTypes.map((item, index) => (
            <ObservationCard key={item.type} item={item} />
          ))}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Why Report Safety Observations?</Text>
            <View style={styles.infoBullets}>
              <Text style={styles.infoBullet}>• Help prevent accidents and injuries</Text>
              <Text style={styles.infoBullet}>• Share best practices with your team</Text>
              <Text style={styles.infoBullet}>• Contribute to a culture of safety</Text>
              <Text style={styles.infoBullet}>• Anonymous and confidential reporting</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header Styles
  header: {
    paddingTop: (StatusBar.currentHeight ?? 0) + 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    marginBottom: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    textAlign: 'center',
  },
  placeholderButton: {
    width: 40,
    height: 40,
  },
  
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Cards Styles
  cardsContainer: {
    paddingHorizontal: 24,
    gap: 20,
    marginBottom: 32,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardGradient: {
    padding: 24,
  },
  cardContent: {
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 28,
    color: '#ffffff',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    fontWeight: '500',
  },
  cardFooter: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  reportButton: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Info Section Styles
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoBullets: {
    gap: 12,
  },
  infoBullet: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '500',
  },
});