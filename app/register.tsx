import { SetStateAction, useState } from "react";
import { 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  StatusBar,
  Modal
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from "expo-router";
import FormInput from "./components/FormInput";
import PasswordInput from "./components/PasswordInput";
import { validateEmail, validateUsername } from "../utils/validation";
import { webUrl } from "../utils/webUrl";
import { baseUrl } from "../utils/baseUrl";

// Conditional API URL based on platform
const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return webUrl;
  } else {
    return baseUrl;
  }
};

const API_URL = getApiUrl(); // Use the function to get the correct API URL

// Use getApiUrl() directly in fetch calls

// Error types for better handling
const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  AUTH: 'AUTH',
  SERVER: 'SERVER',
  TIMEOUT: 'TIMEOUT',
  CONFLICT: 'CONFLICT'
};

// Type guard for Error objects
const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");   
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [userType, setUserType] = useState("user");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    location: "",
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
  const validateEmailField = (email: string) => {
    if (!email.trim()) return "Email is required";
    if (!validateEmail(email.trim())) return "Please enter a valid email address";
    return "";
  };

  const validateUsernameField = (username: string) => {
    if (!username.trim()) return "Username is required";
    if (username.length < 3) return "Username must be at least 3 characters";
    if (username.length > 20) return "Username must be less than 20 characters";
    if (!validateUsername(username.trim())) return "Username can only contain letters, numbers, and underscores";
    return "";
  };

  const validatePasswordField = (password: string) => {
    if (!password.trim()) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password.length > 128) return "Password must be less than 128 characters";
    return "";
  };

  const validateConfirmPasswordField = (confirmPassword: string, password: string) => {
    if (!confirmPassword.trim()) return "Please confirm your password";
    if (confirmPassword !== password) return "Passwords do not match";
    return "";
  };

  const validateLocationField = (location: string) => {
    if (userType === "areaManager") {
      if (!location.trim()) return "Location is required for Area Managers";
      if (location.length < 3) return "Location must be at least 3 characters";
    }
    return "";
  };

  // Clear specific error
  const clearError = (field: string) => {
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  // Clear all errors
  const clearAllErrors = () => {
    setErrors({ 
      email: "", 
      username: "", 
      password: "", 
      confirmPassword: "", 
      location: "",
      general: "" 
    });
  };
  // Real-time validation handlers
  const handleEmailChange = (text: string) => {
    setEmail(text);
    const emailError = validateEmailField(text);
    setErrors(prev => ({ ...prev, email: emailError }));
  };
  const handleUsernameChange = (text: string) => {
    setUsername(text);
    // Always validate username on change
    const usernameError = validateUsernameField(text);
    setErrors(prev => ({ ...prev, username: usernameError }));
  };
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    // Always validate password on change
    const passwordError = validatePasswordField(text);
    // Also revalidate confirm password since it depends on password
    const confirmPasswordError = confirmPassword ? validateConfirmPasswordField(confirmPassword, text) : "";
    setErrors(prev => ({ 
      ...prev, 
      password: passwordError,
      confirmPassword: confirmPasswordError
    }));
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    // Always validate confirm password on change
    const confirmPasswordError = validateConfirmPasswordField(text, password);
    setErrors(prev => ({ 
      ...prev, 
      confirmPassword: confirmPasswordError 
    }));
  };

  const handleLocationChange = (text: string) => {
    setLocation(text);
    setErrors(prev => ({
      ...prev,
      location: validateLocationField(text)
    }));
  };
  // Enhanced error categorization
  const categorizeError = (error: unknown, response?: Response) => {
    if (!navigator.onLine) {
      return {
        type: ERROR_TYPES.NETWORK,
        message: "No internet connection. Please check your network and try again.",
        canRetry: true
      };
    }

    if (error && isError(error)) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          type: ERROR_TYPES.NETWORK,
          message: `Unable to connect to server at ${API_URL}. Please check:\n• Is the backend server running?\n• Is the IP address correct?\n• Are you on the same network?`,
          canRetry: true
        };
      }

      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return {
          type: ERROR_TYPES.TIMEOUT,
          message: "Request timed out. Please try again.",
          canRetry: true
        };
      }
    }    if (response) {
      switch (response.status) {
        case 400:
          return {
            type: ERROR_TYPES.VALIDATION,
            message: "Invalid registration data. Please check your information.",
            canRetry: false
          };
        case 409:
          return {
            type: ERROR_TYPES.CONFLICT,
            message: "Email or username already exists. Please choose different credentials.",
            canRetry: false
          };
        case 422:
          return {
            type: ERROR_TYPES.VALIDATION,
            message: "Invalid data format. Please check your input.",
            canRetry: false
          };
        case 429:
          return {
            type: ERROR_TYPES.SERVER,
            message: "Too many registration attempts. Please wait a few minutes and try again.",
            canRetry: true
          };
        case 500:
        case 502:
        case 503:
          return {
            type: ERROR_TYPES.SERVER,
            message: "Server error. Please try again in a moment.",
            canRetry: true
          };
      }
    }
    
    // Default error case
    return {
      type: ERROR_TYPES.SERVER,
      message: "An unexpected error occurred. Please try again.",
      canRetry: true
    };
  };
  // Validate entire form before submission
  const validateForm = () => {
    // Validate all fields
    const emailError = validateEmailField(email);
    const usernameError = validateUsernameField(username);
    const passwordError = validatePasswordField(password);
    const confirmPasswordError = validateConfirmPasswordField(confirmPassword, password);
    const locationError = validateLocationField(location);

    // Update error state with new validation results
    setErrors(prev => ({
      ...prev,
      email: emailError,
      username: usernameError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
      location: locationError,
      general: ""
    }));

    // Form is valid if there are no error messages
    const isValid = !emailError && !usernameError && !passwordError && !confirmPasswordError && !locationError;
    return isValid;
  };

  // Enhanced retry mechanism
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    handleRegister();
  };

  // Connection test function
  // const testConnection = async () => {
  //   try {
  //     console.log("Testing connection to:", `${API_URL}/health`);
      
  //     // Create abort controller for timeout
  //     const controller = new AbortController();
  //     const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
  //     const response = await fetch(`${API_URL}/health`, {
  //       method: "GET",
  //       headers: { "Accept": "application/json" },
  //       signal: controller.signal
  //     });
      
  //     clearTimeout(timeoutId);
      
  //     const text = await response.text();
  //     console.log("Health check response:", text);
      
  //     Alert.alert("Connection Test", `Status: ${response.status}\nResponse: ${text.substring(0, 100)}`);
  //   } catch (error: unknown) {
  //     console.error("Connection test failed:", error);
  //     const errorMessage = isError(error) ? error.message : 'Unknown error occurred';
  //     Alert.alert("Connection Failed", errorMessage);
  //   }
  // };

  // Enhanced registration handler with better debugging
  const handleRegister = async () => {
    // Clear previous errors
    clearAllErrors();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Add connection test first
    console.log("Testing connection to:", `${API_URL}/auth/register`);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const requestBody = {
        email: email.trim().toLowerCase(),
        password,
        username: username.trim(),
        userType,
        location: userType === "areaManager" ? location.trim() : undefined
      };

      console.log("Sending request:", { ...requestBody, password: "[HIDDEN]" });

      // API call to register endpoint
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      // Get response text first to see what we're actually receiving
      const responseText = await response.text();
      console.log("Raw response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Parsed JSON:", data);
      } catch (parseError: unknown) {
        console.error("JSON parse error:", parseError);
        console.error("Response was:", responseText);
        
        // Check if it's an HTML error page
        if (responseText.includes('<html>')) {
          throw new Error('Server returned HTML instead of JSON - check if backend is running correctly');
        }
        
        const errorMessage = isError(parseError) ? parseError.message : 'Unknown parsing error';
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}... Parse error: ${errorMessage}`);
      }
      
      if (response.ok) {
        // Registration successful
        setRetryCount(0); // Reset retry count on success
        
        Alert.alert(
          "Success", 
          "Registration successful! Please sign in with your new account.",
          [
            {
              text: "Sign In",
              onPress: () => {
                // Clear form
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setUsername("");
                setUserType("user");
                setLocation("");
                clearAllErrors();
                // Navigate to login
                router.replace("/login");
              }
            }
          ]
        );
      } else {
        // Registration failed - handle specific error messages
        console.error("Server error response:", data);
        
        const errorInfo = categorizeError(null, response);
        
        // Handle specific field errors if provided by server
        if (data.fieldErrors) {
          setErrors(prev => ({
            ...prev,
            email: data.fieldErrors.email || "",
            username: data.fieldErrors.username || "",
            password: data.fieldErrors.password || "",
            confirmPassword: data.fieldErrors.confirmPassword || "",
            location: data.fieldErrors.location || ""
          }));
        }

        // Set general error message
        if (data.error || data.message) {
          setErrors(prev => ({ 
            ...prev, 
            general: data.error || data.message 
          }));
        } else {
          setErrors(prev => ({ 
            ...prev, 
            general: errorInfo.message 
          }));
        }

        // Show retry option for retryable errors
        if (errorInfo.canRetry && retryCount < 3) {
          setTimeout(() => {
            Alert.alert(
              "Registration Failed",
              `${errorInfo.message}\n\nWould you like to try again?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Retry", onPress: handleRetry }
              ]
            );
          }, 500);
        }
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      console.error("Full error object:", error);
      
      // Type-safe error handling
      if (isError(error)) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      // More specific error messages
      let errorMessage = "Unknown error occurred";
      
      if (isError(error)) {
        if (error.message.includes('Network request failed')) {
          errorMessage = `Cannot connect to server at ${API_URL}. Please check:\n• Is the backend server running?\n• Is the IP address correct?\n• Are you on the same network?`;
        } else if (error.message.includes('Invalid JSON')) {
          errorMessage = `Server response is not valid JSON: ${error.message}`;
        } else if (error.name === 'AbortError') {
          errorMessage = "Request timed out. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      const errorInfo = categorizeError(error);
      setErrors(prev => ({ 
        ...prev, 
        general: errorMessage
      }));

      // Show retry option for network errors
      if (errorInfo.canRetry && retryCount < 3) {
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

  // Handler for returning to login screen
  const handleBackToLogin = () => {
    clearAllErrors();
    router.back();
  };

  // Handler for role selection
  const handleRoleSelect = (roleValue: SetStateAction<string>) => {
    setUserType(roleValue);
    setShowDropdown(false);
    // Clear location when switching away from Area Manager
    if (roleValue !== "areaManager") {
      setLocation("");
      setErrors(prev => ({ ...prev, location: "" }));
    }
  };

  // Get the currently selected role type
  const selectedUserType = userTypes.find(type => type.value === userType) || userTypes[0];

  // Form validation status - checks all required fields are filled and valid
  const isFormValid = !errors.email && !errors.username && !errors.password && 
                     !errors.confirmPassword && !errors.location &&
                     email.trim() && username.trim() && password.trim() && 
                     confirmPassword.trim() && 
                     (userType !== "areaManager" || location.trim());

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
                onPress={handleBackToLogin}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoText}>SBO</Text>
                </View>
                <Text style={styles.welcomeText}>Join SBO</Text>
                <Text style={styles.subtitleText}>Create your safety account</Text>
              </View>
            </View>

            {/* Registration Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>Create Account</Text>
                <View style={styles.divider} />
                <Text style={styles.description}>
                  Fill in your details to get started
                </Text>
          </View>
          <View style={styles.formContainer}>
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
                />
                <FormInput
                  label="Username"
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="Choose a username"
                  error={errors.username}
                />
                  <PasswordInput                  label="Password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="Create a password"
                  error={errors.password}
                />

                <PasswordInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder="Confirm your password"
                  error={errors.confirmPassword}
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
                      </View><Text style={styles.dropdownArrow}>⌄</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Location Input for Area Manager */}
                {userType === "areaManager" && (
                  <FormInput
                    label="Location"
                    value={location}
                    onChangeText={handleLocationChange}
                    placeholder="Enter your area/location"
                    error={errors.location}
                  />
                )}                {/* Password Requirements */}
                <View style={styles.requirementsContainer}>
                  <Text style={styles.requirementsTitle}>Password Requirements</Text>
                  
                  <View style={styles.requirementsList}>
                    <View style={styles.requirementItem}>
                      <View style={[
                        styles.requirementIcon,
                        password.length >= 6 ? styles.requirementIconMet : styles.requirementIconUnmet
                      ]}>
                        <Text style={[
                          styles.requirementIconText,
                          password.length >= 6 ? styles.requirementIconTextMet : styles.requirementIconTextUnmet
                        ]}>
                          {password.length >= 6 ? '✓' : '○'}
                        </Text>
                      </View>
                      <Text style={[
                        styles.requirementText,
                        password.length >= 6 ? styles.requirementMet : styles.requirementUnmet
                      ]}>
                        6+ characters
                      </Text>
                    </View>

                    <View style={styles.requirementItem}>
                      <View style={[
                        styles.requirementIcon,
                        password === confirmPassword && password.length > 0 ? styles.requirementIconMet : styles.requirementIconUnmet
                      ]}>
                        <Text style={[
                          styles.requirementIconText,
                          password === confirmPassword && password.length > 0 ? styles.requirementIconTextMet : styles.requirementIconTextUnmet
                        ]}>
                          {password === confirmPassword && password.length > 0 ? '✓' : '○'}
                        </Text>
                      </View>
                      <Text style={[
                        styles.requirementText,
                        password === confirmPassword && password.length > 0 ? styles.requirementMet : styles.requirementUnmet
                      ]}>
                        Passwords match
                      </Text>
                    </View>
                  </View>

                  {/* Compact Strength Indicator */}
                  <View style={styles.strengthIndicator}>
                    <View style={styles.strengthBars}>
                      <View style={[
                        styles.strengthBar,
                        password.length >= 6 ? styles.strengthBarActive : styles.strengthBarInactive
                      ]} />
                      <View style={[
                        styles.strengthBar,
                        password.length >= 8 ? styles.strengthBarActive : styles.strengthBarInactive
                      ]} />
                      <View style={[
                        styles.strengthBar,
                        password === confirmPassword && password.length >= 8 ? styles.strengthBarActive : styles.strengthBarInactive
                      ]} />
                    </View>
                    <Text style={styles.strengthText}>
                      {password.length === 0 ? 'Enter password' :
                       password.length < 6 ? 'Weak' :
                       password.length < 8 ? 'Good' :
                       password === confirmPassword ? 'Strong' : 'Good'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[
                    styles.registerButton, 
                    (!isFormValid || isLoading) && styles.registerButtonDisabled
                  ]} 
                  onPress={handleRegister}
                  disabled={!isFormValid || isLoading}
                >
                  <Text style={styles.registerButtonText}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Text>
                </TouchableOpacity>

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
                  style={styles.loginLink}
                  onPress={() => router.replace("/login")}
                >
                  <Text style={styles.loginLinkText}>
                    Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Secure registration • Enterprise-grade security
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
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
  description: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
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
  // Debug button styles
  debugButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  debugButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  },  requirementsContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  requirementsList: {
    marginBottom: 10,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 2,
  },  requirementIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1.5,
  },
  requirementIconMet: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  requirementIconUnmet: {
    backgroundColor: 'transparent',
    borderColor: '#d1d5db',
  },  requirementIconText: {
    fontSize: 10,
    fontWeight: '700',
  },
  requirementIconTextMet: {
    color: '#ffffff',
  },
  requirementIconTextUnmet: {
    color: '#d1d5db',
  },  requirementText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  requirementMet: {
    color: '#10b981',
  },
  requirementUnmet: {
    color: '#64748b',
  },
  strengthIndicator: {
    alignItems: 'center',
  },  strengthBars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 3,
  },
  strengthBar: {
    height: 3,
    flex: 1,
    borderRadius: 1.5,
  },
  strengthBarActive: {
    backgroundColor: '#10b981',
  },
  strengthBarInactive: {
    backgroundColor: '#e5e7eb',
  },  strengthText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  registerButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  registerButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  registerButtonText: {
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