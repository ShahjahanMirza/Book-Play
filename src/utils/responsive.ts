import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Based on iPhone 6/7/8 dimensions
const BASE_WIDTH = 375;
const BASE_HEIGHT = 667;

/**
 * Responsive width based on screen width
 */
export const wp = (percentage: number): number => {
  const value = (percentage * SCREEN_WIDTH) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

/**
 * Responsive height based on screen height
 */
export const hp = (percentage: number): number => {
  const value = (percentage * SCREEN_HEIGHT) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

/**
 * Responsive font size
 */
export const rf = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Responsive spacing
 */
export const rs = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, SCREEN_HEIGHT / BASE_HEIGHT);
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Check if device is tablet
 */
export const isTablet = (): boolean => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;
  
  if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
    return true;
  } else {
    return (
      pixelDensity === 2 && (adjustedWidth >= 1920 || adjustedHeight >= 1920)
    );
  }
};

/**
 * Get device type
 */
export const getDeviceType = (): 'phone' | 'tablet' => {
  return isTablet() ? 'tablet' : 'phone';
};

/**
 * Responsive dimensions object
 */
export const RESPONSIVE = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isTablet: isTablet(),
  deviceType: getDeviceType(),
  
  // Common responsive values
  padding: {
    xs: rs(4),
    sm: rs(8),
    md: rs(16),
    lg: rs(24),
    xl: rs(32),
  },
  
  margin: {
    xs: rs(4),
    sm: rs(8),
    md: rs(16),
    lg: rs(24),
    xl: rs(32),
  },
  
  fontSize: {
    xs: rf(12),
    sm: rf(14),
    md: rf(16),
    lg: rf(18),
    xl: rf(20),
    xxl: rf(24),
    xxxl: rf(32),
  },
  
  borderRadius: {
    sm: rs(4),
    md: rs(8),
    lg: rs(12),
    xl: rs(16),
    round: rs(50),
  },
  
  iconSize: {
    sm: rs(16),
    md: rs(20),
    lg: rs(24),
    xl: rs(28),
    xxl: rs(32),
  },
};
