import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

interface ScreenTransitionProps {
  children: React.ReactNode;
  isActive: boolean;
  direction?: 'left' | 'right';
  duration?: number;
}

export function ScreenTransition({
  children,
  isActive,
  direction = 'right',
  duration = 300,
}: ScreenTransitionProps) {
  const translateX = useSharedValue(isActive ? 0 : screenWidth);
  const opacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    if (isActive) {
      translateX.value = withTiming(0, { duration });
      opacity.value = withTiming(1, { duration });
    } else {
      const targetX = direction === 'left' ? -screenWidth : screenWidth;
      translateX.value = withTiming(targetX, { duration });
      opacity.value = withTiming(0, { duration });
    }
  }, [isActive, direction, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: interpolate(
        opacity.value,
        [0, 1],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
