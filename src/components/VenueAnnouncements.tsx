import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { COLORS } from '../utils/constants';

interface Announcement {
  id: string;
  venue_id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VenueAnnouncementsProps {
  venueId: string;
  showTitle?: boolean;
  maxItems?: number;
}

export const VenueAnnouncements: React.FC<VenueAnnouncementsProps> = ({
  venueId,
  showTitle = true,
  maxItems,
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (venueId) {
      loadAnnouncements();
    }
  }, [venueId]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('venue_announcements')
        .select('*')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading announcements:', error);
        return;
      }

      let announcementData = data || [];
      
      // Limit items if maxItems is specified
      if (maxItems && announcementData.length > maxItems) {
        announcementData = announcementData.slice(0, maxItems);
      }

      setAnnouncements(announcementData);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (announcementId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(announcementId)) {
      newExpanded.delete(announcementId);
    } else {
      newExpanded.add(announcementId);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const isContentLong = (content: string) => {
    return content.length > 150 || content.split('\n').length > 3;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading announcements...</Text>
      </View>
    );
  }

  if (announcements.length === 0) {
    return null; // Don't show anything if there are no announcements
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <Ionicons name="megaphone" size={20} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Announcements</Text>
        </View>
      )}

      <View style={styles.announcementsList}>
        {announcements.map((announcement) => {
          const isExpanded = expandedItems.has(announcement.id);
          const contentIsLong = isContentLong(announcement.content);
          
          return (
            <View key={announcement.id} style={styles.announcementCard}>
              <View style={styles.announcementHeader}>
                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                <Text style={styles.announcementDate}>
                  {formatDate(announcement.created_at)}
                </Text>
              </View>

              <Text 
                style={styles.announcementContent}
                numberOfLines={isExpanded ? undefined : (contentIsLong ? 3 : undefined)}
              >
                {announcement.content}
              </Text>

              {contentIsLong && (
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => toggleExpanded(announcement.id)}
                >
                  <Text style={styles.expandButtonText}>
                    {isExpanded ? 'Show Less' : 'Show More'}
                  </Text>
                  <Ionicons 
                    name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color={COLORS.primary} 
                  />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  announcementsList: {
    paddingHorizontal: 16,
  },
  announcementCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  announcementDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  announcementContent: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  expandButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 4,
  },
});
