"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, onValue, push, set, update, remove } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import Sidebar from '../components/Sidebar';
import { 
  Users,
  Plus,
  Search,
  Shield,
  Loader2,
  Lock,
  Globe,
  AlertCircle,
  X,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Settings,
  Image as ImageIcon,
  Send,
  Heart,
  MessageCircle,
  UserPlus,
  UserMinus,
  Crown
} from 'lucide-react';
import { uploadMultipleToCloudinary, validateImage } from '../lib/cloudinary';

export default function GroupsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [groupRequests, setGroupRequests] = useState([]);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    privacy: 'public',
    category: 'general'
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Group view states
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupPosts, setGroupPosts] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [userMembership, setUserMembership] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Post creation states
  const [postText, setPostText] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [postingError, setPostingError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      try {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          setUserData(snapshot.val());
          setUser(currentUser);
        } else {
          await auth.signOut();
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Load groups
  useEffect(() => {
    const groupsRef = ref(database, 'groups');
    const unsubscribe = onValue(groupsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const groupsData = snapshot.val();
        const groupsArray = await Promise.all(
          Object.entries(groupsData).map(async ([id, group]) => {
            const membersRef = ref(database, `groupMembers/${id}`);
            const membersSnapshot = await get(membersRef);
            const memberCount = membersSnapshot.exists() 
              ? Object.keys(membersSnapshot.val()).length 
              : 0;

            return {
              id,
              ...group,
              memberCount
            };
          })
        );
        
        setGroups(groupsArray);
      } else {
        setGroups([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load group requests
  useEffect(() => {
    if (!user) return;

    const requestsRef = ref(database, 'groupRequests');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const requestsData = snapshot.val();
        const requestsArray = Object.entries(requestsData)
          .map(([id, req]) => ({ id, ...req }))
          .filter(req => req.requesterId === user.uid);
        
        setGroupRequests(requestsArray);
      } else {
        setGroupRequests([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Load selected group data
  useEffect(() => {
    if (!selectedGroup || !user) return;

    // Load group posts
    const postsRef = ref(database, `groupPosts/${selectedGroup.id}`);
    const unsubscribePosts = onValue(postsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const postsData = snapshot.val();
        const postsArray = Object.entries(postsData).map(([id, post]) => ({
          id,
          ...post
        }));
        postsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setGroupPosts(postsArray);
      } else {
        setGroupPosts([]);
      }
    });

    // Load group members
    const membersRef = ref(database, `groupMembers/${selectedGroup.id}`);
    const unsubscribeMembers = onValue(membersRef, (snapshot) => {
      if (snapshot.exists()) {
        const membersData = snapshot.val();
        const membersArray = Object.entries(membersData).map(([userId, member]) => ({
          userId,
          ...member
        }));
        setGroupMembers(membersArray);
        
        // Check user's membership
        const userMember = membersArray.find(m => m.userId === user.uid);
        setUserMembership(userMember || null);
      } else {
        setGroupMembers([]);
        setUserMembership(null);
      }
    });

    return () => {
      unsubscribePosts();
      unsubscribeMembers();
    };
  }, [selectedGroup, user]);

  const canCreateGroup = () => {
    return userData?.verified === true;
  };

  const canPostInGroup = () => {
    if (!selectedGroup || !userMembership) return false;
    
    // If posting is restricted to admins only
    if (selectedGroup.postingRestricted === true) {
      return userMembership.role === 'admin' || userMembership.role === 'owner';
    }
    
    // Otherwise, all members can post
    return true;
  };

  const isGroupAdmin = () => {
    if (!userMembership) return false;
    return userMembership.role === 'admin' || userMembership.role === 'owner';
  };

  const isGroupOwner = () => {
    if (!userMembership) return false;
    return userMembership.role === 'owner';
  };

  const handleCreateGroup = () => {
    if (!canCreateGroup()) {
      setShowAccessDenied(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!createForm.name.trim() || !createForm.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const requestsRef = ref(database, 'groupRequests');
      const newRequestRef = push(requestsRef);

      await set(newRequestRef, {
        requesterId: user.uid,
        requesterName: userData.name,
        requesterEmail: userData.email,
        groupName: createForm.name.trim(),
        description: createForm.description.trim(),
        privacy: createForm.privacy,
        category: createForm.category,
        status: 'pending',
        requestedAt: Date.now()
      });

      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        privacy: 'public',
        category: 'general'
      });

      alert('Group creation request submitted! Waiting for admin approval.');
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (group) => {
    try {
      const memberRef = ref(database, `groupMembers/${group.id}/${user.uid}`);
      await set(memberRef, {
        userId: user.uid,
        userName: userData.name,
        userEmail: userData.email,
        userImage: userData.profileImage || '',
        role: 'member',
        joinedAt: Date.now()
      });

      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, {
        inCommunity: true
      });

      // Open the group after joining
      setSelectedGroup(group);
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Failed to join group');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      const memberRef = ref(database, `groupMembers/${selectedGroup.id}/${user.uid}`);
      await remove(memberRef);
      
      setSelectedGroup(null);
      alert('You have left the group');
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group');
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (selectedImages.length + files.length > 5) {
      setPostingError('You can only upload up to 5 images per post');
      return;
    }

    const validFiles = [];
    const validPreviews = [];

    for (const file of files) {
      const validation = validateImage(file);
      if (!validation.valid) {
        setPostingError(validation.error);
        continue;
      }

      validFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        validPreviews.push(reader.result);
        if (validPreviews.length === validFiles.length) {
          setImagePreviews([...imagePreviews, ...validPreviews]);
        }
      };
      reader.readAsDataURL(file);
    }

    setSelectedImages([...selectedImages, ...validFiles]);
    e.target.value = '';
  };

  const removeImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!postText.trim() && selectedImages.length === 0) {
      setPostingError('Please write something or select an image');
      return;
    }

    if (!canPostInGroup()) {
      setPostingError('You do not have permission to post in this group');
      return;
    }

    setSubmitting(true);
    setPostingError('');

    try {
      let imageUrls = [];

      if (selectedImages.length > 0) {
        setUploadingImages(true);
        imageUrls = await uploadMultipleToCloudinary(selectedImages);
        setUploadingImages(false);
      }

      const postsRef = ref(database, `groupPosts/${selectedGroup.id}`);
      const newPostRef = push(postsRef);
      
      await set(newPostRef, {
        authorId: user.uid,
        authorName: userData.name,
        authorImage: userData.profileImage || '',
        text: postText.trim(),
        images: imageUrls,
        timestamp: Date.now(),
        likes: 0,
        likedBy: {},
        commentCount: 0
      });

      setPostText('');
      setSelectedImages([]);
      setImagePreviews([]);
    } catch (err) {
      console.error('Error creating post:', err);
      setPostingError('Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const handleLikePost = async (postId, currentLikes, likedBy) => {
    const hasLiked = likedBy && likedBy[user.uid];
    const postRef = ref(database, `groupPosts/${selectedGroup.id}/${postId}`);

    const newLikedBy = { ...likedBy };
    if (hasLiked) {
      delete newLikedBy[user.uid];
    } else {
      newLikedBy[user.uid] = true;
    }

    await update(postRef, {
      likes: hasLiked ? currentLikes - 1 : currentLikes + 1,
      likedBy: newLikedBy
    });
  };

  const handleMakeAdmin = async (memberId) => {
    if (!isGroupOwner()) return;

    try {
      const memberRef = ref(database, `groupMembers/${selectedGroup.id}/${memberId}`);
      await update(memberRef, {
        role: 'admin'
      });
      alert('Member promoted to admin!');
    } catch (error) {
      console.error('Error making admin:', error);
      alert('Failed to promote member');
    }
  };

  const handleRemoveAdmin = async (memberId) => {
    if (!isGroupOwner()) return;

    try {
      const memberRef = ref(database, `groupMembers/${selectedGroup.id}/${memberId}`);
      await update(memberRef, {
        role: 'member'
      });
      alert('Admin demoted to member');
    } catch (error) {
      console.error('Error removing admin:', error);
      alert('Failed to demote admin');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!isGroupAdmin()) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const memberRef = ref(database, `groupMembers/${selectedGroup.id}/${memberId}`);
      await remove(memberRef);
      alert('Member removed from group');
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleTogglePostingRestriction = async () => {
    if (!isGroupAdmin()) return;

    try {
      const groupRef = ref(database, `groups/${selectedGroup.id}`);
      await update(groupRef, {
        postingRestricted: !selectedGroup.postingRestricted
      });
      
      setSelectedGroup({
        ...selectedGroup,
        postingRestricted: !selectedGroup.postingRestricted
      });
    } catch (error) {
      console.error('Error updating posting restriction:', error);
      alert('Failed to update settings');
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'Just now';
  };

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'academics', label: 'Academics' },
    { value: 'sports', label: 'Sports' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'technical', label: 'Technical' },
    { value: 'placement', label: 'Placement' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Group View
  if (selectedGroup) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="flex">
          <Sidebar user={user} userData={userData} />

          <main className="flex-1 ml-64 min-h-screen">
            {/* Group Header */}
            <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 p-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="p-2 hover:bg-gray-900 rounded-lg transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{selectedGroup.name}</h2>
                      {selectedGroup.privacy === 'private' && (
                        <Lock className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{groupMembers.length} members</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isGroupAdmin() && (
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-2 hover:bg-gray-900 rounded-lg transition"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  )}
                  {!isGroupOwner() && userMembership && (
                    <button
                      onClick={handleLeaveGroup}
                      className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition"
                    >
                      Leave Group
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto p-6">
              {/* Settings Panel */}
              {showSettings && isGroupAdmin() && (
                <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Group Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">Restrict Posting</p>
                        <p className="text-sm text-gray-400">Only admins can post</p>
                      </div>
                      <button
                        onClick={handleTogglePostingRestriction}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          selectedGroup.postingRestricted ? 'bg-blue-500' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            selectedGroup.postingRestricted ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Members List */}
                    <div>
                      <h4 className="font-medium mb-3">Members ({groupMembers.length})</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {groupMembers.map((member) => (
                          <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              {member.userImage ? (
                                <img src={member.userImage} alt={member.userName} className="w-10 h-10 rounded-full" />
                              ) : (
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="font-bold">{member.userName?.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              <div>
                                <p className="font-medium flex items-center gap-2">
                                  {member.userName}
                                  {member.role === 'owner' && (
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                  )}
                                  {member.role === 'admin' && member.role !== 'owner' && (
                                    <Shield className="w-4 h-4 text-blue-500" />
                                  )}
                                </p>
                                <p className="text-xs text-gray-400">{member.userEmail}</p>
                              </div>
                            </div>
                            
                            {isGroupOwner() && member.userId !== user.uid && (
                              <div className="flex gap-2">
                                {member.role === 'member' && (
                                  <button
                                    onClick={() => handleMakeAdmin(member.userId)}
                                    className="px-3 py-1 text-sm bg-blue-500/20 text-blue-500 rounded hover:bg-blue-500/30 transition"
                                  >
                                    Make Admin
                                  </button>
                                )}
                                {member.role === 'admin' && (
                                  <button
                                    onClick={() => handleRemoveAdmin(member.userId)}
                                    className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition"
                                  >
                                    Remove Admin
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveMember(member.userId)}
                                  className="p-1 text-red-500 hover:bg-red-500/20 rounded transition"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Create Post */}
              {canPostInGroup() && (
                <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Share something with the group..."
                    className="w-full bg-transparent border-none focus:outline-none text-white resize-none placeholder-gray-500 mb-3"
                    rows="3"
                  />

                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-gray-900/80 hover:bg-gray-900 p-1 rounded-full transition opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {postingError && (
                    <div className="mb-3 bg-red-500/10 border border-red-500 text-red-500 px-3 py-2 rounded-lg text-sm">
                      {postingError}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                    <label className="cursor-pointer text-blue-400 hover:bg-blue-400/10 p-2 rounded-full transition">
                      <ImageIcon className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                        disabled={selectedImages.length >= 5}
                      />
                    </label>

                    <button
                      onClick={handleCreatePost}
                      disabled={submitting || uploadingImages || (!postText.trim() && selectedImages.length === 0)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-full font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {uploadingImages ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : submitting ? (
                        'Posting...'
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Post
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!canPostInGroup() && selectedGroup.postingRestricted && (
                <div className="mb-6 bg-amber-500/10 border border-amber-500/50 rounded-xl p-4 text-center">
                  <p className="text-amber-500">Only admins can post in this group</p>
                </div>
              )}

              {/* Posts Feed */}
              <div className="space-y-4">
                {groupPosts.length === 0 ? (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                    <p className="text-gray-400">No posts yet. Be the first to post!</p>
                  </div>
                ) : (
                  groupPosts.map((post) => {
                    const hasLiked = post.likedBy && post.likedBy[user.uid];
                    
                    return (
                      <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex gap-3">
                          {post.authorImage ? (
                            <img src={post.authorImage} alt={post.authorName} className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold">{post.authorName?.charAt(0).toUpperCase() || 'U'}</span>
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-white">{post.authorName}</span>
                              <span className="text-gray-500 text-sm">· {formatTimestamp(post.timestamp)}</span>
                            </div>

                            {post.text && (
                              <p className="text-white mb-3 whitespace-pre-wrap break-words">{post.text}</p>
                            )}

                            {post.images && post.images.length > 0 && (
                              <div className={`mb-3 grid gap-1 rounded-xl overflow-hidden ${
                                post.images.length === 1 ? 'grid-cols-1' :
                                post.images.length === 2 ? 'grid-cols-2' :
                                'grid-cols-3'
                              }`}>
                                {post.images.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`Post image ${idx + 1}`}
                                    className={`w-full object-cover ${
                                      post.images.length === 1 ? 'max-h-96' : 'h-48'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-6 text-gray-500">
                              <button
                                onClick={() => handleLikePost(post.id, post.likes, post.likedBy)}
                                className={`flex items-center gap-2 hover:text-red-500 transition group ${hasLiked ? 'text-red-500' : ''}`}
                              >
                                <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : 'group-hover:fill-current'}`} />
                                <span className="text-sm">{post.likes || 0}</span>
                              </button>

                              <button className="flex items-center gap-2 hover:text-blue-500 transition">
                                <MessageCircle className="w-5 h-5" />
                                <span className="text-sm">{post.commentCount || 0}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Groups List View
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex">
        <Sidebar user={user} userData={userData} />

        <main className="flex-1 ml-64 min-h-screen p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">College Groups</h1>
                <p className="text-gray-400">Join communities and connect with peers</p>
              </div>
              <button
                onClick={handleCreateGroup}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Create Group
              </button>
            </div>

            {/* Pending Requests */}
            {groupRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Your Group Requests</h2>
                <div className="space-y-3">
                  {groupRequests.map((request) => (
                    <div key={request.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1">{request.groupName}</h3>
                          <p className="text-gray-400 text-sm mb-2">{request.description}</p>
                          <div className="flex items-center gap-2">
                            {request.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-500 rounded">
                                <Clock className="w-3 h-3" />
                                Pending Approval
                              </span>
                            )}
                            {request.status === 'approved' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-500/20 text-green-500 rounded">
                                <CheckCircle className="w-3 h-3" />
                                Approved
                              </span>
                            )}
                            {request.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-500/20 text-red-500 rounded">
                                <XCircle className="w-3 h-3" />
                                Rejected
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              Requested {new Date(request.requestedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search groups..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.length === 0 ? (
                <div className="col-span-full bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No groups found</p>
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const isMember = groupMembers.some(m => m.userId === user.uid);
                  
                  return (
                    <div 
                      key={group.id} 
                      className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition cursor-pointer"
                      onClick={() => {
                        // Check if user is a member first
                        const checkMembership = async () => {
                          const membersRef = ref(database, `groupMembers/${group.id}`);
                          const snapshot = await get(membersRef);
                          if (snapshot.exists()) {
                            const members = snapshot.val();
                            if (members[user.uid]) {
                              setSelectedGroup(group);
                            } else {
                              // Not a member, show join option
                              if (confirm(`Join "${group.name}"?`)) {
                                handleJoinGroup(group);
                              }
                            }
                          } else {
                            // No members yet, can join
                            if (confirm(`Join "${group.name}"?`)) {
                              handleJoinGroup(group);
                            }
                          }
                        };
                        checkMembership();
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-2">
                          {group.privacy === 'private' ? (
                            <Lock className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Globe className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      <h3 className="font-bold text-lg mb-2 group-hover:text-blue-400 transition">
                        {group.name}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {group.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 bg-gray-800 rounded">
                          {categories.find(c => c.value === group.category)?.label || 'General'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Request New Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                <Shield className="w-4 h-4 inline mr-1" />
                Your request will be reviewed by an admin before the group is created.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Group Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Computer Science Club"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Describe your group..."
                  rows="3"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Privacy</label>
                <select
                  value={createForm.privacy}
                  onChange={(e) => setCreateForm({ ...createForm, privacy: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="public">Public - Anyone can join</option>
                  <option value="private">Private - Invite only</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Denied Modal */}
      {showAccessDenied && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-red-500 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">Verification Required</h2>
            </div>
            
            <p className="text-gray-300 mb-4">
              Only <span className="text-blue-400 font-semibold">verified users</span> can request to create groups.
            </p>
            
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-400">
                Your account is not yet verified. Please contact an administrator to get verified.
              </p>
            </div>

            <button
              onClick={() => setShowAccessDenied(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 py-3 px-4 rounded-lg font-medium transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}