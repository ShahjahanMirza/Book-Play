import React from 'react';
import { ViewStyle, TouchableOpacityProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface AnimatedPressableProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  scaleValue?: number;
  springConfig?: {
    damping?: number;
    stiffness?: number;
  };
}

export function AnimatedPressable({
  children,
  style,
  onPress,
  scaleValue = 0.95,
  springConfig = { damping: 15, stiffness: 150 },
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const gesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(scaleValue, springConfig);
      opacity.value = withTiming(0.8, { duration: 100 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, springConfig);
      opacity.value = withTiming(1, { duration: 100 });
    })
    .onEnd(() => {
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[style, animatedStyle]} {...props}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
