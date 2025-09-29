import { useState, useRef } from "react";
import { 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  StatusBar,
  ScrollView,
  Animated
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from "expo-router";
import FormInput from "./components/FormInput";
import { baseUrl } from '../utils/baseUrl';

// Get API URL dynamically
const API_URL = baseUrl;

// Enhanced error types for better handling
const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  SERVER: 'SERVER',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_SERVICE: 'EMAIL_SERVICE'
};

const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_EMAIL: 'INVALID_EMAIL',
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  EMAIL_SERVICE_DOWN: 'EMAIL_SERVICE_DOWN'
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [lastSuccessfulEmail, setLastSuccessfulEmail] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    general: ""
  });
  const [retryCount, setRetryCount] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);
  const [rateLimitReset, setRateLimitReset] = useState(0);
  const [connectionTimeout, setConnectionTimeout] = useState(30000); // Start with 30s, increase on retries
  const router = useRouter();
  
  // Animation refs for better UX
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Enhanced validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) return "Email address is required";
    if (trimmedEmail.length < 5) return "Email address is too short";
    if (trimmedEmail.length > 254) return "Email address is too long";
    if (!emailRegex.test(trimmedEmail)) return "Please enter a valid email address";
    
    // Additional email format checks
    const parts = trimmedEmail.split('@');
    if (parts[0].length > 64) return "Email username part is too long";
    if (parts[1].length > 253) return "Email domain part is too long";
    
    return "";
  };

  // Network connectivity check
  const checkNetworkConnectivity = async () => {
    try {
      // Try to fetch a small resource to test connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return false;
    }
  };

  // Clear specific error with animation
  const clearError = (field: string) => {
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  // Clear all errors
  const clearAllErrors = () => {
    setErrors({ email: "", general: "" });
  };

  // Shake animation for errors
  const shakeErrorAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Pulse animation for success
  const pulseSuccessAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnimation, { toValue: 1.1, duration: 200, useNativeDriver: true }),
      Animated.timing(pulseAnimation, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  // Real-time validation with debouncing
  const handleEmailChange = (text: string) => {
    setEmail(text);
    
    // Clear previous error immediately when user starts typing
    if (errors.email) {
      clearError('email');
    }
    
    // Debounced validation
    setTimeout(() => {
      if (text === email) { // Only validate if text hasn't changed
        const emailError = validateEmail(text);
        if (emailError && text.length > 0) {
          setErrors(prev => ({ ...prev, email: emailError }));
        }
      }
    }, 500);
  };

  // Enhanced error categorization with specific handling
  const categorizeError = (error: any, response?: Response, data?: any) => {
    // Check network connectivity first
    if (!navigator.onLine) {
      return {
        type: ERROR_TYPES.NETWORK,
        code: ERROR_CODES.NETWORK_ERROR,
        message: "You're offline. Please check your internet connection and try again.",
        canRetry: true,
        retryDelay: 3000,
        suggestion: "Check your WiFi or mobile data connection"
      };
    }

    // Handle fetch/network errors
    if (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          type: ERROR_TYPES.NETWORK,
          code: ERROR_CODES.NETWORK_ERROR,
          message: "Unable to connect to server. Please check your internet connection.",
          canRetry: true,
          retryDelay: 5000,
          suggestion: "Try again in a few moments or check your connection"
        };
      }

      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          type: ERROR_TYPES.TIMEOUT,
          code: ERROR_CODES.TIMEOUT_ERROR,
          message: "Request timed out. Your connection may be slow.",
          canRetry: true,
          retryDelay: 2000,
          suggestion: "Try again with a better connection"
        };
      }
    }

    // Handle HTTP response errors
    if (response) {
      switch (response.status) {
        case 400:
          return {
            type: ERROR_TYPES.VALIDATION,
            code: ERROR_CODES.INVALID_EMAIL,
            message: data?.error || "Please enter a valid email address.",
            canRetry: false,
            suggestion: "Double-check your email address"
          };
        case 404:
          return {
            type: ERROR_TYPES.USER_NOT_FOUND,
            code: ERROR_CODES.EMAIL_NOT_FOUND,
            message: "No account found with this email address.",
            canRetry: false,
            suggestion: "Check your email or create a new account"
          };
        case 429:
          const retryAfter = response.headers.get('Retry-After');
          const resetTime = retryAfter ? parseInt(retryAfter) * 1000 : 300000; // 5 minutes default
          return {
            type: ERROR_TYPES.RATE_LIMIT,
            code: ERROR_CODES.RATE_LIMITED,
            message: "Too many password reset requests. Please wait before trying again.",
            canRetry: true,
            retryDelay: resetTime,
            suggestion: `Wait ${Math.ceil(resetTime / 60000)} minutes before trying again`
          };
        case 500:
          return {
            type: ERROR_TYPES.SERVER,
            code: ERROR_CODES.SERVER_ERROR,
            message: "Server error occurred. Our team has been notified.",
            canRetry: true,
            retryDelay: 10000,
            suggestion: "Try again in a few moments"
          };
        case 502:
        case 503:
          return {
            type: ERROR_TYPES.SERVER,
            code: ERROR_CODES.SERVER_ERROR,
            message: "Service temporarily unavailable. Please try again later.",
            canRetry: true,
            retryDelay: 15000,
            suggestion: "Server is temporarily down"
          };
        case 507:
          return {
            type: ERROR_TYPES.EMAIL_SERVICE,
            code: ERROR_CODES.EMAIL_SERVICE_DOWN,
            message: "Email service is temporarily unavailable.",
            canRetry: true,
            retryDelay: 20000,
            suggestion: "Email system is being maintained"
          };
        default:
          return {
            type: ERROR_TYPES.SERVER,
            code: ERROR_CODES.SERVER_ERROR,
            message: `Unexpected error occurred (${response.status}).`,
            canRetry: true,
            retryDelay: 5000,
            suggestion: "Please try again"
          };
      }
    }

    return {
      type: ERROR_TYPES.SERVER,
      code: ERROR_CODES.SERVER_ERROR,
      message: "An unexpected error occurred. Please try again.",
      canRetry: true,
      retryDelay: 5000,
      suggestion: "Contact support if this persists"
    };
  };

  // Rate limiting check
  const checkRateLimit = () => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptTime;
    const minInterval = Math.min(5000 * Math.pow(2, retryCount), 60000); // Exponential backoff, max 1 minute

    if (timeSinceLastAttempt < minInterval) {
      const waitTime = Math.ceil((minInterval - timeSinceLastAttempt) / 1000);
      return {
        limited: true,
        waitTime,
        message: `Please wait ${waitTime} seconds before trying again.`
      };
    }

    return { limited: false };
  };

  // Validate form before submission
  const validateForm = () => {
    const emailError = validateEmail(email);

    setErrors({
      email: emailError,
      general: ""
    });

    if (emailError) {
      shakeErrorAnimation();
    }

    return !emailError;
  };

  // Enhanced retry mechanism with exponential backoff
  const handleRetry = async (errorInfo: any) => {
    const rateCheck = checkRateLimit();
    if (rateCheck.limited) {
      Alert.alert("Please Wait", rateCheck.message);
      return;
    }

    // Check network connectivity before retrying
    if (errorInfo.type === ERROR_TYPES.NETWORK) {
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        Alert.alert(
          "No Internet Connection",
          "Please check your internet connection and try again.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    setRetryCount(prev => prev + 1);
    
    // Increase timeout for subsequent retries
    setConnectionTimeout(prev => Math.min(prev * 1.5, 60000)); // Max 60 seconds
    
    // Add delay before retry if specified
    if (errorInfo.retryDelay) {
      setTimeout(() => {
        handleForgotPassword();
      }, Math.min(errorInfo.retryDelay, 10000)); // Max 10 second delay
    } else {
      handleForgotPassword();
    }
  };

  const handleForgotPassword = async () => {
    // Rate limiting check
    const rateCheck = checkRateLimit();
    if (rateCheck.limited) {
      setErrors(prev => ({ email: prev.email, general: rateCheck.message ?? "" }));
      shakeErrorAnimation();
      return;
    }

    // Clear previous errors
    clearAllErrors();

    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setLastAttemptTime(Date.now());
    
    // Create abort controller with dynamic timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), connectionTimeout);
    
    try {
      console.log('📧 Sending password reset request for:', email);
      console.log('🔄 Attempt:', retryCount + 1, 'Timeout:', connectionTimeout + 'ms');
      
      // Check network connectivity
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        throw new Error('Network connectivity check failed');
      }
      
      // API call to forgot-password endpoint
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase()
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      let data;
      try {
        data = await response.json();
        console.log('📨 Response data:', data);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Invalid response from server - please try again');
      }
      
      if (response.ok) {
        // Reset request successful
        console.log('✅ Password reset request successful');
        
        // Reset states on success
        setRetryCount(0);
        setConnectionTimeout(30000); // Reset timeout
        setIsEmailSent(true);
        setLastSuccessfulEmail(email);
        
        // Success animation
        pulseSuccessAnimation();
        
        // Show success message
        Alert.alert(
          "Email Sent Successfully!", 
          data.message || "Password reset instructions have been sent to your email.",
          [
            {
              text: "OK",
              onPress: () => {
                console.log('📱 User acknowledged email sent');
              }
            }
          ]
        );
        
        // For development/testing - show the reset token
        if (data.resetToken) {
          console.log('🔑 Reset Token (DEV ONLY):', data.resetToken);
          console.log('🔗 Test URL (DEV ONLY):', data.testResetURL);
          
          // In development, offer to navigate directly to reset page
          if (__DEV__) {
            setTimeout(() => {
              Alert.alert(
                "Development Mode",
                "Would you like to go directly to the password reset page?",
                [
                  { text: "No", style: "cancel" },
                  { 
                    text: "Yes", 
                    // onPress: () => router.push(`/reset-password?token=${data.resetToken}`)
                  }
                ]
              );
            }, 1000);
          }
        }
        
      } else {
        // Request failed - handle specific error messages
        console.log('❌ Password reset request failed with status:', response.status);
        const errorInfo = categorizeError(null, response, data);
        
        // Set appropriate error message
        const errorMessage = data?.error || data?.message || errorInfo.message;
        setErrors(prev => ({ 
          ...prev, 
          general: errorMessage 
        }));

        // Trigger error animation
        shakeErrorAnimation();

        // Show retry option for retryable errors
        if (errorInfo.canRetry && retryCount < 5) { // Increased max retries
          setTimeout(() => {
            Alert.alert(
              "Request Failed",
              `${errorMessage}\n\n${errorInfo.suggestion}\n\nWould you like to try again?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Retry", onPress: () => handleRetry(errorInfo) }
              ]
            );
          }, 500);
        } else if (retryCount >= 5) {
          // Max retries reached
          Alert.alert(
            "Maximum Attempts Reached",
            "Please try again later or contact support if the problem persists.",
            [
              { text: "OK" },
              { 
                text: "Contact Support", 
                onPress: () => {
                  // You can add support contact functionality here
                  console.log("Contact support requested");
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Forgot password error:', error);
      
      const errorInfo = categorizeError(error);
      const errorMessage = errorInfo.message;
      
      setErrors(prev => ({ 
        ...prev, 
        general: errorMessage 
      }));

      // Trigger error animation
      shakeErrorAnimation();

      // Show retry option for network errors
      if (errorInfo.canRetry && retryCount < 5) {
        setTimeout(() => {
          Alert.alert(
            "Connection Error",
            `${errorMessage}\n\n${errorInfo.suggestion}\n\nWould you like to try again?`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Retry", onPress: () => handleRetry(errorInfo) }
            ]
          );
        }, 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    clearAllErrors();
    setRetryCount(0);
    setConnectionTimeout(30000);
    router.back();
  };

  const handleResendEmail = () => {
    setIsEmailSent(false);
    setEmail(lastSuccessfulEmail); // Restore last successful email
    clearAllErrors();
    setRetryCount(0); // Reset retry count for resend
  };

  // Format retry information
  const getRetryInfo = () => {
    if (retryCount === 0) return null;
    
    const maxRetries = 5;
    const attemptsLeft = maxRetries - retryCount;
    
    return (
      <View style={styles.retryContainer}>
        <Text style={styles.retryText}>
          Attempt {retryCount + 1}/{maxRetries} • {attemptsLeft} attempts remaining
        </Text>
        {connectionTimeout > 30000 && (
          <Text style={styles.retryTimeoutText}>
            Using extended timeout: {Math.round(connectionTimeout / 1000)}s
          </Text>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={styles.background}
      >
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <Animated.View style={[styles.header, { transform: [{ translateX: shakeAnimation }] }]}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={handleBackToLogin}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              
              <View style={styles.logoContainer}>
                <Animated.View style={[styles.logoCircle, { transform: [{ scale: pulseAnimation }] }]}>
                  <Text style={styles.logoText}>🔒</Text>
                </Animated.View>
                <Text style={styles.welcomeText}>Forgot Password?</Text>
                <Text style={styles.subtitleText}>
                  {isEmailSent 
                    ? "Check your email for reset instructions" 
                    : "Enter your email to reset your password"
                  }
                </Text>
              </View>
            </Animated.View>

            {/* Forgot Password Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>
                  {isEmailSent ? "Email Sent" : "Reset Password"}
                </Text>
                <View style={styles.divider} />
                <Text style={styles.cardSubtitle}>
                  {isEmailSent 
                    ? "We've sent password reset instructions to your email" 
                    : "Enter your email address and we'll send you a link to reset your password"
                  }
                </Text>
              </View>

              <View style={styles.formContainer}>
                {/* General Error Display */}
                {errors.general ? (
                  <Animated.View style={[styles.errorContainer, { transform: [{ translateX: shakeAnimation }] }]}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{errors.general}</Text>
                  </Animated.View>
                ) : null}

                {isEmailSent ? (
                  // Email sent success view
                  <Animated.View style={[styles.successContainer, { transform: [{ scale: pulseAnimation }] }]}>
                    <View style={styles.successIconContainer}>
                      <Text style={styles.successIcon}>📧</Text>
                    </View>
                    <Text style={styles.successTitle}>Check Your Email</Text>                    <Text style={styles.successText}>
                      We&apos;ve sent password reset instructions to:
                    </Text>
                    <Text style={styles.emailText}>{lastSuccessfulEmail}</Text>
                    <Text style={styles.successNote}>
                      Didn&apos;t receive the email? Check your spam folder, wait a few minutes, or try again.
                    </Text>
                    
                    <TouchableOpacity 
                      style={styles.resendButton} 
                      onPress={handleResendEmail}
                    >
                      <Text style={styles.resendButtonText}>Send Again</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ) : (
                  // Email input form
                  <>
                    <FormInput
                      label="Email Address"
                      value={email}
                      onChangeText={handleEmailChange}
                      placeholder="Enter your email address"
                      keyboardType="email-address"
                      error={errors.email}
                    />

                    <TouchableOpacity 
                      style={[
                        styles.resetButton, 
                        (isLoading || !email.trim() || errors.email) && styles.resetButtonDisabled
                      ]} 
                      onPress={handleForgotPassword}
                      disabled={isLoading || !email.trim() || !!errors.email}
                    >
                      <Text style={styles.resetButtonText}>
                        {isLoading ? "Sending..." : "Send Reset Link"}
                      </Text>
                    </TouchableOpacity>

                    {/* Enhanced retry indicator */}
                    {getRetryInfo()}
                  </>
                )}

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity 
                  style={styles.loginLink}
                  onPress={() => router.replace("/login")}
                >
                  <Text style={styles.loginLinkText}>
                    Remember your password? <Text style={styles.loginLinkBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Secure password reset • Enterprise-grade security
              </Text>
              <Text style={styles.versionText}>SBO Platform v2.1.0</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 30,
    fontWeight: '800',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  divider: {
    height: 3,
    backgroundColor: '#3b82f6',
    width: 50,
    borderRadius: 2,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    padding: 32,
  },
  // Enhanced error handling styles
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  retryContainer: {
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  retryText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  retryTimeoutText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  // Success styles
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 16,
  },
  successNote: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  resendButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  resendButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  resetButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '400',
  },
  loginLinkBold: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '400',
  },
});