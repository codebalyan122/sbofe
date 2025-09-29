// screens/SafeObservation.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Dimensions,
  Image,
  Platform,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {baseUrl } from '../../utils/baseUrl';
import { useAuthStore } from '../../stores/authStore';
import { useObservationStore } from '../../stores/observationStore';

const { width } = Dimensions.get('window');

interface ImageData {
  id: string;
  uri: string;
  uploaded: boolean;
  uploadedUrl?: string;
  uploading?: boolean;
}

interface AreaManager {
  _id: string;
  email: string;
  username: string;
  area?: string;
}

// Predefined area manager assignments
const areaManagerAssignments = {
  'Office': {
    name: 'John Smith',
    email: 'john.smith@company.com',
    id: 'office-manager-001'
  },
  'Production': {
    name: 'Sarah Wilson',
    email: 'sarah.wilson@company.com',
    id: 'production-manager-001'
  },
  'Canteen': {
    name: 'Mike Johnson',
    email: 'mike.johnson@company.com',
    id: 'canteen-manager-001'
  },
  'Construction': {
    name: 'David Brown',
    email: 'david.brown@company.com',
    id: 'construction-manager-001'
  },
  'Laboratory': {
    name: 'Dr. Emily Davis',
    email: 'emily.davis@company.com',
    id: 'lab-manager-001'
  },
  'Utilities': {
    name: 'Robert Taylor',
    email: 'robert.taylor@company.com',
    id: 'utilities-manager-001'
  },
  'Storage': {
    name: 'Lisa Anderson',
    email: 'lisa.anderson@company.com',
    id: 'storage-manager-001'
  }
};

// Define the category structure type
type CategoryStructure = {
  'Body Position': string[];
  'Peoples Initial Reaction': string[];
  'PPE': string[];
  'Procedures': string[];
  'Tools And Equipment': never[];
  'Work Environment': never[];
  'Pollution': never[];
  'Food Safety': never[];
};

type CategoryKey = keyof CategoryStructure;

//location and sublocation structure
const locationStructure = {
  'Manufacturing': ['A-100', 'E-9', 'B-6'],
  'Head Office': ['A-100', 'E-9', 'B-6'],
  'R&D': ['A-100', 'E-9', 'B-6'],
};

const areaStructure =[
  'Office',
  'Production',
  'Canteen',
  'Construction',
  'Laboratory',
  'Utilities',
  'Storage',
];

const areas = areaStructure;

const locations = Object.keys(locationStructure);
const getLocationSubLocations = (location: string): string[] => {
  return locationStructure[location as keyof typeof locationStructure] || [];
};

// Helper function to get assigned area manager details
const getAssignedAreaManager = (area: string) => {
  return areaManagerAssignments[area as keyof typeof areaManagerAssignments] || null;
};

// Helper function to safely render text
const safeText = (value: any, fallback: string = ''): string => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

// Helper function to safely get first character
const safeFirstChar = (value: any, fallback: string = '?'): string => {
  const text = safeText(value);
  return text.length > 0 ? text[0].toUpperCase() : fallback;
};

