"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, onValue, update, remove } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import Sidebar from '../components/Sidebar';
import { 
  Calendar,
  MapPin,
  Mail,
  Shield,
  Award,
  Briefcase,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Edit,
  Loader2,
  Camera,
  X
} from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileUserId = params?.userId;

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [showComments, setShowComments] = useState({});
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);

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

          // Determine which profile to load
          const targetUserId = profileUserId || currentUser.uid;
          setIsOwnProfile(targetUserId === currentUser.uid);

          // Load profile data
          const profileRef = ref(database, `users/${targetUserId}`);
          const profileSnapshot = await get(profileRef);
          
          if (profileSnapshot.exists()) {
            const profData = profileSnapshot.val();
            setProfileData(profData);
            setEditForm({
              name: profData.name || '',
              bio: profData.bio || '',
              location: profData.location || ''
            });
          }
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
  }, [router, profileUserId]);

  // Load user's posts
  useEffect(() => {
    if (!profileData) return;

    const targetUserId = profileUserId || user?.uid;
    const postsRef = ref(database, 'posts');
    
    const unsubscribe = onValue(postsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const postsData = snapshot.val();
        const userPosts = [];

        for (const [id, post] of Object.entries(postsData)) {
          if (post.authorId === targetUserId) {
            const commentsRef = ref(database, `comments/${id}`);
            const commentsSnapshot = await get(commentsRef);
            const comments = commentsSnapshot.exists() 
              ? Object.entries(commentsSnapshot.val()).map(([cId, c]) => ({ id: cId, ...c }))
              : [];

            userPosts.push({
              id,
              ...post,
              comments,
              likedBy: post.likedBy || {}
            });
          }
        }
        
        userPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setPosts(userPosts);
      } else {
        setPosts([]);
      }
    });

    return () => unsubscribe();
  }, [profileData, profileUserId, user]);

  const handleLike = async (postId, currentLikes, likedBy) => {
    const hasLiked = likedBy && likedBy[user.uid];
    const postRef = ref(database, `posts/${postId}`);

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

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      // Delete post
      const postRef = ref(database, `posts/${postId}`);
      await remove(postRef);

      // Delete comments
      const commentsRef = ref(database, `comments/${postId}`);
      await remove(commentsRef);

      alert('Post deleted successfully!');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      
      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, {
        profileImage: imageUrl
      });

      alert('Profile image updated!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, {
        name: editForm.name,
        bio: editForm.bio,
        location: editForm.location
      });

      setShowEditModal(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  const getBadgeInfo = (role, verified) => {
    if (!verified) return null;

    const badges = {
      'admin': { color: 'bg-lime-500', textColor: 'text-lime-500', icon: Shield, label: 'Admin' },
      'principal': { color: 'bg-red-500', textColor: 'text-red-500', icon: Award, label: 'Principal' },
      'office_staff': { color: 'bg-red-500', textColor: 'text-red-500', icon: Briefcase, label: 'Office Staff' },
      'community_member': { color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: Users, label: 'Community' }
    };

    return badges[role] || null;
  };

  const VerificationBadge = ({ role, verified }) => {
    const badge = getBadgeInfo(role, verified);
    if (!badge) return null;

    const Icon = badge.icon;

    return (
      <div className="relative group inline-block">
        <div className={`w-5 h-5 ${badge.color} rounded-full flex items-center justify-center cursor-pointer`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          {badge.label}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-800 rotate-45 -mt-1"></div>
        </div>
      </div>
    );
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

  const formatJoinDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-gray-400 mb-4">This profile doesn't exist</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex">
        <Sidebar user={user} userData={userData} />

        <main className="flex-1 ml-64 min-h-screen">
          <div className="max-w-4xl mx-auto">
            {/* Cover Image */}
            <div className="h-48 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

            {/* Profile Header */}
            <div className="px-6 pb-6">
              <div className="relative">
                {/* Profile Image */}
                <div className="absolute -top-16 left-0">
                  <div className="relative">
                    {profileData.profileImage ? (
                      <img 
                        src={profileData.profileImage} 
                        alt={profileData.name}
                        className="w-32 h-32 rounded-full border-4 border-gray-950"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center border-4 border-gray-950">
                        <span className="text-4xl font-bold">
                          {profileData.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    
                    {isOwnProfile && (
                      <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition border-4 border-gray-950">
                        {uploadingImage ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfileImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Edit Profile Button */}
                {isOwnProfile && (
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-700 rounded-full hover:bg-gray-900 transition"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  </div>
                )}

                {/* Profile Info */}
                <div className="mt-20">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl font-bold">{profileData.name}</h1>
                    <VerificationBadge role={profileData.role} verified={profileData.verified} />
                  </div>

                  {profileData.bio && (
                    <p className="text-gray-300 mb-4">{profileData.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-gray-400 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {profileData.email}
                    </div>
                    {profileData.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {profileData.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Joined {formatJoinDate(profileData.createdAt)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 mt-4">
                    <div>
                      <span className="font-bold text-white">{posts.length}</span>
                      <span className="text-gray-400 ml-1">Posts</span>
                    </div>
                    <div>
                      <span className="font-bold text-white">
                        {posts.reduce((acc, post) => acc + (post.likes || 0), 0)}
                      </span>
                      <span className="text-gray-400 ml-1">Likes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Posts Section */}
              <div className="mt-8 border-t border-gray-800 pt-6">
                <h2 className="text-xl font-bold mb-4">
                  {isOwnProfile ? 'Your Posts' : `${profileData.name}'s Posts`}
                </h2>

                <div className="space-y-4">
                  {posts.length === 0 ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                      <p className="text-gray-400">No posts yet</p>
                    </div>
                  ) : (
                    posts.map((post) => {
                      const hasLiked = post.likedBy && post.likedBy[user.uid];
                      
                      return (
                        <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-sm">{formatTimestamp(post.timestamp)}</span>
                            </div>

                            {isOwnProfile && (
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {post.text && (
                            <p className="text-white mb-3 whitespace-pre-wrap break-words">{post.text}</p>
                          )}

                          {post.images && post.images.length > 0 && (
                            <div className={`mb-3 grid gap-1 rounded-xl overflow-hidden ${
                              post.images.length === 1 ? 'grid-cols-1' :
                              post.images.length === 2 ? 'grid-cols-2' :
                              post.images.length === 3 ? 'grid-cols-3' :
                              post.images.length === 4 ? 'grid-cols-2' :
                              'grid-cols-3'
                            }`}>
                              {post.images.map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`Post image ${idx + 1}`}
                                  className={`w-full object-cover ${
                                    post.images.length === 1 ? 'max-h-96' :
                                    post.images.length === 4 && idx >= 2 ? 'col-span-1' :
                                    post.images.length === 5 && idx >= 3 ? 'col-span-1' :
                                    'h-48'
                                  }`}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-6 text-gray-500">
                            <button
                              onClick={() => handleLike(post.id, post.likes, post.likedBy)}
                              className={`flex items-center gap-2 hover:text-red-500 transition group ${hasLiked ? 'text-red-500' : ''}`}
                            >
                              <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : 'group-hover:fill-current'}`} />
                              <span className="text-sm">{post.likes || 0}</span>
                            </button>

                            <button
                              onClick={() => setShowComments({ ...showComments, [post.id]: !showComments[post.id] })}
                              className="flex items-center gap-2 hover:text-blue-500 transition"
                            >
                              <MessageCircle className="w-5 h-5" />
                              <span className="text-sm">{post.commentCount || 0}</span>
                            </button>

                            <button className="flex items-center gap-2 hover:text-green-500 transition">
                              <Share2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g., Mumbai, India"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProfile}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}