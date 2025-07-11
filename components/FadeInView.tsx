import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export function FadeInView({
  children,
  duration = 600,
  delay = 0,
  style,
  direction = 'up',
  distance = 30,
}: FadeInViewProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(direction === 'left' ? -distance : direction === 'right' ? distance : 0);
  const translateY = useSharedValue(direction === 'up' ? distance : direction === 'down' ? -distance : 0);

  useEffect(() => {
    const animation = () => {
      opacity.value = withTiming(1, { duration });
      translateX.value = withTiming(0, { duration });
      translateY.value = withTiming(0, { duration });
    };

    if (delay > 0) {
      opacity.value = withDelay(delay, withTiming(1, { duration }));
      translateX.value = withDelay(delay, withTiming(0, { duration }));
      translateY.value = withDelay(delay, withTiming(0, { duration }));
    } else {
      animation();
    }
  }, [duration, delay, distance]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        opacity.value,
        [0, 1],
        [0, 1],
        Extrapolation.CLAMP
      ),
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