export default function SafeObservation() {
  const { getAuthHeaders, user, token } = useAuthStore();
  const { addRecentActivity } = useObservationStore();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Hardcoded type for Safe Observation
  const observationType = 'safe';
    // Form state
  const [areaManagers, setAreaManagers] = useState<AreaManager[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'safe' as const,
    location: '',
    sublocation: '',
    area: '', 
    category: '',
    subcategory: '',
    description: '',
    immediateAction: '',
    selectedManager: '', 
    selectedManagerName: '', 
    images: [] as ImageData[],
    reportedBy: safeText(user?.username, 'Timothy James'),
    observerName: safeText(user?.username, 'Timothy James'),
    userId: safeText(user?.id, '68384fd2c4bd52fc53f08ee6'),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString()
  });
  
  // Enhanced fetch area managers with better error handling
  const fetchAreaManagers = useCallback(async () => {
    setLoadingManagers(true);
    setManagerError(null);
    
    try {
      console.log('🔍 Debug Info:');
      console.log('- Base URL:', baseUrl);
      console.log('- User:', user);
      console.log('- Token exists:', !!token);
      
      // Check if baseUrl is available
      if (!baseUrl) {
        throw new Error('Base URL not configured');
      }
      
      const headers = getAuthHeaders();
      console.log('- Auth headers:', headers);
      
      const url = `${baseUrl}/api/area-manager-dashboard/managers`;
      console.log('- Fetching from:', url);
        const response = await fetch(url, {
        method: 'GET',
        headers: headers,
      });

      console.log('- Response status:', response.status);
      console.log('- Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('- Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch managers'}`);
      }

      const data = await response.json();
      console.log('- Raw response data:', data);
      
      // Handle different response formats
      let managers = [];
      if (Array.isArray(data)) {
        managers = data;
      } else if (data.managers && Array.isArray(data.managers)) {
        managers = data.managers;
      } else if (data.data && Array.isArray(data.data)) {
        managers = data.data;
      } else if (data.success && data.areaManagers) {
        managers = data.areaManagers;
      } else {
        console.warn('- Unexpected data format:', data);
        managers = [];
      }
      
      console.log('- Processed managers:', managers);
      console.log('- Manager count:', managers.length);
      
      setAreaManagers(managers);
      setManagerError(null); // Clear any previous errors
      
    } catch (error) {
      console.error('❌ Error fetching area managers:', error);
      
      // Set a user-friendly error message without showing alert
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        setManagerError('Network connection issue. Area manager assignment is optional - you can still submit without selecting a manager.');
      } else if (error instanceof Error) {
        setManagerError(`Unable to load area managers: ${error.message}. You can still submit without selecting a manager.`);
      } else {
        setManagerError('Unable to load area managers. You can still submit without selecting a manager.');
      }
      
      setAreaManagers([]);
    } finally {
      setLoadingManagers(false);
    }
  }, [getAuthHeaders, baseUrl, user, token]);  
  
  // Function to auto-assign area manager based on selected area
  const autoAssignAreaManager = useCallback((selectedArea: string) => {
    // First try to use predefined area manager assignments
    const predefinedManager = areaManagerAssignments[selectedArea as keyof typeof areaManagerAssignments];
    
    if (predefinedManager) {
      console.log(`✅ Auto-assigning predefined area manager: ${predefinedManager.name} for area: ${selectedArea}`);
      setFormData(prev => ({
        ...prev,
        selectedManager: predefinedManager.id,
        selectedManagerName: predefinedManager.name
      }));
      return;
    }

    // Fallback to fetched area managers if no predefined assignment
    if (areaManagers.length === 0) {
      console.log('⚠️ No area managers available for auto-assignment');
      return;
    }

    // Find area manager assigned to the selected area from fetched managers
    const assignedManager = areaManagers.find(manager => 
      manager.area === selectedArea
    );

    if (assignedManager) {
      console.log(`✅ Auto-assigning fetched area manager: ${assignedManager.username} for area: ${selectedArea}`);
      setFormData(prev => ({
        ...prev,
        selectedManager: assignedManager._id,
        selectedManagerName: safeText(assignedManager.username, 'Unknown Manager')
      }));
    } else {
      console.log(`⚠️ No area manager found for area: ${selectedArea}`);
      // Clear previous assignment if no manager found for this area
      setFormData(prev => ({
        ...prev,
        selectedManager: '',
        selectedManagerName: ''
      }));
    }
  }, [areaManagers]);

  // Function to handle manager selection
  const handleManagerSelect = (managerId: string) => {
    const selectedManager = areaManagers.find(manager => manager._id === managerId);
    setFormData(prev => ({
      ...prev,
      selectedManager: managerId,
      selectedManagerName: selectedManager ? safeText(selectedManager.username, 'Unknown Manager') : ''
    }));
    setShowManagerDropdown(false);
  };
  
  // Request permissions and fetch managers on mount
  useEffect(() => {
    requestPermissions();
    
    // Add delay to ensure auth is ready, but don't block if network fails
    const timer = setTimeout(() => {
      if (user && token && baseUrl) {
        fetchAreaManagers();
      } else {
        console.warn('⚠️ User, token, or baseUrl not available for fetching managers');
        setManagerError('Authentication or configuration issue. Area manager assignment is optional.');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [fetchAreaManagers, user, token, baseUrl]);

  // Request camera and gallery permissions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permissions are required to upload images!');
    }
  };

  // Safe observation specific categories and subcategories  
  // Observation categories with proper typing
  const categoryStructure: CategoryStructure = {
    'Body Position': [
      'Ascending/Descending',
      'Grip/Force',
      'Lifting/Lowering',
      'Line of fire',
      'Pivoting/Twisting',
      'Posture',
      'Risk of burns',
      'Risk of falling',
      'Others'
    ],
    'Peoples Initial Reaction': [
      'Adapting the task',
      'Adjusting PPE',
      'Changing position',
      'Stopping the task',
      'Others'
    ],
    'PPE': [
      'Body',
      'Eyes and face',
      'Feet and legs',
      'Hands and arms',
      'Head',
      'Hearing',
      'Respiratory System',
      'Others'
    ],
    'Procedures': [
      'Adequate but not followed',
      'Inadequate',
      'LOTO/Energy Isolation',
      'There are no written procedures',
      'Others'
    ],
    'Tools And Equipment': [],
    'Work Environment': [],
    'Pollution': [],
    'Food Safety': []
  };
  
  // Simple array of main categories for compatibility
  const categories = Object.keys(categoryStructure);

  // Category icons mapping for visual enhancement
  const categoryIcons: { [key: string]: string } = {
    'Body Position': 'body-outline',
    'Peoples Initial Reaction': 'people-outline',
    'PPE': 'shield-checkmark-outline',
    'Procedures': 'document-text-outline',
    'Tools And Equipment': 'build-outline',
    'Work Environment': 'business-outline',
    'Pollution': 'leaf-outline',
    'Food Safety': 'restaurant-outline'
  };

  // Category colors for visual distinction
  const getCategoryColor = (category: string, isSelected: boolean = false) => {
    const colorMap: { [key: string]: [string, string] } = {
      'Body Position': ['#f59e0b', '#d97706'],
      'Peoples Initial Reaction': ['#3b82f6', '#2563eb'],
      'PPE': ['#10b981', '#059669'],
      'Procedures': ['#8b5cf6', '#7c3aed'],
      'Tools And Equipment': ['#ef4444', '#dc2626'],
      'Work Environment': ['#06b6d4', '#0891b2'],
      'Pollution': ['#84cc16', '#65a30d'],
      'Food Safety': ['#f97316', '#ea580c']
    };
    
    if (isSelected) {
      return getTypeColor(); // Use safe observation green for selected
    }
    
    return colorMap[category] || ['#6b7280', '#4b5563'];
  };

  // Helper function to safely access category structure
  const getCategorySubcategories = (category: string): string[] => {
    return categoryStructure[category as CategoryKey] || [];
  };

  // Safe observation colors and styling
  const getTypeColor = (): [string, string] => {
    return ['#10b981', '#059669'];
  };

  // Show image picker options
  const showImagePicker = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: () => handleImagePicker('camera') },
        { text: 'Photo Library', onPress: () => handleImagePicker('gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Handle image picking from camera or gallery
  const handleImagePicker = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.4,
          allowsMultipleSelection: false,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const newImage: ImageData = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          uploaded: false,
          uploading: false,
        };

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, newImage],
        }));

        // Auto-upload the image
        uploadSingleImage(newImage);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', `Failed to access ${source}`);
    }
  };

  // Upload single image to server
  const uploadSingleImage = async (imageData: ImageData) => {
    console.log('Starting image upload for:', imageData.id);
    
    // Update image status to uploading
    setFormData(prev => ({
      ...prev,
      images: prev.images.map(img => 
        img.id === imageData.id ? { ...img, uploading: true } : img
      ),
    }));

    const formDataUpload = new FormData();
    
    // Get file info
    const filename = imageData.uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formDataUpload.append('image', {
      uri: imageData.uri,
      name: filename,
      type,
    } as any);

    try {
      console.log('Uploading to:', `${baseUrl}/api/safety/upload`);
      
      const response = await fetch(`${baseUrl}/api/safety/upload`, {
        method: 'POST',
        body: formDataUpload,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload success:', result);
      
      // Update image with uploaded URL
      setFormData(prev => ({
        ...prev,
        images: prev.images.map(img => 
          img.id === imageData.id 
            ? { 
                ...img, 
                uploaded: true, 
                uploading: false, 
                uploadedUrl: result.imageUrl || result.url 
              } 
            : img
        ),
      }));

    } catch (error) {
      console.error('Upload error:', error);
      // Update image status to failed
      setFormData(prev => ({
        ...prev,
        images: prev.images.map(img => 
          img.id === imageData.id ? { ...img, uploading: false } : img
        ),
      }));
      
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    }
  };

  // Remove image from list
  const removeImage = (imageId: string) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setFormData(prev => ({
              ...prev,
              images: prev.images.filter(img => img.id !== imageId),
            }));
          }
        },
      ]
    );
  };

  // Save to database with updated data including manager
  const saveToDatabase = async () => {
    try {
      console.log('Starting form submission...');
      
      const uploadedImageUrls = formData.images
        .filter(img => img.uploaded && img.uploadedUrl)
        .map(img => img.uploadedUrl);

      const submissionData = {
        type: formData.type,
        location: formData.location,
        sublocation: formData.sublocation,
        area: formData.area,
        category: formData.category,
        subcategory: formData.subcategory,
        description: formData.description,
        immediateAction: formData.immediateAction,
        areaManagerId: formData.selectedManager, // Manager ID
        selectedManagerName: formData.selectedManagerName, // Manager Name
        images: uploadedImageUrls,
        reportedBy: formData.reportedBy,
        observerName: formData.observerName,
        userId: formData.userId,
        date: formData.date,
        time: formData.time,
        timestamp: new Date().toISOString(),
      };

      console.log('Submitting data:', submissionData);
      console.log('Submitting to:', `${baseUrl}/api/safety/save-sbo`);

      const response = await fetch(`${baseUrl}/api/safety/save-sbo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(submissionData),
      });

      console.log('Submit response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Submit error response:', errorText);
        throw new Error(`Failed to save: ${response.status} - ${errorText}`);
      }      
      
      const result = await response.json();
      console.log('Submit success:', result);
      
      // ✅ ADD TO RECENT ACTIVITIES - Real-time update
      if (result.success && (result.observation || result.data)) {
        const newObservation = result.observation || result.data;
        const activityData = {
          id: newObservation._id || newObservation.id || Date.now().toString(),
          type: 'safe' as const,
          title: `Safe Practice - ${formData.category}`,
          description: formData.description,
          location: formData.location,
          category: formData.category,
          severity: 'low' as const,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          submittedBy: {
            id: formData.userId,
            username: formData.reportedBy,
            email: user?.email || ''
          }
        };
        
        console.log('➕ [SAFE OBSERVATION] Adding to recent activities:', activityData);
        addRecentActivity(activityData);
      } else {
        // Fallback if server doesn't return the observation
        console.log('⚠️ [SAFE OBSERVATION] No observation data in response, creating fallback');
        const fallbackActivity = {
          id: Date.now().toString(),
          type: 'safe' as const,
          title: `Safe Practice - ${formData.category}`,
          description: formData.description,
          location: formData.location,
          category: formData.category,
          severity: 'low' as const,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          submittedBy: {
            id: formData.userId,
            username: formData.reportedBy,
            email: user?.email || ''
          }
        };
        addRecentActivity(fallbackActivity);
      }
      
      return result;
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  // Enhanced handleNext with manager validation but skip if no managers
  const handleNext = () => {

    if (currentStep === 1) {
    // Validate location
    if (!formData.location) {
      Alert.alert('Missing Information', 'Please select a location.');
      return;
    }
     // Validate location & subloaction
      const sublocations = getLocationSubLocations(formData.location);
      if(sublocations.length > 0 && !formData.sublocation) {
        Alert.alert('Missing Information', 'Please select a sublocation.');
        return;
      }      
      if(!formData.area.trim()) {
        Alert.alert('Missing Information', 'Please select an area.');
        return;
      }
    }    
    
    if (currentStep === 2) {
      // Validate category
      if (!formData.category) {
        Alert.alert('Missing Information', 'Please select a category.');
        return;
      }
      // Validate subcategory if required
      const subcategories = getCategorySubcategories(formData.category);
      if (subcategories.length > 0 && !formData.subcategory) {
        Alert.alert('Missing Information', 'Please select a subcategory.');
        return;
      }
      
      // Area manager is now optional - no validation needed
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      // Close any open dropdowns when navigating
      setShowAreaDropdown(false);
      setShowManagerDropdown(false);
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Close any open dropdowns when navigating
      setShowAreaDropdown(false);
      setShowManagerDropdown(false);
    }
  };

  // Enhanced submit handler with manager validation but allow submission without manager
  const handleSubmit = async () => {
    // Check if any images are still uploading
    const stillUploading = formData.images.some(img => img.uploading);
    if (stillUploading) {
      Alert.alert('Please Wait', 'Some images are still uploading. Please wait for them to complete.');
      return;
    }

    // Validate required fields
    if (!formData.location.trim()) {
      Alert.alert('Missing Information', 'Please select a location.');
      return;
    }

    const sublocationsForValidation = getLocationSubLocations(formData.location);
    if (sublocationsForValidation.length > 0 && !formData.sublocation) {
      Alert.alert('Missing Information', 'Please select a sublocation.');
      return;
    }    
    
    if(!formData.area.trim()){
      Alert.alert('Missing Information', 'Please select an area.');
      return;
    }

    if (!formData.category.trim()) {
      Alert.alert('Missing Information', 'Please select a category.');
      return;
    }    

    // Validate subcategory if the selected category has subcategories
    const subcategoriesForValidation = getCategorySubcategories(formData.category);
    if (subcategoriesForValidation.length > 0 && !formData.subcategory) {
      Alert.alert('Missing Information', 'Please select a subcategory.');
      return;
    }    
    
    if (!formData.description.trim()) {
      Alert.alert('Missing Information', 'Please provide a description.');
      return;
    }

    // Area manager assignment is now optional - proceed directly
    submitObservation();
  };

  const submitObservation = () => {
    Alert.alert(
      'Submit Safe Observation',
      'Are you sure you want to submit this safe observation?\n\nThis will be sent to the safety team for review.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
        },
        { 
          text: 'Submit Report', 
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              await saveToDatabase();
              Alert.alert(
                'Success!', 
                'Your safe observation has been submitted successfully. Thank you for contributing to workplace safety.',
                [
                  {
                    text: 'Done',
                    onPress: () => router.back()
                  }
                ]
              );
            } catch (error) {
              console.error('Submit error:', error);
              Alert.alert(
                'Error', 
                'Failed to submit report. Please check your connection and try again.\n\nError: ' + (error as Error).message
              );
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const ProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        {[1, 2, 3, 4].map((step) => (
          <View key={step} style={styles.progressStepContainer}>
            <View style={[
              styles.progressStep,
              currentStep >= step && { 
                backgroundColor: getTypeColor()[0],
                borderColor: getTypeColor()[1],
                shadowColor: getTypeColor()[0],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
              }
            ]}>
              <Text style={[
                styles.progressStepText,
                currentStep >= step && { color: '#ffffff' }
              ]}>
                {currentStep > step ? '✓' : step.toString()}
              </Text>
            </View>
            {step < 4 && (
              <View style={[
                styles.progressLine,
                currentStep > step && { backgroundColor: getTypeColor()[0] }
              ]} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.progressLabels}>
        <Text style={[styles.progressLabel, currentStep >= 1 && { color: getTypeColor()[0] }]}>Location</Text>
        <Text style={[styles.progressLabel, currentStep >= 2 && { color: getTypeColor()[0] }]}>Category</Text>
        <Text style={[styles.progressLabel, currentStep >= 3 && { color: getTypeColor()[0] }]}>Details</Text>
        <Text style={[styles.progressLabel, currentStep >= 4 && { color: getTypeColor()[0] }]}>Review</Text>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Location & Area</Text>
            <Text style={styles.stepSubtitle}>Choose where this safe observation occurred</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location *</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {Object.keys(locationStructure).map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={[
                        styles.locationChip,
                        formData.location === location && {
                          backgroundColor: getTypeColor()[0],
                          borderColor: getTypeColor()[1],
                          shadowColor: getTypeColor()[0],
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                          elevation: 4,
                        }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, location, sublocation: '' }))}
                    >
                      <Text style={[
                        styles.locationChipText,
                        formData.location === location && { color: '#ffffff' }
                      ]}>
                        {location}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            {/* Show sublocations if a location is selected */}
            {formData.location && getLocationSubLocations(formData.location).length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sublocation *</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {getLocationSubLocations(formData.location).map((sublocation) => (
                      <TouchableOpacity
                        key={sublocation}
                        style={[
                          styles.locationChip,
                          formData.sublocation === sublocation && {
                            backgroundColor: getTypeColor()[0],
                            borderColor: getTypeColor()[1],
                            shadowColor: getTypeColor()[0],
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 4,
                          }
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, sublocation }))}
                      >
                        <Text style={[
                          styles.locationChipText,
                          formData.sublocation === sublocation && { color: '#ffffff' }
                        ]}>
                          {sublocation}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}            
            
            {/* Area selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Area *</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  showAreaDropdown && {
                    borderColor: getTypeColor()[0],
                    borderWidth: 2,
                    shadowColor: getTypeColor()[0],
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }
                ]}
                onPress={() => {
                  setShowAreaDropdown(!showAreaDropdown);
                  if (showManagerDropdown) setShowManagerDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownButtonText,
                  formData.area && formData.area.length > 0 ? { color: '#1e293b' } : { color: '#64748b' }
                ]}>
                  {formData.area && formData.area.length > 0 ? formData.area : 'Select Area'}
                </Text>
                <Ionicons 
                  name={showAreaDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>              
              
              {showAreaDropdown && (
                <View style={styles.modernDropdownContainer}>
                  <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
                    {areas.map((area) => (
                      <TouchableOpacity
                        key={area}
                        style={[
                          styles.modernAreaOption,
                          formData.area === area && styles.selectedAreaOption
                        ]}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, area }));
                          // Auto-assign area manager based on selected area
                          autoAssignAreaManager(area);
                          setShowAreaDropdown(false);
                        }}
                      >                        
                        <View style={styles.areaOptionContent}>
                          <Ionicons 
                            name="location-outline" 
                            size={20} 
                            color={formData.area === area ? getTypeColor()[0] : '#64748b'} 
                          />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[
                              styles.modernAreaOptionText,
                              formData.area === area && { color: getTypeColor()[0], fontWeight: '600' }
                            ]}>
                              {area}
                            </Text>
                            {getAssignedAreaManager(area) && 
                             getAssignedAreaManager(area)?.name && 
                             getAssignedAreaManager(area)?.name.length > 0 && (
                              <Text style={[
                                styles.areaManagerSubtext,
                                formData.area === area && { color: getTypeColor()[0] }
                              ]}>
                                <Text>Manager: {getAssignedAreaManager(area)?.name || 'Unknown'}</Text>
                              </Text>
                            )}
                          </View>
                        </View>
                        {formData.area === area && (
                          <View style={[styles.checkmarkContainer, { backgroundColor: getTypeColor()[0] }]}>
                            <Ionicons name="checkmark" size={16} color="#ffffff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        );

      // Step 2 - Category & Area Manager Selection
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Choose Category & Area Manager</Text>
            <Text style={styles.stepSubtitle}>Select the observation category and assign an area manager</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.categoryGrid}>
                {categories.map((category) => {
                  const isSelected = formData.category === category;
                  const [primaryColor, secondaryColor] = getCategoryColor(category, isSelected);
                  const iconName = categoryIcons[category] || 'help-outline';
                  
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryCard,
                        isSelected && {
                          backgroundColor: primaryColor,
                          borderColor: secondaryColor,
                          shadowColor: primaryColor,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 4,
                        }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, category, subcategory: '' }))}
                      activeOpacity={0.8}
                    >                      
                      <View style={[
                        styles.categoryIconContainer,
                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${primaryColor}15` }
                      ]}>
                        <Ionicons 
                          name={iconName as any} 
                          size={20} 
                          color={isSelected ? '#ffffff' : primaryColor} 
                        />
                      </View>
                      <Text style={[
                        styles.categoryText,
                        { 
                          color: isSelected ? '#ffffff' : '#374151',
                          fontWeight: isSelected ? '700' : '600'
                        }
                      ]}>
                        {category}
                      </Text>                      
                      {isSelected && (
                        <View style={styles.categorySelectedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>            

            {/* Show subcategories if a category is selected and has subcategories */}
            {formData.category && getCategorySubcategories(formData.category).length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Text>Subcategory *</Text>{' '}
                  <Text style={styles.subcategoryCount}>
                    <Text>({getCategorySubcategories(formData.category).length.toString()} options)</Text>
                  </Text>
                </Text>
                <View style={styles.subcategoryContainer}>
                  {getCategorySubcategories(formData.category).map((subcategory: string) => {
                    const isSelected = formData.subcategory === subcategory;
                    const [categoryPrimary] = getCategoryColor(formData.category);
                    
                    return (
                      <TouchableOpacity
                        key={subcategory}
                        style={[
                          styles.subcategoryTag,
                          isSelected && {
                            backgroundColor: categoryPrimary,
                            borderColor: categoryPrimary,
                            shadowColor: categoryPrimary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 4,
                          }
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, subcategory }))}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.subcategoryTagText,
                          { 
                            color: isSelected ? '#ffffff' : '#374151',
                            fontWeight: isSelected ? '600' : '500'
                          }
                        ]}>
                          {subcategory}
                        </Text>
                        {isSelected && (
                          <Ionicons 
                            name="checkmark-circle" 
                            size={12} 
                            color="#ffffff" 
                            style={{ position: 'absolute', top: 4, right: 4 }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Area Manager Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Text>Area Manager </Text>
                {formData.selectedManagerName && formData.selectedManagerName.length > 0 ? 
                  <Text>(Auto-assigned)</Text> : 
                  <Text>(Optional)</Text>
                }
              </Text>
              
              {/* Auto-assigned Manager Display */}
              {formData.selectedManagerName && formData.selectedManagerName.length > 0 && (
                <View style={styles.autoAssignedManagerCard}>
                  <View style={styles.autoAssignedManagerHeader}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.autoAssignedManagerTitle}>Auto-assigned Manager</Text>
                  </View>
                  <Text style={styles.autoAssignedManagerName}>
                    {formData.selectedManagerName || 'Manager'}
                  </Text>
                  {/* Show email if it's a predefined manager */}
                  {formData.area && 
                   getAssignedAreaManager(formData.area) && 
                   getAssignedAreaManager(formData.area)?.email && 
                   getAssignedAreaManager(formData.area)?.email.length > 0 && (
                    <Text style={styles.managerEmail}>
                      {getAssignedAreaManager(formData.area)?.email || 'No email'}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.changeManagerButton}
                    onPress={() => setShowManagerDropdown(true)}
                  >
                    <Text style={styles.changeManagerText}>Change Manager (Optional)</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Show message if no auto-assignment available */}
              {(!formData.selectedManagerName || formData.selectedManagerName.length === 0) && (
                <View style={styles.noAutoAssignContainer}>
                  <Ionicons name="information-circle-outline" size={20} color="#64748b" />
                  <Text style={styles.noAutoAssignText}>
                    No area manager auto-assigned for this area. You can optionally select one manually.
                  </Text>
                </View>
              )}
              
              {loadingManagers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={getTypeColor()[0]} />
                  <Text style={styles.loadingText}>Loading area managers...</Text>
                </View>
              ) : managerError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="information-circle-outline" size={20} color="#f97316" />
                  <Text style={styles.errorText}>{managerError}</Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={fetchAreaManagers}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    showManagerDropdown && {
                      borderColor: getTypeColor()[0],
                      borderWidth: 2,
                      shadowColor: getTypeColor()[0],
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                    }
                  ]}
                  onPress={() => {
                    setShowManagerDropdown(!showManagerDropdown);
                    if (showAreaDropdown) setShowAreaDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownButtonText,
                    { color: '#64748b' }
                  ]}>
                    {formData.selectedManagerName && formData.selectedManagerName.length > 0 ? 
                      'Change Area Manager' : 
                      'Select Area Manager (Optional)'
                    }
                  </Text>
                  <Ionicons 
                    name={showManagerDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              )}

              {showManagerDropdown && !managerError && (
                <View style={styles.dropdownContainer}>
                  <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled>
                    {areaManagers.length === 0 ? (
                      <View style={styles.noManagersContainer}>
                        <Ionicons name="people-outline" size={32} color="#94a3b8" />
                        <Text style={styles.noManagersText}>No registered area managers found</Text>
                        <Text style={styles.noManagersSubtext}>You can still submit without selecting a manager</Text>
                      </View>
                    ) : (
                      areaManagers.map((manager) => (
                        <TouchableOpacity
                          key={manager._id}
                          style={[
                            styles.managerOption,
                            formData.selectedManager === manager._id && styles.selectedManagerOption
                          ]}
                          onPress={() => handleManagerSelect(manager._id)}
                        >
                          <View style={styles.managerInfo}>
                            <View style={styles.managerAvatar}>
                              <Text style={styles.managerAvatarText}>
                                {safeFirstChar(manager.username, '?')}
                              </Text>
                            </View>
                            <View style={styles.managerDetails}>                              
                              <Text style={styles.managerName}>{safeText(manager.username, 'Unknown Manager')}</Text>
                              <Text style={styles.managerEmail}>{safeText(manager.email, 'No email')}</Text>
                            </View>
                          </View>
                          {formData.selectedManager === manager._id && (
                            <Ionicons name="checkmark-circle" size={20} color={getTypeColor()[0]} />
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>                
                </View>
              )}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Safe Observation Details</Text>
            <Text style={styles.stepSubtitle}>Describe the positive safety behavior you observed</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[
                  styles.textInput, 
                  styles.textArea,
                  focusedInput === 'description' && {
                    borderColor: getTypeColor()[0],
                    borderWidth: 2,
                    shadowColor: getTypeColor()[0],
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }
                ]}
                placeholder="Describe the safe behavior or practice you observed in detail..."
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                onFocus={() => setFocusedInput('description')}
                onBlur={() => setFocusedInput(null)}
                multiline
                numberOfLines={4}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Recognition Given</Text>
              <TextInput
                style={[
                  styles.textInput, 
                  styles.textArea,
                  focusedInput === 'immediateAction' && {
                    borderColor: getTypeColor()[0],
                    borderWidth: 2,
                    shadowColor: getTypeColor()[0],
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }
                ]}
                placeholder="Describe any recognition or positive feedback given..."
                value={formData.immediateAction}
                onChangeText={(text) => setFormData(prev => ({ ...prev, immediateAction: text }))}
                onFocus={() => setFocusedInput('immediateAction')}
                onBlur={() => setFocusedInput(null)}
                multiline
                numberOfLines={3}
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Photos Section */}
            <View style={styles.inputGroup}>
              <View style={styles.photosHeader}>
                <Text style={styles.inputLabel}>
                  <Text>Photos ({formData.images.length.toString()}/5)</Text>
                </Text>
                {formData.images.length < 5 && (
                  <TouchableOpacity 
                    style={[styles.addPhotoButton, { borderColor: getTypeColor()[0] }]}
                    onPress={showImagePicker}
                  >
                    <Text style={[styles.addPhotoText, { color: getTypeColor()[0] }]}>+ Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {formData.images.length === 0 ? (
                <TouchableOpacity style={styles.noImagesContainer} onPress={showImagePicker}>
                  <Ionicons name="camera" size={32} color="#64748b" />
                  <Text style={styles.noImagesText}>Add Photos</Text>
                  <Text style={styles.noImagesSubtext}>Tap to add photos of the safe behavior</Text>
                </TouchableOpacity>
              ) : (
                <ScrollView horizontal style={styles.imagePreview} showsHorizontalScrollIndicator={false}>
                  {formData.images.map((image) => (
                    <View key={image.id} style={styles.imageContainer}>
                      <Image source={{ uri: image.uri }} style={styles.previewImage} />
                      
                      {/* Upload Status Indicator */}
                      <View style={styles.imageStatusContainer}>
                        {image.uploading ? (
                          <View style={styles.uploadingIndicator}>
                            <ActivityIndicator size="small" color={getTypeColor()[0]} />
                          </View>
                        ) : image.uploaded ? (
                          <View style={styles.uploadedIndicator}>
                            <Ionicons name="checkmark" size={12} color="#ffffff" />
                          </View>
                        ) : (
                          <View style={styles.pendingIndicator}>
                            <Ionicons name="time" size={10} color="#ffffff" />
                          </View>
                        )}
                      </View>

                      {/* Remove Button */}
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => removeImage(image.id)}
                      >
                        <Ionicons name="close" size={14} color="#ffffff" />
                      </TouchableOpacity>

                      {/* Uploading Overlay */}
                      {image.uploading && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator size="large" color="#ffffff" />
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review & Submit</Text>
            <Text style={styles.stepSubtitle}>Review your safe observation before submitting</Text>
            
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={[styles.reviewTypeIcon, { backgroundColor: getTypeColor()[0] }]}>
                  <Ionicons name="checkmark" size={32} color="#ffffff" />
                </View>
                <View style={styles.reviewTypeInfo}>
                  <Text style={styles.reviewTypeTitle}>SAFE OBSERVATION</Text>
                  <Text style={styles.reviewDate}>
                    <Text>{formData.date} at {formData.time}</Text>
                  </Text>
                </View>
              </View>
                
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Location</Text>
                <Text style={styles.reviewSectionText}>{formData.location}</Text>
                {formData.sublocation && formData.sublocation.length > 0 && (
                  <Text style={styles.reviewSectionSubtext}>{formData.sublocation}</Text>
                )}
                {formData.area && formData.area.length > 0 && (
                  <Text style={styles.reviewSectionSubtext}>{formData.area}</Text>
                )}
              </View>
              
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Category</Text>
                <Text style={styles.reviewSectionText}>{formData.category}</Text>
              </View>
              
              {formData.subcategory && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Subcategory</Text>
                  <Text style={styles.reviewSectionText}>{formData.subcategory}</Text>
                </View>
              )}

              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Area</Text>
                <Text style={styles.reviewSectionText}>{formData.area || 'Not specified'}</Text>
              </View>
              
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Description</Text>
                <Text style={styles.reviewSectionText}>{formData.description}</Text>
              </View>
              
              {formData.immediateAction && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Recognition Given</Text>
                  <Text style={styles.reviewSectionText}>{formData.immediateAction}</Text>
                </View>
              )}

              {formData.images.length > 0 && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>
                    <Text>Photos ({formData.images.length.toString()})</Text>
                  </Text>
                  <ScrollView horizontal style={styles.reviewImagesContainer} showsHorizontalScrollIndicator={false}>
                    {formData.images.map((image) => (
                      <View key={image.id} style={styles.reviewImageContainer}>
                        <Image source={{ uri: image.uri }} style={styles.reviewImage} />
                        <View style={styles.reviewImageStatus}>
                          {image.uploaded ? (
                            <Ionicons name="checkmark" size={10} color="#ffffff" />
                          ) : (
                            <Ionicons name="time" size={10} color="#ffffff" />
                          )}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Reporter</Text>
                <Text style={styles.reviewSectionText}>{formData.reportedBy || 'Unknown'}</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" translucent={false} />
      
      {/* Header */}
      <LinearGradient
        colors={getTypeColor()}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Safe Observation</Text>
            <Text style={styles.headerSubtitle}>Positive Safety Behavior</Text>
          </View>

          {/* Camera Button */}
          <TouchableOpacity 
            style={styles.cameraButton}
            onPress={showImagePicker}
          >
            <Ionicons name="camera" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Form Content */}
      <ScrollView 
        ref={scrollViewRef} 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <ProgressBar />
        </View>
        
        <View style={styles.section}>
          {renderStepContent()}
        </View>
        
        {/* Navigation Buttons */}
        <View style={styles.navigationSection}>
          <View style={styles.navigationButtons}>
            {currentStep > 1 && (
              <TouchableOpacity 
                style={styles.prevButton} 
                onPress={handlePrev}
                disabled={submitting}
              >
                <Text style={styles.prevButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < 4 ? (
              <TouchableOpacity 
                style={[
                  styles.nextButton, 
                  { 
                    backgroundColor: getTypeColor()[0],                    
                    opacity: (!formData.location && currentStep === 1) || 
                            ((!formData.category || 
                              (getCategorySubcategories(formData.category).length > 0 && !formData.subcategory)) && currentStep === 2) ||
                            (!formData.description && currentStep === 3) ? 0.6 : 1
                  }
                ]}
                onPress={handleNext}                
                disabled={((!formData.location || (getLocationSubLocations(formData.location).length > 0 && !formData.sublocation) || !formData.area.trim()) && currentStep === 1) || 
                         ((!formData.category || 
                           (getCategorySubcategories(formData.category).length > 0 && !formData.subcategory)) && currentStep === 2) ||
                         (!formData.description && currentStep === 3)}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.submitButton, { opacity: submitting ? 0.7 : 1 }]}
                onPress={handleSubmit}
                activeOpacity={0.9}
                disabled={submitting}
              >
                <LinearGradient
                  colors={getTypeColor()}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.submitButtonContent}>
                    {submitting ? (
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 10 }} />
                    ) : (
                      <View style={styles.submitIcon}>
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      </View>
                    )}
                    <Text style={styles.submitButtonText}>
                      {submitting ? 'Submitting...' : 'Submit Safe Observation'}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
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
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cameraIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600',
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
  
  // Progress Styles
  progressContainer: {
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
    marginBottom: 8,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  progressStepText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 10,
    borderRadius: 1,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
    // Step Content Styles
  stepContent: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.5)',
    minHeight: 380,
  },
  stepTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    fontWeight: '500',
    lineHeight: 20,
  },
  
  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },  
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  locationChip: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  locationChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    fontWeight: '500',  
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },  
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '48%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 85,
    position: 'relative',
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 16,
  },
  categorySelectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    padding: 1,
  },  
  subcategoryCount: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 6,
  },  
  subcategoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },  
  subcategoryTag: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    marginBottom: 6,
    width: '48%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    position: 'relative',
  },
  subcategoryTagText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
    flex: 1,
  },  
  
  // Loading and error styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },  
  errorContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  errorText: {
    fontSize: 13,
    color: '#ea580c',
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: '500',
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  dropdownContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 250,
  },
  dropdownScrollView: {
    maxHeight: 240,
  },
  managerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedManagerOption: {
    backgroundColor: '#f0fdf4',
  },
  managerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  managerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  managerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  managerDetails: {
    flex: 1,
  },
  managerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  managerEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  managerSbo: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  noManagersContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noManagersText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  noManagersSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  selectedManagerCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  selectedManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedManagerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedManagerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  changeManagerButton: {
    alignSelf: 'flex-start',
  },
  changeManagerText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  
  // Photo Styles
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addPhotoButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noImagesContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  cameraEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  noImagesText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  noImagesSubtext: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  imagePreview: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageStatusContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
  },
  uploadedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadedIcon: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
  },
  uploadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIcon: {
    fontSize: 10,
    color: '#ffffff',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageIcon: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  
  // Review Styles
  reviewCard: {
    gap: 24,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reviewTypeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  reviewTypeIconText: {
    fontSize: 32,
    color: '#ffffff',
  },
  reviewTypeInfo: {
    flex: 1,
  },
  reviewTypeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  reviewDate: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  reviewSection: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reviewSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reviewSectionText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
    fontWeight: '500',
  },
  reviewSectionSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '500',
  },
  reviewImagesContainer: {
    marginTop: 12,
  },
  reviewImageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  reviewImageStatus: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewImageStatusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '700',
  },
  
  // Navigation Styles
  navigationSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 24,
    marginTop: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  prevButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  prevButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  nextButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  submitIconText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },  
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },  
  
  // Auto-assigned manager styles
  autoAssignedManagerCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  autoAssignedManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  autoAssignedManagerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  autoAssignedManagerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  noAutoAssignContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noAutoAssignText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },  
  bottomSpacing: {
    height: 32,
  },  
  
  // Area dropdown styles  
  areaOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernAreaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderLeftWidth: 0,
  },
  areaOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedAreaOption: {
    backgroundColor: '#f0fdf4',
    borderBottomColor: '#bbf7d0',
  },
  areaOptionText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  modernAreaOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginLeft: 12,
    flex: 1,
  },
  modernDropdownContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    maxHeight: 280,
    overflow: 'hidden',
  },  
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaManagerSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
});