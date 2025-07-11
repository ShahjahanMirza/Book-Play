import React from 'react';
import { View, Text, Image, StyleSheet, Platform, StatusBar } from 'react-native';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';
import { RESPONSIVE, hp, wp, rf } from '../src/utils/responsive';

interface CustomHeaderProps {
  title?: string;
  showLogo?: boolean;
}

export function CustomHeader({ title = 'Book & Play', showLogo = true }: CustomHeaderProps) {
  const colorScheme = useColorScheme();

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].header }]}>
      <View style={styles.content}>
        {showLogo && (
          <Image 
            source={require('../assets/images/Book&Play-Icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? hp(6) : (StatusBar.currentHeight || 0) + hp(2),
    paddingBottom: RESPONSIVE.padding.md,
    paddingHorizontal: RESPONSIVE.padding.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hp(6),
  },
  logo: {
    width: RESPONSIVE.iconSize.xl,
    height: RESPONSIVE.iconSize.xl,
    marginRight: RESPONSIVE.margin.md,
  },
  title: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontWeight: 'bold',
    color: '#fff',
  },
});
