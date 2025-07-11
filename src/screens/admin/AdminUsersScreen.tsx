// Admin users management screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';

interface User {
  id: string;
  name: string;
  email: string;
  user_type: string;
  phone_number?: string;
  city?: string;
  is_active: boolean;
  created_at: string;
  suspended_at?: string;
  suspended_by?: string;
  suspension_reason?: string;
  age?: number;
  address?: string;
  cnic_passport?: string;
  profile_image_url?: string;
  is_verified?: boolean;
  email_verified_at?: string;
  updated_at?: string;
  // Additional stats for venue owners
  total_venues?: number;
  approved_venues?: number;
  pending_venues?: number;
  total_bookings?: number;
  total_revenue?: number;
  // Additional stats for players
  completed_bookings?: number;
  cancelled_bookings?: number;
  total_spent?: number;
  forum_posts?: number;
  reviews_given?: number;
}

export default function AdminUsersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'players' | 'venue_owners' | 'suspended' | 'inactive'>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState<User | null>(null);
  const [showSuspensionModal, setShowSuspensionModal] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'user_type' | 'total_bookings' | 'total_revenue'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    age: '',
    city: '',
    user_type: 'player',
    address: '',
    cnic_passport: '',
  });
  const [disputeCount, setDisputeCount] = useState(0);

  const loadDisputeCount = async () => {
    try {
      const { count, error } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      if (error) throw error;
      setDisputeCount(count || 0);
    } catch (error) {
      console.error('Error loading dispute count:', error);
    }
  };

  useEffect(() => {
    if (user?.user_type === 'admin') {
      loadUsers();
      loadDisputeCount();
    }
  }, [user, activeFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Base user query
      let query = supabase
        .from('users')
        .select(`
          id, name, email, user_type, phone_number, city, is_active, created_at,
          suspended_at, suspended_by, suspension_reason, age, address, cnic_passport,
          profile_image_url, is_verified, email_verified_at, updated_at
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply filters
      if (activeFilter === 'players') {
        query = query.eq('user_type', 'player');
      } else if (activeFilter === 'venue_owners') {
        query = query.eq('user_type', 'venue_owner');
      } else if (activeFilter === 'suspended') {
        query = query.not('suspended_at', 'is', null);
      } else if (activeFilter === 'inactive') {
        query = query.eq('is_active', false);
      }

      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }

      const { data: userData, error: userError } = await query;

      if (userError) {
        console.error('Error loading users:', userError);
        throw userError;
      }

      // Get additional statistics for each user
      const userIds = userData?.map(u => u.id) || [];

      // Get venue statistics for venue owners
      const { data: venueStats } = await supabase
        .from('venues')
        .select('owner_id, approval_status')
        .in('owner_id', userIds);

      // Get booking statistics
      const { data: bookingStats } = await supabase
        .from('bookings')
        .select('player_id, status, total_amount, venue_id, venues!inner(owner_id)')
        .in('player_id', userIds.concat(userIds)); // Include both player and venue owner bookings

      // Get forum post statistics
      const { data: forumStats } = await supabase
        .from('forum_posts')
        .select('player_id')
        .in('player_id', userIds);

      // Get review statistics
      const { data: reviewStats } = await supabase
        .from('reviews')
        .select('player_id')
        .in('player_id', userIds);

      // Process users with statistics
      const enrichedUsers = userData?.map(user => {
        const userVenues = venueStats?.filter(v => v.owner_id === user.id) || [];
        const userBookings = bookingStats?.filter(b => b.player_id === user.id) || [];
        const venueBookings = bookingStats?.filter(b => b.venues?.owner_id === user.id) || [];
        const userForumPosts = forumStats?.filter(f => f.player_id === user.id) || [];
        const userReviews = reviewStats?.filter(r => r.player_id === user.id) || [];

        return {
          ...user,
          // Venue owner stats
          total_venues: userVenues.length,
          approved_venues: userVenues.filter(v => v.approval_status === 'approved').length,
          pending_venues: userVenues.filter(v => v.approval_status === 'pending').length,
          total_bookings: user.user_type === 'venue_owner' ? venueBookings.length : userBookings.length,
          total_revenue: user.user_type === 'venue_owner'
            ? venueBookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0)
            : 0,
          // Player stats
          completed_bookings: userBookings.filter(b => b.status === 'completed').length,
          cancelled_bookings: userBookings.filter(b => b.status === 'cancelled').length,
          total_spent: userBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0),
          forum_posts: userForumPosts.length,
          reviews_given: userReviews.length,
        };
      }) || [];

      setUsers(enrichedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete' | 'suspend') => {
    if (selectedUsers.size === 0) {
      Alert.alert('Error', 'Please select users first');
      return;
    }

    const actionText = action === 'activate' ? 'activate' :
                      action === 'deactivate' ? 'deactivate' :
                      action === 'delete' ? 'delete' : 'suspend';

    Alert.alert(
      `Confirm Bulk ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
      `Are you sure you want to ${actionText} ${selectedUsers.size} user(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
          style: action === 'delete' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const userIds = Array.from(selectedUsers);

              if (action === 'delete') {
                const { error } = await supabase
                  .from('users')
                  .delete()
                  .in('id', userIds);

                if (error) throw error;
              } else if (action === 'suspend') {
                const { error } = await supabase
                  .from('users')
                  .update({
                    suspended_at: new Date().toISOString(),
                    suspended_by: user?.id,
                    suspension_reason: 'Bulk suspension by admin'
                  })
                  .in('id', userIds);

                if (error) throw error;
              } else {
                const isActive = action === 'activate';
                const { error } = await supabase
                  .from('users')
                  .update({ is_active: isActive })
                  .in('id', userIds);

                if (error) throw error;
              }

              Alert.alert('Success', `${selectedUsers.size} user(s) ${actionText}d successfully`);
              setSelectedUsers(new Set());
              setBulkActionMode(false);
              loadUsers();
            } catch (error) {
              console.error(`Error ${actionText}ing users:`, error);
              Alert.alert('Error', `Failed to ${actionText} users`);
            }
          }
        },
      ]
    );
  };

  const handleSuspendUser = async () => {
    if (!showSuspensionModal || !suspensionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for suspension');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          suspended_at: new Date().toISOString(),
          suspended_by: user?.id,
          suspension_reason: suspensionReason.trim(),
          is_active: false
        })
        .eq('id', showSuspensionModal.id);

      if (error) throw error;

      Alert.alert('Success', 'User suspended successfully');
      setShowSuspensionModal(null);
      setSuspensionReason('');
      loadUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      Alert.alert('Error', 'Failed to suspend user');
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
          is_active: true
        })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('Success', 'User unsuspended successfully');
      loadUsers();
    } catch (error) {
      console.error('Error unsuspending user:', error);
      Alert.alert('Error', 'Failed to unsuspend user');
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createForm.email.trim(),
        password: createForm.password,
        options: {
          data: {
            name: createForm.name.trim(),
            user_type: createForm.user_type,
          }
        }
      });

      if (authError) throw authError;

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user?.id,
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          user_type: createForm.user_type,
          phone_number: createForm.phone_number.trim() || null,
          age: createForm.age ? parseInt(createForm.age) : null,
          city: createForm.city.trim() || null,
          address: createForm.address.trim() || null,
          cnic_passport: createForm.cnic_passport.trim() || null,
          is_active: true,
          is_verified: true, // Admin created users are auto-verified
          email_verified_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      Alert.alert('Success', 'User created successfully');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        phone_number: '',
        age: '',
        city: '',
        user_type: 'player',
        address: '',
        cnic_passport: '',
      });
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user');
    }
  };

  const handleEditUser = async () => {
    try {
      if (!editForm.name?.trim() || !editForm.email?.trim()) {
        Alert.alert('Error', 'Name and email are required');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone_number: editForm.phone_number?.trim() || null,
          age: editForm.age || null,
          city: editForm.city?.trim() || null,
          address: editForm.address?.trim() || null,
          cnic_passport: editForm.cnic_passport?.trim() || null,
          user_type: editForm.user_type,
          is_active: editForm.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', showEditModal?.id);

      if (error) throw error;

      Alert.alert('Success', 'User updated successfully');
      setShowEditModal(null);
      setEditForm({});
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to permanently delete ${userName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from users table (this will cascade to related tables)
              const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

              if (error) throw error;

              Alert.alert('Success', 'User deleted successfully');
              loadUsers();
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    Alert.alert(
      'Reset Password',
      `Send password reset email to ${userEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Email',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(userEmail);

              if (error) throw error;

              Alert.alert('Success', 'Password reset email sent successfully');
            } catch (error) {
              console.error('Error sending reset email:', error);
              Alert.alert('Error', 'Failed to send password reset email');
            }
          }
        }
      ]
    );
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      if (action === 'delete') {
        Alert.alert(
          'Confirm Delete',
          'Are you sure you want to delete this user? This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase
                  .from('users')
                  .delete()
                  .eq('id', userId);

                if (error) {
                  Alert.alert('Error', 'Failed to delete user');
                } else {
                  Alert.alert('Success', 'User deleted successfully');
                  loadUsers();
                }
              }
            },
          ]
        );
      } else {
        const isActive = action === 'activate';
        const { error } = await supabase
          .from('users')
          .update({ is_active: isActive })
          .eq('id', userId);

        if (error) {
          Alert.alert('Error', `Failed to ${action} user`);
        } else {
          Alert.alert('Success', `User ${action}d successfully`);
          loadUsers();
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      Alert.alert('Error', `Failed to ${action} user`);
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin': return '#F44336';
      case 'venue_owner': return '#FF9800';
      case 'player': return '#4CAF50';
      default: return '#666';
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'admin': return 'shield-checkmark';
      case 'venue_owner': return 'business';
      case 'player': return 'person';
      default: return 'help';
    }
  };

  if (user?.user_type !== 'admin') {
    return (
      <View style={styles.unauthorizedContainer}>
        <Ionicons name="lock-closed" size={64} color="#ccc" />
        <Text style={styles.unauthorizedText}>Access Denied</Text>
        <Text style={styles.unauthorizedSubtext}>You don't have permission to view this page</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#228B22" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.disputeButton}
            onPress={() => router.push('/(admin-tabs)/disputes')}
          >
            <Ionicons name="shield-outline" size={20} color="#fff" />
            {disputeCount > 0 && (
              <View style={styles.disputeBadge}>
                <Text style={styles.disputeBadgeText}>{disputeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={styles.createButton}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBulkActionMode(!bulkActionMode)}
            style={styles.bulkModeButton}
          >
            <Ionicons
              name={bulkActionMode ? "checkmark-circle" : "list"}
              size={24}
              color="#228B22"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
            {users.filter(u => u.user_type === 'player').length}
          </Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#2196F3' }]}>
            {users.filter(u => u.user_type === 'venue_owner').length}
          </Text>
          <Text style={styles.statLabel}>Venue Owners</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F44336' }]}>
            {users.filter(u => u.suspended_at).length}
          </Text>
          <Text style={styles.statLabel}>Suspended</Text>
        </View>
      </View>

      {/* Bulk Actions Bar */}
      {bulkActionMode && (
        <View style={styles.bulkActionsBar}>
          <TouchableOpacity onPress={selectAllUsers} style={styles.selectAllButton}>
            <Ionicons
              name={selectedUsers.size === users.length ? "checkbox" : "square-outline"}
              size={20}
              color="#228B22"
            />
            <Text style={styles.selectAllText}>
              {selectedUsers.size === users.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          {selectedUsers.size > 0 && (
            <View style={styles.bulkActions}>
              <TouchableOpacity
                onPress={() => handleBulkAction('activate')}
                style={[styles.bulkActionButton, styles.activateButton]}
              >
                <Text style={styles.bulkActionText}>Activate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleBulkAction('deactivate')}
                style={[styles.bulkActionButton, styles.deactivateButton]}
              >
                <Text style={styles.bulkActionText}>Deactivate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleBulkAction('suspend')}
                style={[styles.bulkActionButton, styles.suspendButton]}
              >
                <Text style={styles.bulkActionText}>Suspend</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleBulkAction('delete')}
                style={[styles.bulkActionButton, styles.deleteButton]}
              >
                <Text style={styles.bulkActionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadUsers}
          />
        </View>

        <View style={styles.filtersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
            {[
              { key: 'all', label: 'All Users', icon: 'people', count: users.length },
              { key: 'players', label: 'Players', icon: 'person', count: users.filter(u => u.user_type === 'player').length },
              { key: 'venue_owners', label: 'Venue Owners', icon: 'business', count: users.filter(u => u.user_type === 'venue_owner').length },
              { key: 'suspended', label: 'Suspended', icon: 'ban', count: users.filter(u => u.suspended_at).length },
              { key: 'inactive', label: 'Inactive', icon: 'pause-circle', count: users.filter(u => !u.is_active).length },
            ].map((filter) => (
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
                  {filter.label} ({filter.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
              setSortOrder(newOrder);
              loadUsers();
            }}
          >
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={16}
              color="#228B22"
            />
          </TouchableOpacity>
        </View>

        {/* Sort Options */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortContainer}>
          {[
            { key: 'created_at', label: 'Date Created' },
            { key: 'name', label: 'Name' },
            { key: 'user_type', label: 'User Type' },
            { key: 'total_bookings', label: 'Bookings' },
            { key: 'total_revenue', label: 'Revenue' },
          ].map((sort) => (
            <TouchableOpacity
              key={sort.key}
              style={[
                styles.sortOptionButton,
                sortBy === sort.key && styles.activeSortButton
              ]}
              onPress={() => {
                setSortBy(sort.key as any);
                loadUsers();
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === sort.key && styles.activeSortText
              ]}>
                {sort.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Users List */}
      <ScrollView 
        style={styles.usersContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#228B22" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No users match the selected filter'}
            </Text>
          </View>
        ) : (
          users.map((userData) => (
            <TouchableOpacity
              key={userData.id}
              style={[
                styles.userCard,
                selectedUsers.has(userData.id) && styles.selectedUserCard
              ]}
              onPress={() => bulkActionMode ? toggleUserSelection(userData.id) : setShowUserDetails(userData)}
            >
              <View style={styles.userHeader}>
                {bulkActionMode && (
                  <TouchableOpacity
                    onPress={() => toggleUserSelection(userData.id)}
                    style={styles.checkboxContainer}
                  >
                    <Ionicons
                      name={selectedUsers.has(userData.id) ? "checkbox" : "square-outline"}
                      size={24}
                      color="#228B22"
                    />
                  </TouchableOpacity>
                )}

                <View style={styles.userInfo}>
                  <View style={[styles.userTypeIcon, { backgroundColor: getUserTypeColor(userData.user_type) }]}>
                    <Ionicons
                      name={getUserTypeIcon(userData.user_type) as any}
                      size={20}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{userData.name}</Text>
                    <Text style={styles.userEmail}>{userData.email}</Text>
                    {userData.phone_number && (
                      <Text style={styles.userPhone}>{userData.phone_number}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.statusContainer}>
                  {userData.suspended_at && (
                    <View style={[styles.statusBadge, { backgroundColor: '#FF5722' }]}>
                      <Text style={styles.statusText}>Suspended</Text>
                    </View>
                  )}
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: userData.is_active ? '#4CAF50' : '#F44336' }
                  ]}>
                    <Text style={styles.statusText}>
                      {userData.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.userMeta}>
                <Text style={styles.userType}>
                  {userData.user_type.replace('_', ' ').toUpperCase()}
                </Text>
                {userData.city && (
                  <Text style={styles.userCity}>{userData.city}</Text>
                )}
                <Text style={styles.userDate}>
                  Joined {new Date(userData.created_at).toLocaleDateString()}
                </Text>
              </View>

              {/* User Statistics */}
              <View style={styles.userStatsContainer}>
                {userData.user_type === 'venue_owner' ? (
                  <View style={styles.userStatsGrid}>
                    <View style={styles.userStatItem}>
                      <Ionicons name="business-outline" size={16} color="#2196F3" />
                      <Text style={styles.userStatText}>{userData.total_venues || 0} Venues</Text>
                    </View>
                    <View style={styles.userStatItem}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                      <Text style={styles.userStatText}>{userData.approved_venues || 0} Approved</Text>
                    </View>
                    <View style={styles.userStatItem}>
                      <Ionicons name="calendar-outline" size={16} color="#FF9800" />
                      <Text style={styles.userStatText}>{userData.total_bookings || 0} Bookings</Text>
                    </View>
                    <View style={styles.userStatItem}>
                      <Ionicons name="cash-outline" size={16} color="#4CAF50" />
                      <Text style={styles.userStatText}>Rs. {userData.total_revenue?.toFixed(0) || 0}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.userStatsGrid}>
                    <View style={styles.userStatItem}>
                      <Ionicons name="calendar-outline" size={16} color="#2196F3" />
                      <Text style={styles.userStatText}>{userData.completed_bookings || 0} Completed</Text>
                    </View>
                    <View style={styles.userStatItem}>
                      <Ionicons name="close-circle-outline" size={16} color="#F44336" />
                      <Text style={styles.userStatText}>{userData.cancelled_bookings || 0} Cancelled</Text>
                    </View>
                    <View style={styles.userStatItem}>
                      <Ionicons name="cash-outline" size={16} color="#4CAF50" />
                      <Text style={styles.userStatText}>Rs. {userData.total_spent?.toFixed(0) || 0}</Text>
                    </View>
                    <View style={styles.userStatItem}>
                      <Ionicons name="chatbubbles-outline" size={16} color="#9C27B0" />
                      <Text style={styles.userStatText}>{userData.forum_posts || 0} Posts</Text>
                    </View>
                  </View>
                )}
              </View>

              {!bulkActionMode && (
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => {
                      setEditForm(userData);
                      setShowEditModal(userData);
                    }}
                  >
                    <Ionicons name="create-outline" size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>

                  {userData.suspended_at ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.unsuspendButton]}
                      onPress={() => handleUnsuspendUser(userData.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Unsuspend</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.suspendButton]}
                      onPress={() => setShowSuspensionModal(userData)}
                    >
                      <Ionicons name="ban-outline" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Suspend</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.resetButton]}
                    onPress={() => handleResetPassword(userData.id, userData.email)}
                  >
                    <Ionicons name="key-outline" size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>Reset</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteUser(userData.id, userData.name)}
                  >
                    <Ionicons name="trash-outline" size={14} color="#fff" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* User Details Modal */}
      <Modal
        visible={showUserDetails !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {showUserDetails && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setShowUserDetails(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{showUserDetails.name}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{showUserDetails.email}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>User Type</Text>
                <Text style={styles.detailValue}>{showUserDetails.user_type.replace('_', ' ').toUpperCase()}</Text>
              </View>

              {showUserDetails.phone_number && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Phone Number</Text>
                  <Text style={styles.detailValue}>{showUserDetails.phone_number}</Text>
                </View>
              )}

              {showUserDetails.age && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Age</Text>
                  <Text style={styles.detailValue}>{showUserDetails.age}</Text>
                </View>
              )}

              {showUserDetails.city && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>City</Text>
                  <Text style={styles.detailValue}>{showUserDetails.city}</Text>
                </View>
              )}

              {showUserDetails.address && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{showUserDetails.address}</Text>
                </View>
              )}

              {showUserDetails.cnic_passport && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>CNIC/Passport</Text>
                  <Text style={styles.detailValue}>{showUserDetails.cnic_passport}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[
                  styles.detailValue,
                  { color: showUserDetails.is_active ? '#4CAF50' : '#F44336' }
                ]}>
                  {showUserDetails.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>

              {showUserDetails.suspended_at && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Suspended At</Text>
                    <Text style={[styles.detailValue, { color: '#F44336' }]}>
                      {new Date(showUserDetails.suspended_at).toLocaleString()}
                    </Text>
                  </View>

                  {showUserDetails.suspension_reason && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Suspension Reason</Text>
                      <Text style={styles.detailValue}>{showUserDetails.suspension_reason}</Text>
                    </View>
                  )}
                </>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Joined</Text>
                <Text style={styles.detailValue}>
                  {new Date(showUserDetails.created_at).toLocaleString()}
                </Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Suspension Modal */}
      <Modal
        visible={showSuspensionModal !== null}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.suspensionModalOverlay}>
          <View style={styles.suspensionModalContainer}>
            <Text style={styles.suspensionModalTitle}>Suspend User</Text>
            <Text style={styles.suspensionModalSubtitle}>
              {showSuspensionModal?.name}
            </Text>

            <TextInput
              style={styles.suspensionReasonInput}
              placeholder="Enter reason for suspension..."
              value={suspensionReason}
              onChangeText={setSuspensionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.suspensionModalActions}>
              <TouchableOpacity
                style={styles.suspensionCancelButton}
                onPress={() => {
                  setShowSuspensionModal(null);
                  setSuspensionReason('');
                }}
              >
                <Text style={styles.suspensionCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.suspensionConfirmButton}
                onPress={handleSuspendUser}
              >
                <Text style={styles.suspensionConfirmText}>Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create User Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New User</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Basic Information</Text>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter full name"
                  value={createForm.name}
                  onChangeText={(text) => setCreateForm({...createForm, name: text})}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter email address"
                  value={createForm.email}
                  onChangeText={(text) => setCreateForm({...createForm, email: text})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Password *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter password"
                  value={createForm.password}
                  onChangeText={(text) => setCreateForm({...createForm, password: text})}
                  secureTextEntry
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>User Type *</Text>
                <View style={styles.userTypeContainer}>
                  {['player', 'venue_owner'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.userTypeButton,
                        createForm.user_type === type && styles.activeUserTypeButton
                      ]}
                      onPress={() => setCreateForm({...createForm, user_type: type})}
                    >
                      <Text style={[
                        styles.userTypeText,
                        createForm.user_type === type && styles.activeUserTypeText
                      ]}>
                        {type === 'venue_owner' ? 'Venue Owner' : 'Player'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Additional Information</Text>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter phone number"
                  value={createForm.phone_number}
                  onChangeText={(text) => setCreateForm({...createForm, phone_number: text})}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Age</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter age"
                  value={createForm.age}
                  onChangeText={(text) => setCreateForm({...createForm, age: text})}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>City</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter city"
                  value={createForm.city}
                  onChangeText={(text) => setCreateForm({...createForm, city: text})}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Address</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter address"
                  value={createForm.address}
                  onChangeText={(text) => setCreateForm({...createForm, address: text})}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>CNIC/Passport</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter CNIC or Passport number"
                  value={createForm.cnic_passport}
                  onChangeText={(text) => setCreateForm({...createForm, cnic_passport: text})}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.createUserButton} onPress={handleCreateUser}>
              <Text style={styles.createUserButtonText}>Create User</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {showEditModal && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setShowEditModal(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Basic Information</Text>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter full name"
                    value={editForm.name || ''}
                    onChangeText={(text) => setEditForm({...editForm, name: text})}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Email *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter email address"
                    value={editForm.email || ''}
                    onChangeText={(text) => setEditForm({...editForm, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>User Type</Text>
                  <View style={styles.userTypeContainer}>
                    {['player', 'venue_owner'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.userTypeButton,
                          editForm.user_type === type && styles.activeUserTypeButton
                        ]}
                        onPress={() => setEditForm({...editForm, user_type: type})}
                      >
                        <Text style={[
                          styles.userTypeText,
                          editForm.user_type === type && styles.activeUserTypeText
                        ]}>
                          {type === 'venue_owner' ? 'Venue Owner' : 'Player'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Status</Text>
                  <View style={styles.statusContainer}>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        editForm.is_active && styles.activeStatusButton
                      ]}
                      onPress={() => setEditForm({...editForm, is_active: true})}
                    >
                      <Text style={[
                        styles.formStatusText,
                        editForm.is_active && styles.activeStatusText
                      ]}>
                        Active
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        !editForm.is_active && styles.inactiveStatusButton
                      ]}
                      onPress={() => setEditForm({...editForm, is_active: false})}
                    >
                      <Text style={[
                        styles.formStatusText,
                        !editForm.is_active && styles.inactiveStatusText
                      ]}>
                        Inactive
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Additional Information</Text>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter phone number"
                    value={editForm.phone_number || ''}
                    onChangeText={(text) => setEditForm({...editForm, phone_number: text})}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Age</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter age"
                    value={editForm.age?.toString() || ''}
                    onChangeText={(text) => setEditForm({...editForm, age: parseInt(text) || undefined})}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>City</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter city"
                    value={editForm.city || ''}
                    onChangeText={(text) => setEditForm({...editForm, city: text})}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Address</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter address"
                    value={editForm.address || ''}
                    onChangeText={(text) => setEditForm({...editForm, address: text})}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>CNIC/Passport</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter CNIC or Passport number"
                    value={editForm.cnic_passport || ''}
                    onChangeText={(text) => setEditForm({...editForm, cnic_passport: text})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveUserButton} onPress={handleEditUser}>
                <Text style={styles.saveUserButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  unauthorizedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  unauthorizedSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#90EE90',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f0f0f',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  disputeButton: {
    backgroundColor: '#F44336',
    borderRadius: 20,
    padding: 8,
    position: 'relative',
  },
  disputeBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disputeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F44336',
  },
  createButton: {
    backgroundColor: '#228B22',
    borderRadius: 20,
    padding: 8,
  },
  bulkModeButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
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
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  bulkActionsBar: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -10,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectAllText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#228B22',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  bulkActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filtersContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  sortButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#228B22',
  },
  sortContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  sortOptionButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeSortButton: {
    backgroundColor: '#228B22',
    borderColor: '#228B22',
  },
  sortOptionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  activeSortText: {
    color: '#fff',
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
  usersContainer: {
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
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedUserCard: {
    borderWidth: 2,
    borderColor: '#228B22',
    backgroundColor: '#f8fff8',
  },
  checkboxContainer: {
    marginRight: 10,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  userMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  userType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#228B22',
  },
  userCity: {
    fontSize: 12,
    color: '#666',
  },
  userDate: {
    fontSize: 12,
    color: '#999',
  },
  userActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activateButton: {
    backgroundColor: '#4CAF50',
  },
  deactivateButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  suspendButton: {
    backgroundColor: '#FF5722',
  },
  unsuspendButton: {
    backgroundColor: '#4CAF50',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  resetButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userStatsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  userStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: '45%',
  },
  userStatText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#90EE90',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  // Suspension modal styles
  suspensionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suspensionModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  suspensionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  suspensionModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  suspensionReasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
  },
  suspensionModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  suspensionCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  suspensionCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  suspensionConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF5722',
    alignItems: 'center',
  },
  suspensionConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  // Form styles
  formSection: {
    marginBottom: 25,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  formField: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  activeUserTypeButton: {
    backgroundColor: '#228B22',
    borderColor: '#228B22',
  },
  userTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeUserTypeText: {
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  activeStatusButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  inactiveStatusButton: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  formStatusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#fff',
  },
  inactiveStatusText: {
    color: '#fff',
  },
  createUserButton: {
    backgroundColor: '#228B22',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  createUserButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveUserButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveUserButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
