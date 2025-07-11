import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Calendar } from 'react-native-calendars';

interface BookingCalendarProps {
  onDateSelect: (date: string) => void;
  selectedDate: string;
  venueId?: string;
  minDate?: string;
  maxDate?: string;
  availabilityData?: { [key: string]: 'available' | 'limited' | 'unavailable' };
}

export default function BookingCalendar({
  onDateSelect,
  selectedDate,
  venueId,
  minDate,
  maxDate,
  availabilityData = {}
}: BookingCalendarProps) {
  const today = new Date().toISOString().split('T')[0];
  const maxBookingDate = new Date();
  maxBookingDate.setDate(maxBookingDate.getDate() + 30); // Allow booking up to 30 days in advance

  const handleDayPress = (day: any) => {
    onDateSelect(day.dateString);
  };

  const getMarkedDates = () => {
    const marked: any = {};

    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#228B22',
        selectedTextColor: '#fff',
      };
    }

    // Mark today
    if (today !== selectedDate) {
      marked[today] = {
        ...marked[today],
        marked: true,
        dotColor: '#228B22',
      };
    }

    // Mark availability if provided
    Object.keys(availabilityData).forEach(date => {
      const availability = availabilityData[date];
      if (date !== selectedDate) {
        let dotColor = '#4CAF50'; // Available - green
        if (availability === 'limited') {
          dotColor = '#FF9500'; // Limited - orange
        } else if (availability === 'unavailable') {
          dotColor = '#F44336'; // Unavailable - red
        }

        marked[date] = {
          ...marked[date],
          marked: true,
          dotColor,
        };
      }
    });

    return marked;
  };

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={getMarkedDates()}
        minDate={minDate || today}
        maxDate={maxDate || maxBookingDate.toISOString().split('T')[0]}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#b6c1cd',
          selectedDayBackgroundColor: '#228B22',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#228B22',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#4CAF50',
          selectedDotColor: '#ffffff',
          arrowColor: '#228B22',
          disabledArrowColor: '#d9e1e8',
          monthTextColor: '#2d4150',
          indicatorColor: '#228B22',
          textDayFontFamily: 'System',
          textMonthFontFamily: 'System',
          textDayHeaderFontFamily: 'System',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
        style={styles.calendar}
      />

      {/* Availability Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Availability:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>Limited</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Full</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: 10,
  },
  legend: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});
