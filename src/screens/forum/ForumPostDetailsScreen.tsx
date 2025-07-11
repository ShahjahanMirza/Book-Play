// Forum post details screen for viewing and managing offers
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ForumService, ForumPost, ForumOffer } from '../../services/forumService';
import { useCustomModal } from '../../hooks/useCustomModal';
import { appEvents, EVENT_TYPES } from '../../utils/eventEmitter';

export default function ForumPostDetailsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const { showSuccessModal, showErrorModal, showConfirmModal, ModalComponent } = useCustomModal();
  
  const [post, setPost] = useState<ForumPost | null>(null);
  const [offers, setOffers] = useState<ForumOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);

  useEffect(() => {
    if (postId) {
      loadPostDetails();
      loadOffers();
    }
  }, [postId]);

  // Listen for offer events to refresh data
  useEffect(() => {
    const handleOfferAccepted = (data: any) => {
      if (data.postId === postId) {
        loadPostDetails();
        loadOffers();
      }
    };

    const handleOfferRejected = (data: any) => {
      if (data.postId === postId) {
        loadOffers();
      }
    };

    appEvents.on(EVENT_TYPES.OFFER_ACCEPTED, handleOfferAccepted);
    appEvents.on(EVENT_TYPES.OFFER_REJECTED, handleOfferRejected);

    return () => {
      appEvents.off(EVENT_TYPES.OFFER_ACCEPTED, handleOfferAccepted);
      appEvents.off(EVENT_TYPES.OFFER_REJECTED, handleOfferRejected);
    };
  }, [postId]);

  const loadPostDetails = async () => {
    try {
      const foundPost = await ForumService.getForumPostById(postId as string);

      if (foundPost) {
        setPost(foundPost);
      } else {
        showErrorModal(
          'Post Not Found',
          'This forum post has been deleted or is no longer available.',
          () => router.back()
        );
      }
    } catch (error) {
      console.error('Error loading post details:', error);
      showErrorModal(
        'Error',
        'Failed to load post details',
        () => router.back()
      );
    }
  };

  const loadOffers = async () => {
    try {
      setLoading(true);
      const postOffers = await ForumService.getPostOffers(postId as string, user?.id);
      setOffers(postOffers);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!user || !postId || !offerMessage.trim()) return;

    try {
      setSubmittingOffer(true);
      await ForumService.createOffer(user.id, postId as string, offerMessage.trim());
      
      setOfferMessage('');
      setShowOfferForm(false);
      await loadOffers();
      await loadPostDetails(); // Refresh post to update offer count
      
      Alert.alert('Success', 'Your offer has been sent to the post owner!');
    } catch (error: any) {
      console.error('Error creating offer:', error);
      Alert.alert('Error', error.message || 'Failed to send offer');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accepted' | 'rejected') => {
    if (!user) return;

    try {
      await ForumService.updateOfferStatus(user.id, offerId, action);
      await loadOffers();
      await loadPostDetails();
      
      Alert.alert(
        'Success',
        `Offer ${action === 'accepted' ? 'accepted' : 'rejected'} successfully!`
      );
    } catch (error: any) {
      console.error('Error updating offer:', error);
      Alert.alert('Error', error.message || `Failed to ${action} offer`);
    }
  };

  const handleContactPlayer = (phoneNumber: string) => {
    Alert.alert(
      'Contact Player',
      `Call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${phoneNumber}`)
        },
      ]
    );
  };

  const handleMessagePlayer = (playerId: string, playerName: string) => {
    // Navigate to chat screen with the player
    router.push(`/chat?partnerId=${playerId}&partnerName=${encodeURIComponent(playerName)}`);
  };

  const handleDeletePost = async () => {
    if (!user || !post) return;

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
              Alert.alert(
                'Success',
                'Forum post deleted successfully',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error: any) {
              console.error('Error deleting forum post:', error);
              Alert.alert('Error', error.message || 'Failed to delete forum post');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOfferStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#FF9800';
    }
  };

  const getOfferStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      default: return 'Pending';
    }
  };

  if (loading || !post) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#228B22" />
        <Text style={styles.loadingText}>Loading post details...</Text>
      </View>
    );
  }

  const isPostOwner = user?.id === post.player_id;
  const hasUserOffered = offers.some(offer => offer.player_id === user?.id);
  const canMakeOffer = !isPostOwner && !hasUserOffered && post.status === 'active';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#228B22" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forum Post</Text>
        {post && user && post.player_id === user.id ? (
          <TouchableOpacity onPress={handleDeletePost} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={24} color="#dc3545" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Post Details */}
        <View style={styles.postCard}>
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
                  <Ionicons name="person" size={24} color="#666" />
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
            
            <View style={[styles.statusBadge, { backgroundColor: post.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
              <Text style={styles.statusText}>
                {post.status === 'active' ? 'Active' : post.status === 'closed' ? 'Closed' : 'Expired'}
              </Text>
            </View>
          </View>

          {/* Post Content */}
          {post.note && (
            <View style={styles.noteSection}>
              <Text style={styles.sectionTitle}>Note</Text>
              <Text style={styles.postNote}>{post.note}</Text>
            </View>
          )}

          {/* Venue Info */}
          <View style={styles.venueSection}>
            <Text style={styles.sectionTitle}>Venue Details</Text>
            <View style={styles.venueInfo}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.venueName}>{post.venue_name}</Text>
            </View>
            <Text style={styles.venueLocation}>{post.venue_location}</Text>
          </View>

          {/* Game Details */}
          <View style={styles.gameSection}>
            <Text style={styles.sectionTitle}>Game Details</Text>
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
          </View>

          {/* Game Status */}
          <View style={styles.statusSection}>
            <View style={styles.statusInfo}>
              <Ionicons name="information-circle" size={20} color="#666" />
              <Text style={styles.statusText}>
                Looking for players to join this game
              </Text>
            </View>
          </View>
        </View>

        {/* Offer Form */}
        {canMakeOffer && (
          <View style={styles.offerSection}>
            {!showOfferForm ? (
              <TouchableOpacity 
                style={styles.makeOfferButton}
                onPress={() => setShowOfferForm(true)}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.makeOfferButtonText}>Make an Offer</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.offerForm}>
                <Text style={styles.offerFormTitle}>Send Your Offer</Text>
                <TextInput
                  style={styles.offerInput}
                  placeholder="Introduce yourself and why you'd like to join..."
                  value={offerMessage}
                  onChangeText={setOfferMessage}
                  multiline
                  numberOfLines={4}
                  maxLength={300}
                />
                <View style={styles.offerActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowOfferForm(false);
                      setOfferMessage('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.sendOfferButton, submittingOffer && styles.sendOfferButtonDisabled]}
                    onPress={handleCreateOffer}
                    disabled={submittingOffer || !offerMessage.trim()}
                  >
                    {submittingOffer ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.sendOfferButtonText}>Send Offer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Offers List */}
        <View style={styles.offersSection}>
          <Text style={styles.sectionTitle}>
            Offers ({offers.length})
          </Text>
          
          {offers.length === 0 ? (
            <View style={styles.noOffersContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text style={styles.noOffersText}>No offers yet</Text>
              <Text style={styles.noOffersSubtext}>
                {isPostOwner ? 'Players will see your post and can make offers to join' : 'Be the first to make an offer!'}
              </Text>
            </View>
          ) : (
            offers.map((offer) => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <View style={styles.offerPlayerInfo}>
                    {offer.player.profile_image_url ? (
                      <Image 
                        source={{ uri: offer.player.profile_image_url }} 
                        style={styles.offerPlayerAvatar}
                      />
                    ) : (
                      <View style={styles.offerDefaultAvatar}>
                        <Ionicons name="person" size={16} color="#666" />
                      </View>
                    )}
                    <View style={styles.offerPlayerDetails}>
                      <Text style={styles.offerPlayerName}>{offer.player.name}</Text>
                      <Text style={styles.offerTime}>
                        {new Date(offer.created_at).toLocaleDateString([], { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.offerStatusBadge, { backgroundColor: getOfferStatusColor(offer.status) }]}>
                    <Text style={styles.offerStatusText}>{getOfferStatusText(offer.status)}</Text>
                  </View>
                </View>

                <Text style={styles.offerMessage}>{offer.message}</Text>

                {isPostOwner && offer.status === 'pending' && (
                  <View style={styles.offerActions}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleOfferAction(offer.id, 'rejected')}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={() => handleMessagePlayer(offer.player.id, offer.player.name)}
                    >
                      <Ionicons name="chatbubble" size={20} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleOfferAction(offer.id, 'accepted')}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {offer.status === 'accepted' && (
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => handleMessagePlayer(offer.player.id, offer.player.name)}
                  >
                    <Ionicons name="chatbubble" size={16} color="#228B22" />
                    <Text style={styles.contactButtonText}>Message Player</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <ModalComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  deleteButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 15,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  postDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  noteSection: {
    marginBottom: 20,
  },
  postNote: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#228B22',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  venueSection: {
    marginBottom: 20,
  },
  venueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  venueLocation: {
    fontSize: 14,
    color: '#666',
    marginLeft: 24,
  },
  gameSection: {
    marginBottom: 20,
  },
  gameDetails: {
    gap: 8,
  },
  gameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  offerSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  makeOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#228B22',
    paddingVertical: 15,
    borderRadius: 8,
  },
  makeOfferButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  offerForm: {
    gap: 15,
  },
  offerFormTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  offerInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  sendOfferButton: {
    flex: 1,
    backgroundColor: '#228B22',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendOfferButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendOfferButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offersSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noOffersContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noOffersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  noOffersSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
  offerCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  offerPlayerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 10,
  },
  offerDefaultAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  offerPlayerDetails: {
    flex: 1,
  },
  offerPlayerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  offerTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  offerStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  offerStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  offerMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    marginBottom: 10,
  },
  rejectButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F44336',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageButton: {
    width: 40,
    height: 40,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    borderRadius: 6,
  },
  contactButtonText: {
    color: '#228B22',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
});
