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
  const env = process.env.EXPO_PUBLIC_ENVIRONMENT || 'production';

  // Production configuration with hardcoded values for reliable deployment
  const productionConfig = {
    supabaseUrl: 'https://lckiftcidquupkplmyfv.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxja2lmdGNpZHF1dXBrcGxteWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4Nzk0NTEsImV4cCI6MjA2NzQ1NTQ1MX0.DRzWwVJAuIIfH52q2VX3UPY2Y9_LcnfpWxKytYofcsc',
    appName: 'Book&Play',
    appVersion: '1.0.0',
    environment: 'production' as const,
    apiBaseUrl: 'https://lckiftcidquupkplmyfv.supabase.co',
    googleMapsApiKey: 'your_production_google_maps_api_key',
    expoProjectId: 'e702bb73-decc-4766-8f7c-b3169daffc27',
    storageBucket: 'venue-images',
    enableAnalytics: true,
    enableCrashReporting: true,
    debugMode: false,
  };

  // Use environment variables if available, otherwise fall back to production config
  return {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || productionConfig.supabaseUrl,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || productionConfig.supabaseAnonKey,
    appName: process.env.EXPO_PUBLIC_APP_NAME || productionConfig.appName,
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION || productionConfig.appVersion,
    environment: env as 'development' | 'staging' | 'production',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || productionConfig.apiBaseUrl,
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || productionConfig.googleMapsApiKey,
    expoProjectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID || productionConfig.expoProjectId,
    storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET || productionConfig.storageBucket,
    enableAnalytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true' || productionConfig.enableAnalytics,
    enableCrashReporting: process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true' || productionConfig.enableCrashReporting,
    debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true' || productionConfig.debugMode,
  };
};

export const config = getEnvironmentConfig();

// Environment-specific configurations
export const isDevelopment = config.environment === 'development';
export const isStaging = config.environment === 'staging';
export const isProduction = config.environment === 'production';

// Validation function to ensure required configuration is available
export const validateEnvironment = (): void => {
  // Check if we have the essential configuration values (either from env vars or fallbacks)
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase configuration. Please ensure Supabase URL and anonymous key are properly configured.'
    );
  }

  // Log warning if using fallback values in development
  if (isDevelopment) {
    const missingEnvVars = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    ].filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
      console.warn(
        `Using fallback configuration for: ${missingEnvVars.join(', ')}\n` +
        'Consider creating a .env.local file with your environment variables.'
      );
    }
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
