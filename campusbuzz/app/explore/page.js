"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, onValue, update } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import Sidebar from '../components/Sidebar';
import { 
  Search, 
  TrendingUp, 
  Heart, 
  MessageCircle, 
  Share2, 
  Shield,
  Award,
  Briefcase,
  Users,
  Loader2,
  Filter,
  Megaphone
} from 'lucide-react';

export default function ExplorePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showComments, setShowComments] = useState({});

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

  // Load posts
  useEffect(() => {
    const postsRef = ref(database, 'posts');
    const unsubscribe = onValue(postsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const postsData = snapshot.val();
        const postsArray = await Promise.all(
          Object.entries(postsData).map(async ([id, post]) => {
            const authorRef = ref(database, `users/${post.authorId}`);
            const authorSnapshot = await get(authorRef);
            const authorData = authorSnapshot.exists() ? authorSnapshot.val() : null;

            const commentsRef = ref(database, `comments/${id}`);
            const commentsSnapshot = await get(commentsRef);
            const comments = commentsSnapshot.exists() 
              ? Object.entries(commentsSnapshot.val()).map(([cId, c]) => ({ id: cId, ...c }))
              : [];

            return {
              id,
              ...post,
              authorData,
              comments,
              likedBy: post.likedBy || {}
            };
          })
        );
        
        postsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setPosts(postsArray);
        setFilteredPosts(postsArray);
      } else {
        setPosts([]);
        setFilteredPosts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter posts based on active filter and search term
  useEffect(() => {
    let filtered = [...posts];

    // Apply filter
    switch (activeFilter) {
      case 'trending':
        filtered = filtered.filter(post => (post.likes || 0) >= 5);
        filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'admin':
        filtered = filtered.filter(post => post.authorRole === 'admin');
        break;
      case 'verified':
        filtered = filtered.filter(post => post.authorVerified === true);
        break;
      case 'staff':
        filtered = filtered.filter(post => 
          post.authorRole === 'principal' || post.authorRole === 'office_staff'
        );
        break;
      case 'announcements':
        filtered = filtered.filter(post => post.isAnnouncement === true);
        break;
      default:
        break;
    }

    // Apply search
    if (searchTerm.trim()) {
      filtered = filtered.filter(post => 
        post.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.authorName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPosts(filtered);
  }, [activeFilter, searchTerm, posts]);

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

  const filters = [
    { id: 'all', label: 'All Posts', icon: Filter },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'admin', label: 'Admin Posts', icon: Shield },
    { id: 'staff', label: 'Staff Posts', icon: Briefcase },
    { id: 'verified', label: 'Verified Only', icon: Award },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex">
        <Sidebar user={user} userData={userData} />

        <main className="flex-1 ml-64 min-h-screen">
          <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Explore</h1>
              <p className="text-gray-400">Discover trending posts and announcements</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search posts, people..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {filters.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition whitespace-nowrap ${
                      activeFilter === filter.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Posts Count */}
            <div className="mb-4 text-gray-400 text-sm">
              {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'} found
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                  <p className="text-gray-400">No posts found matching your criteria</p>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const hasLiked = post.likedBy && post.likedBy[user.uid];
                  
                  return (
                    <div 
                      key={post.id} 
                      className={`bg-gray-900 border rounded-xl p-4 hover:bg-gray-900/80 transition ${
                        post.isAnnouncement ? 'border-amber-500/50 bg-amber-500/5' : 'border-gray-800'
                      }`}
                    >
                      {post.isAnnouncement && (
                        <div className="mb-3 flex items-center gap-2 text-amber-500 text-sm font-medium">
                          <Megaphone className="w-4 h-4" />
                          Official Announcement
                        </div>
                      )}

                      <div className="flex gap-3">
                        {post.authorData?.profileImage ? (
                          <img 
                            src={post.authorData.profileImage} 
                            alt={post.authorName} 
                            className="w-10 h-10 rounded-full cursor-pointer"
                            onClick={() => router.push(`/profile/${post.authorId}`)}
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
                            onClick={() => router.push(`/profile/${post.authorId}`)}
                          >
                            <span className="text-sm font-bold">{post.authorName?.charAt(0).toUpperCase() || 'U'}</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span 
                              className="font-bold text-white truncate cursor-pointer hover:underline"
                              onClick={() => router.push(`/profile/${post.authorId}`)}
                            >
                              {post.authorName}
                            </span>
                            <VerificationBadge role={post.authorRole} verified={post.authorVerified} />
                            <span className="text-gray-500 text-sm">· {formatTimestamp(post.timestamp)}</span>
                          </div>

                          {post.text && (
                            <p className="text-white mt-1 whitespace-pre-wrap break-words">{post.text}</p>
                          )}

                          {post.images && post.images.length > 0 && (
                            <div className={`mt-3 grid gap-1 rounded-xl overflow-hidden ${
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
                                  className={`w-full object-cover cursor-pointer hover:opacity-90 transition ${
                                    post.images.length === 1 ? 'max-h-96' :
                                    post.images.length === 4 && idx >= 2 ? 'col-span-1' :
                                    post.images.length === 5 && idx >= 3 ? 'col-span-1' :
                                    'h-48'
                                  }`}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-6 mt-3 text-gray-500">
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