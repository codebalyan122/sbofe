import { SetStateAction, useState } from "react";
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
  Modal
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from "expo-router";
import FormInput from "./components/FormInput";
import { useAuthStore } from "../stores/authStore";

export default function Login() {
  // ✅ ZUSTAND STATE - Centralized auth management
  const { login, error, clearError } = useAuthStore();
  
  // ✅ LOCAL FORM STATE - Only for form inputs
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("user");
  const [showDropdown, setShowDropdown] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: ""
  });
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();

  const userTypes = [
    { 
      value: "user", 
      label: "Safety Observer", 
      description: "Conduct safety observations and inspections",
      icon: "👁️"
    },
    { 
      value: "moderator", 
      label: "Supervisor", 
      description: "Manage teams and review safety reports",
      icon: "👤"
    },
    { 
      value: "admin", 
      label: "Safety Manager", 
      description: "Oversee safety programs and policies",
      icon: "⚡"
    },
    {
      value: "areaManager",
      label: "Area Manager",
      description: "Manage safety operations in your area",
      icon: "📍"
    }
  ];

  // Enhanced validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) return "Email is required";
    if (!emailRegex.test(email.trim())) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password.trim()) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return "";
  };
  // Clear specific error
  const clearFieldError = (field: string) => {
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  // Clear all errors
  const clearAllErrors = () => {
    setErrors({ email: "", password: "", general: "" });
  };

  // Real-time validation
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email) {
      const emailError = validateEmail(text);
      setErrors(prev => ({ ...prev, email: emailError }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password) {
      const passwordError = validatePassword(text);
      setErrors(prev => ({ ...prev, password: passwordError }));
    }  };

  // Validate form before submission
  const validateForm = () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    setErrors({
      email: emailError,
      password: passwordError,
      general: ""
    });

    return !emailError && !passwordError;
  };
  // Enhanced retry mechanism
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    handleLogin();
  };
  const handleLogin = async () => {
    // Clear previous errors
    clearAllErrors();
    
    // Form validation
    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    // Start loading state
    setIsLoading(true);

    try {
      console.log('🔄 Attempting login with Zustand store...');
      
      // Use Zustand store for login
      const success = await login(email.trim(), password.trim(), userType);
      
      if (success) {
        console.log('✅ Login successful');
        
        // Reset form
        setEmail("");
        setPassword("");
        setUserType("user");
        clearAllErrors();
        setRetryCount(0);
        
        // Get user from store to determine navigation
        const { user } = useAuthStore.getState();
        
        if (user?.userType === "areaManager") {
          console.log('🚀 Navigating to Area Manager dashboard...');
          router.replace("/AreaManagerdashboard");
        } else if (user?.userType === "user") {
          console.log('🚀 Navigating to User dashboard...');
          router.replace("/Dashboard");
        } else {
          console.log('🚀 Navigating to default dashboard...');
          router.replace("/Dashboard");
        }
        
        Alert.alert(
          "Success", 
          `Welcome back, ${user?.username || 'User'}!`,
          [{ text: "Continue" }]
        );
      } else {
        console.log('❌ Login failed');
        
        // Get error from Zustand store
        const { error: storeError } = useAuthStore.getState();
        const errorMessage = storeError || "Login failed. Please check your credentials.";
        
        setErrors(prev => ({ ...prev, general: errorMessage }));
        
        // Show retry option for retryable errors
        if (retryCount < 3) {
          setTimeout(() => {
            Alert.alert(
              "Login Failed",
              `${errorMessage}\n\nWould you like to try again?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Retry", onPress: handleRetry }
              ]
            );
          }, 500);
        }
      }
    } catch (error) {
      console.log('❌ Login error:', error);
      
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      
      setErrors(prev => ({ 
        ...prev, 
        general: errorMessage
      }));

      // Show retry option for network errors
      if (retryCount < 3) {
        setTimeout(() => {
          Alert.alert(
            "Connection Error",
            `${errorMessage}\n\nWould you like to try again?`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Retry", onPress: handleRetry }
            ]
          );
        }, 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password", 
      "Please contact your administrator to reset your password.\n\nAdmin contact: admin@sbo.com",
      [
        { text: "OK" },
        { 
          text: "Contact Admin", 
          onPress: () => {
            // You can add email functionality here
            console.log("Contact admin for password reset");
          }
        }
      ]
    );
  };

  const handleBackToHome = () => {
    clearAllErrors();
    router.back();
  };

  const selectedUserType = userTypes.find(type => type.value === userType) || userTypes[0];

  const handleRoleSelect = (roleValue: SetStateAction<string>) => {
    setUserType(roleValue);
    setShowDropdown(false);
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
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={handleBackToHome}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoText}>SBO</Text>
                </View>
                <Text style={styles.welcomeText}>Welcome Back</Text>
                <Text style={styles.subtitleText}>Access your safety dashboard</Text>
              </View>
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>Sign In</Text>
                <View style={styles.divider} />
                <Text style={styles.cardSubtitle}>Enter your credentials to continue</Text>
              </View>

              <View style={styles.formContainer}>
                {/* General Error Display */}
                {errors.general ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{errors.general}</Text>
                  </View>
                ) : null}

                <FormInput
                  label="Email Address"
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  error={errors.email}
                  onFocus={() => clearFieldError("email")}
                />
                
                <FormInput
                  label="Password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="Enter your password"
                  error={errors.password}
                  onFocus={() => clearFieldError("password")}
                />
                
                {/* Role Dropdown */}
                <View style={styles.dropdownContainer}>
                  <Text style={styles.dropdownLabel}>Role</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowDropdown(true)}
                  >
                    <View style={styles.dropdownButtonContent}>
                      <View style={styles.selectedRoleContainer}>
                        <Text style={styles.selectedRoleIcon}>{selectedUserType?.icon}</Text>
                        <View style={styles.selectedRoleText}>
                          <Text style={styles.selectedRoleLabel}>{selectedUserType?.label}</Text>
                          <Text style={styles.selectedRoleDescription}>{selectedUserType?.description}</Text>
                        </View>
                      </View>
                      <Text style={styles.dropdownArrow}>⌄</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.forgotButton} 
                  onPress={handleForgotPassword}
                >
                  <Text style={styles.forgotButtonText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Text>
                </TouchableOpacity>

                {/* TEST BUTTON - Remove after fixing navigation */}
                {/* <TouchableOpacity 
                  style={[styles.loginButton, { backgroundColor: '#f59e0b', marginTop: 10 }]}
                  onPress={() => {
                    console.log('🧪 TEST: Direct navigation to dashboard...');
                    try {
                      router.push("/Dashboard");
                      console.log('✅ TEST: Navigation command executed');
                    } catch (error) {
                      console.error('❌ TEST: Navigation failed:', error);
                      const errorMsg = error instanceof Error ? error.message : String(error);
                      Alert.alert("Test Failed", `Navigation error: ${errorMsg}`);
                    }
                  }}
                >
                  <Text style={styles.loginButtonText}>🧪 Test Dashboard Navigation</Text>
                </TouchableOpacity> */}

                {/* Retry indicator */}
                {retryCount > 0 && (
                  <View style={styles.retryContainer}>
                    <Text style={styles.retryText}>
                      Retry attempt: {retryCount}/3
                    </Text>
                  </View>
                )}

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity 
                  style={styles.registerLink}
                  onPress={() => router.push("/register")}
                >
                  <Text style={styles.registerLinkText}>
                    Need an account? <Text style={styles.registerLinkBold}>Request Access</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Secure authentication • Enterprise-grade security
              </Text>
              <Text style={styles.versionText}>SBO Platform v2.1.0</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Role Selection Modal */}
        <Modal
          visible={showDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDropdown(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Your Role</Text>
                  <Text style={styles.modalSubtitle}>Choose the role that best describes your position</Text>
                </View>
                
                <ScrollView style={styles.rolesList} showsVerticalScrollIndicator={false}>
                  {userTypes.map((type, index) => (
                    <TouchableOpacity
                      key={`${type.value}-${index}`}
                      style={[
                        styles.roleItem,
                        userType === type.value && styles.roleItemSelected,
                        index === userTypes.length - 1 && styles.roleItemLast
                      ]}
                      onPress={() => handleRoleSelect(type.value)}
                    >
                      <View style={styles.roleItemContent}>
                        <Text style={styles.roleIcon}>{type.icon}</Text>
                        <View style={styles.roleTextContainer}>
                          <Text style={[
                            styles.roleLabel,
                            userType === type.value && styles.roleLabelSelected
                          ]}>
                            {type.label}
                          </Text>
                          <Text style={[
                            styles.roleDescription,
                            userType === type.value && styles.roleDescriptionSelected
                          ]}>
                            {type.description}
                          </Text>
                        </View>
                        {userType === type.value && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowDropdown(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
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
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
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
    fontSize: 24,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 2,
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
  },
  formContainer: {
    padding: 32,
  },
  // Error handling styles
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
  },
  retryContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  retryText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '500',
  },
  dropdownContainer: {
    marginBottom: 24,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  dropdownButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedRoleIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  selectedRoleText: {
    flex: 1,
  },
  selectedRoleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  selectedRoleDescription: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '400',
  },
  dropdownArrow: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 28,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
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
  loginButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
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
  registerLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerLinkText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '400',
  },
  registerLinkBold: {
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 25,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  rolesList: {
    maxHeight: 300,
  },
  roleItem: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  roleItemSelected: {
    backgroundColor: '#eff6ff',
  },
  roleItemLast: {
    borderBottomWidth: 0,
  },
  roleItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  roleLabelSelected: {
    color: '#1e40af',
  },
  roleDescription: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '400',
  },
  roleDescriptionSelected: {
    color: '#3730a3',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalCloseButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginVertical: 20,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});