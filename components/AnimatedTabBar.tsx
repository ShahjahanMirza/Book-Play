import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

const { width: screenWidth } = Dimensions.get('window');

interface TabItem {
  name: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}

interface AnimatedTabBarProps {
  tabs: TabItem[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

export function AnimatedTabBar({ tabs, activeIndex, onTabPress }: AnimatedTabBarProps) {
  const colorScheme = useColorScheme();
  const tabWidth = screenWidth / tabs.length;
  const translateX = useSharedValue(activeIndex * tabWidth);

  React.useEffect(() => {
    translateX.value = withSpring(activeIndex * tabWidth, {
      damping: 20,
      stiffness: 100,
    });
  }, [activeIndex, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleTabPress = (index: number) => {
    runOnJS(onTabPress)(index);
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].tabBar }]}>
      {/* Animated indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            width: tabWidth,
            backgroundColor: Colors[colorScheme ?? 'light'].tint,
          },
          indicatorStyle,
        ]}
      />
      
      {/* Tab buttons */}
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        
        return (
          <TouchableOpacity
            key={tab.name}
            style={[styles.tab, { width: tabWidth }]}
            onPress={() => handleTabPress(index)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={
                isActive
                  ? '#fff'
                  : Colors[colorScheme ?? 'light'].tabIconDefault
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: isActive
                    ? '#fff'
                    : Colors[colorScheme ?? 'light'].tabIconDefault,
                },
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    paddingBottom: 8,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: 1.5,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
