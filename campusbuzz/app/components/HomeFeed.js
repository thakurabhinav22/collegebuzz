"use client";

import { useState, useEffect } from 'react';
import { Image, Send, X, AlertCircle, Shield, Award, Briefcase, Users } from 'lucide-react';
import { ref, push, set, onValue, serverTimestamp, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from "../lib/firebase"
export default function HomeFeed({ user, userData }) {
  const [postText, setPostText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  // Check if user is verified or in community
  const canPostWithPhoto = () => {
    return userData?.verified === true || userData?.inCommunity === true;
  };

  // Get badge info based on role
  const getBadgeInfo = (role, verified) => {
    if (!verified) return null;

    const badges = {
      'admin': { color: 'bg-lime-500', icon: Shield, label: 'Admin' },
      'principal': { color: 'bg-red-500', icon: Award, label: 'Principal' },
      'office_staff': { color: 'bg-red-500', icon: Briefcase, label: 'Office Staff' },
      'community_member': { color: 'bg-yellow-500', icon: Users, label: 'Community Member' }
    };

    return badges[role] || null;
  };

  // Load posts
  useEffect(() => {
    const postsRef = ref(database, 'posts');
    const unsubscribe = onValue(postsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const postsData = snapshot.val();
        const postsArray = await Promise.all(
          Object.entries(postsData).map(async ([id, post]) => {
            // Get author data
            const authorRef = ref(database, `users/${post.authorId}`);
            const authorSnapshot = await get(authorRef);
            const authorData = authorSnapshot.exists() ? authorSnapshot.val() : null;

            return {
              id,
              ...post,
              authorData
            };
          })
        );
        
        // Sort by timestamp (newest first)
        postsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setPosts(postsArray);
      } else {
        setPosts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    
    if (!canPostWithPhoto()) {
      setShowAccessDenied(true);
      e.target.value = '';
      return;
    }

    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should be less than 5MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Create post
  const handlePost = async () => {
    if (!postText.trim() && !selectedImage) {
      setError('Please write something or select an image');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        if (!canPostWithPhoto()) {
          setError('You need to be verified or part of a community to post photos');
          setLoading(false);
          return;
        }

        const imageRef = storageRef(storage, `posts/${user.uid}/${Date.now()}_${selectedImage.name}`);
        await uploadBytes(imageRef, selectedImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Create post
      const postsRef = ref(database, 'posts');
      const newPostRef = push(postsRef);
      
      await set(newPostRef, {
        authorId: user.uid,
        authorName: userData.name || 'Anonymous',
        authorEmail: userData.email || '',
        authorRole: userData.role || 'student',
        authorVerified: userData.verified || false,
        text: postText.trim(),
        imageUrl: imageUrl,
        timestamp: serverTimestamp(),
        likes: 0,
        comments: 0
      });

      // Reset form
      setPostText('');
      setSelectedImage(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render verification badge
  const VerificationBadge = ({ role, verified }) => {
    const badge = getBadgeInfo(role, verified);
    if (!badge) return null;

    const Icon = badge.icon;

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${badge.color}`}>
        <Icon className="w-3 h-3" />
        <span>{badge.label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Create Post Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          {/* User Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold">
              {userData?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>

          {/* Post Input */}
          <div className="flex-1">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 focus:outline-none focus:border-blue-500 transition text-white resize-none"
              rows="3"
            />

            {/* Image Preview */}
            {imagePreview && (
              <div className="mt-4 relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full rounded-lg max-h-96 object-cover"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 p-2 rounded-full transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-4">
              <label
                htmlFor="image-upload"
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg cursor-pointer transition"
              >
                <Image className="w-5 h-5 text-blue-400" />
                <span className="text-sm">Photo</span>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>

              <button
                onClick={handlePost}
                disabled={loading || (!postText.trim() && !selectedImage)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                <span>{loading ? 'Posting...' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <p className="text-gray-400">No posts yet. Be the first to post!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              {/* Post Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold">
                    {post.authorData?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{post.authorData?.name || 'Anonymous'}</h3>
                    <VerificationBadge 
                      role={post.authorRole} 
                      verified={post.authorVerified} 
                    />
                  </div>
                  <p className="text-sm text-gray-400">
                    {new Date(post.timestamp).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Post Content */}
              {post.text && (
                <p className="text-gray-200 mb-4 whitespace-pre-wrap">{post.text}</p>
              )}

              {/* Post Image */}
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="Post"
                  className="w-full rounded-lg max-h-96 object-cover mb-4"
                />
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-6 pt-4 border-t border-gray-800">
                <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{post.likes || 0}</span>
                </button>

                <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{post.comments || 0}</span>
                </button>

                <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition ml-auto">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Access Denied Modal */}
      {showAccessDenied && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-red-500 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">Photo Upload Restricted</h2>
            </div>
            
            <p className="text-gray-300 mb-4">
              Only <span className="text-blue-400 font-semibold">verified users</span> or <span className="text-blue-400 font-semibold">community members</span> can post photos.
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