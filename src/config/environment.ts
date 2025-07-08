// Environment configuration management
interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appName: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
  googleMapsApiKey: string;
  expoProjectId: string;
  storageBucket: string;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  debugMode: boolean;
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';
  
  return {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    appName: process.env.EXPO_PUBLIC_APP_NAME || 'Book&Play',
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    environment: env as 'development' | 'staging' | 'production',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    expoProjectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID || '',
    storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET || 'venue-images',
    enableAnalytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableCrashReporting: process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true',
    debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
  };
};

export const config = getEnvironmentConfig();

// Environment-specific configurations
export const isDevelopment = config.environment === 'development';
export const isStaging = config.environment === 'staging';
export const isProduction = config.environment === 'production';

// Validation function to ensure required environment variables are set
export const validateEnvironment = (): void => {
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
};

// Log configuration in development
if (isDevelopment && config.debugMode) {
  console.log('Environment Configuration:', {
    environment: config.environment,
    appName: config.appName,
    appVersion: config.appVersion,
    debugMode: config.debugMode,
    // Don't log sensitive information
    hasSupabaseUrl: !!config.supabaseUrl,
    hasSupabaseKey: !!config.supabaseAnonKey,
  });
}
