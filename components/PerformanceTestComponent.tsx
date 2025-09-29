// Performance Store Test Component
// This is a simple test to verify real-time updates are working

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePerformanceStore } from '../stores/performanceStore';

export default function PerformanceTestComponent() {
  const { 
    metrics, 
    isLoading, 
    error, 
    incrementSubmissions, 
    refreshPerformance,
    isUpdating,
    pendingUpdates 
  } = usePerformanceStore();

  const handleTestUpdate = (type: 'safe' | 'unsafe' | 'nearmiss') => {
    console.log(`🧪 [TEST] Simulating ${type} observation submission`);
    incrementSubmissions(type);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Store Test</Text>
      
      {isLoading ? (
        <Text>Loading...</Text>
      ) : error ? (
        <Text style={styles.error}>Error: {error}</Text>
      ) : metrics ? (
        <View style={styles.metricsContainer}>
          <Text>Monthly: {metrics.monthlySubmissions}/{metrics.monthlyTarget}</Text>
          <Text>Annual: {metrics.annualSubmissions}/{metrics.annualTarget}</Text>
          <Text>Progress: {Math.round(metrics.monthlyProgress)}%</Text>
          <Text>Trend: {metrics.trend} ({metrics.trendPercentage}%)</Text>
          {isUpdating && (
            <Text style={styles.updating}>🔄 Updating... ({pendingUpdates} pending)</Text>
          )}
        </View>
      ) : (
        <Text>No metrics available</Text>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.safeButton]} 
          onPress={() => handleTestUpdate('safe')}
        >
          <Text style={styles.buttonText}>Test Safe +1</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.unsafeButton]} 
          onPress={() => handleTestUpdate('unsafe')}
        >
          <Text style={styles.buttonText}>Test Unsafe +1</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.nearmissButton]} 
          onPress={() => handleTestUpdate('nearmiss')}
        >
          <Text style={styles.buttonText}>Test Near Miss +1</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.refreshButton]} 
          onPress={refreshPerformance}
        >
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  metricsContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  error: {
    color: 'red',
    marginBottom: 16,
  },
  updating: {
    color: 'green',
    fontWeight: 'bold',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    padding: 12,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  safeButton: {
    backgroundColor: '#10b981',
  },
  unsafeButton: {
    backgroundColor: '#ef4444',
  },
  nearmissButton: {
    backgroundColor: '#f59e0b',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
