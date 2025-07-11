// Forum screen for players to find and join games
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { PlayerWelcomeHeader } from '../../../components/PlayerWelcomeHeader';
import { useRouter } from 'expo-router';
import { ForumService, ForumPost } from '../../services/forumService';

export default function ForumScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'today' | 'nearby'>('all');

  useEffect(() => {
    loadPosts();
  }, [activeFilter, activeTab]);

  const loadPosts = async () => {
    try {
      setLoading(true);

      const filters: any = {};

      // Set status based on active tab
      if (activeTab === 'active') {
        filters.status = 'active';
      } else if (activeTab === 'completed') {
        filters.status = 'closed';
      }

      // Apply additional filters for completed tab
      if (activeTab === 'completed') {
        if (activeFilter === 'active') {
          // For completed tab, 'active' filter shows all completed posts
          // No additional filtering needed
        } else if (activeFilter === 'today') {
          const today = new Date().toISOString().split('T')[0];
          filters.date_from = today;
          filters.date_to = today;
        }
      } else {
        // For active tab, apply original filter logic
        if (activeFilter === 'today') {
          const today = new Date().toISOString().split('T')[0];
          filters.date_from = today;
          filters.date_to = today;
        }
      }

      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      const forumPosts = await ForumService.getForumPosts(filters, 20, 0, user?.id);
      setPosts(forumPosts);
    } catch (error) {
      console.error('Error loading forum posts:', error);
      Alert.alert('Error', 'Failed to load forum posts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handlePostPress = (post: ForumPost) => {
    router.push(`/forum-post?postId=${post.id}`);
  };

  const handlePostLongPress = (post: ForumPost) => {
    if (user && post.player_id === user.id) {
      Alert.alert(
        'Post Options',
        'What would you like to do with this post?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Post',
            style: 'destructive',
            onPress: () => handleDeletePost(post)
          }
        ]
      );
    }
  };

  const handleDeletePost = async (post: ForumPost) => {
    if (!user) return;

    Alert.alert(
      'Delete Forum Post',
      'Are you sure you want to delete this forum post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ForumService.deleteForumPost(user.id, post.id);
              Alert.alert('Success', 'Forum post deleted successfully');
              await loadPosts(); // Refresh the list
            } catch (error: any) {
              console.error('Error deleting forum post:', error);
              Alert.alert('Error', error.message || 'Failed to delete forum post');
            }
          }
        }
      ]
    );
  };

  const handleCreatePost = () => {
    router.push('/create-forum-post');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#4CAF50';
      case 'closed': return '#FF9800';
      case 'cancelled': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'closed': return 'Full';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const renderPost = (post: ForumPost) => {
    const isOwnPost = user && post.player_id === user.id;

    return (
      <TouchableOpacity
        key={post.id}
        style={[styles.postCard, isOwnPost && styles.ownPostCard]}
        onPress={() => handlePostPress(post)}
        onLongPress={() => handlePostLongPress(post)}
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.playerInfo}>
            {post.player.profile_image_url ? (
              <Image
                source={{ uri: post.player.profile_image_url }}
                style={styles.playerAvatar}
              />
            ) : (
              <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={20} color="#666" />
              </View>
            )}
            <View style={styles.playerDetails}>
              <Text style={styles.playerName}>{post.player.name}</Text>
              <Text style={styles.postTime}>
                {new Date(post.created_at).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {isOwnPost && (
              <View style={styles.ownPostIndicator}>
                <Text style={styles.ownPostText}>Your Post</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(post.status) }]}>
              <Text style={styles.statusText}>{getStatusText(post.status)}</Text>
            </View>
          </View>
        </View>

        {/* Post Content */}
        {post.note && (
          <Text style={styles.postNote} numberOfLines={2}>
            {post.note}
          </Text>
        )}

        {/* Venue Info */}
        <View style={styles.venueInfo}>
          <View style={styles.venueDetails}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.venueName}>{post.venue_name}</Text>
          </View>
          <Text style={styles.venueLocation}>{post.venue_location}</Text>
        </View>

        {/* Game Details */}
        <View style={styles.gameDetails}>
          <View style={styles.gameInfo}>
            <Ionicons name="calendar" size={16} color="#228B22" />
            <Text style={styles.gameText}>
              {formatDate(post.game_date)}
            </Text>
          </View>

          <View style={styles.gameInfo}>
            <Ionicons name="time" size={16} color="#228B22" />
            <Text style={styles.gameText}>
              {formatTime(post.start_time)} - {formatTime(post.end_time)}
            </Text>
          </View>

          {post.field_name && (
            <View style={styles.gameInfo}>
              <Ionicons name="football" size={16} color="#228B22" />
              <Text style={styles.gameText}>
                {post.field_name}
              </Text>
            </View>
          )}
        </View>

        {/* Offers Count */}
        {post.offers_count > 0 && (
          <View style={styles.offersInfo}>
            <Ionicons name="chatbubbles" size={14} color="#666" />
            <Text style={styles.offersText}>
              {post.offers_count} offer{post.offers_count !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <PlayerWelcomeHeader
        title="Community Forum"
        subtitle="Find players and join games"
      />

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search venues, locations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadPosts}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                loadPosts();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.activeTab]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
              Active Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          {(activeTab === 'completed' ? [
            { key: 'all', label: 'All', icon: 'list' },
            { key: 'active', label: 'All', icon: 'checkmark-circle' },
            { key: 'today', label: 'Today', icon: 'today' },
            { key: 'nearby', label: 'Nearby', icon: 'location' },
          ] : [
            { key: 'all', label: 'All Posts', icon: 'list' },
            { key: 'active', label: 'Active', icon: 'checkmark-circle' },
            { key: 'today', label: 'Today', icon: 'today' },
            { key: 'nearby', label: 'Nearby', icon: 'location' },
          ]).map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                activeFilter === filter.key && styles.activeFilterButton
              ]}
              onPress={() => setActiveFilter(filter.key as any)}
            >
              <Ionicons 
                name={filter.icon as any} 
                size={16} 
                color={activeFilter === filter.key ? '#fff' : '#228B22'} 
              />
              <Text style={[
                styles.filterButtonText,
                activeFilter === filter.key && styles.activeFilterButtonText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Posts List */}
      <ScrollView 
        style={styles.postsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#228B22" />
            <Text style={styles.loadingText}>Loading forum posts...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Posts Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Be the first to share a game!'}
            </Text>
            <TouchableOpacity style={styles.createPostButton} onPress={handleCreatePost}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createPostButtonText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {posts.map(renderPost)}
            <View style={styles.bottomPadding} />
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {!loading && posts.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleCreatePost}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  searchSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 10,
  },
  filtersContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#228B22',
  },
  activeFilterButton: {
    backgroundColor: '#228B22',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#228B22',
    marginLeft: 6,
    fontWeight: '600',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  postsContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#228B22',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createPostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postNote: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  ownPostCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#228B22',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownPostIndicator: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ownPostText: {
    color: '#228B22',
    fontSize: 10,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  postDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 10,
  },
  venueInfo: {
    marginBottom: 10,
  },
  venueDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 5,
  },
  venueLocation: {
    fontSize: 12,
    color: '#666',
    marginLeft: 21,
  },
  gameDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 15,
  },
  gameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  playersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playersText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
    fontWeight: '600',
  },
  spotsLeft: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 5,
  },
  costInfo: {
    alignItems: 'flex-end',
  },
  costText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#228B22',
  },
  offersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  offersText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#228B22',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomPadding: {
    height: 80,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#228B22',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
});
