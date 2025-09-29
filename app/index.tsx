import { Text, View, StyleSheet, Dimensions, StatusBar } from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
      <LinearGradient
        colors={['#1a365d', '#2c5282', '#3182ce']}
        style={styles.background}
      >
        <View style={styles.container}>
          {/* Logo/Icon placeholder */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>SBO</Text>
            </View>
          </View>

          {/* Main card */}
          <View style={styles.card}>
            <Text style={styles.heading}>
              Welcome to <Text style={styles.brandText}>SBO</Text>
            </Text>
            <Text style={styles.subtitle}>Safety Behavioural Observation</Text>
            <View style={styles.divider} />
            <Text style={styles.description}>
              Enhance workplace safety through systematic behavioral observation and analysis
            </Text>

            <View style={styles.buttonContainer}>
              <Link href="/login" style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </Link>
              
              <Link href="/register" style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Create Account</Text>
              </Link>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footer}>
              © {new Date().getFullYear()} SBO Team. All rights reserved.
            </Text>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  brandText: {
    color: '#3182ce',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  divider: {
    height: 2,
    backgroundColor: '#3182ce',
    width: 60,
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 1,
  },
  description: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400',
  },
  buttonContainer: {
    paddingTop: 32,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#3182ce',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3182ce',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3182ce',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3182ce',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerContainer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 4,
  },
  footer: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  version: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '400',
  },
});