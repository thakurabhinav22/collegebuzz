"use client";

import { useState, useEffect } from 'react';
import { ref, push, set, onValue, serverTimestamp } from 'firebase/database';
import { database } from '../lib/firebase';
import { Image, Send, AlertCircle, Loader2 } from 'lucide-react';
import PostCard from './PostCard';

export default function HomeFeed({ user, userData }) {
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);

  useEffect(() => {
    // Listen for posts
    const postsRef = ref(database, 'posts');
    const unsubscribe = onValue(postsRef, (snapshot) => {
      if (snapshot.exists()) {
        const postsData = snapshot.val();
        const postsArray = Object.entries(postsData).map(([id, data]) => ({
          id,
          ...data
        }));
        // Sort by timestamp, newest first
        postsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setPosts(postsArray);
      } else {
        setPosts([]);
      }
      setLoadingPosts(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is verified
    if (!userData?.verified) {
      setShowVerificationWarning(true);
      return;
    }

    if (!postText.trim()) return;

    setLoading(true);

    try {
      const postsRef = ref(database, 'posts');
      const newPostRef = push(postsRef);

      await set(newPostRef, {
        text: postText,
        authorId: user.uid,
        authorName: userData.name,
        authorEmail: userData.email,
        authorImage: userData.profileImage || '',
        authorVerified: userData.verified || false,
        timestamp: serverTimestamp(),
        likes: 0,
        comments: 0,
        shares: 0
      });

      setPostText('');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Post Card */}
      <div className="bg-black border border-gray-800 rounded-xl p-6">
        <div className="flex gap-3">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {userData?.profileImage ? (
              <img 
                src={userData.profileImage} 
                alt={userData.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-lg font-bold">
                  {userData?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>

          {/* Post Input */}
          <form onSubmit={handlePostSubmit} className="flex-1">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder={
                userData?.verified 
                  ? "What's happening in campus?" 
                  : "You need to be verified to post"
              }
              disabled={!userData?.verified || loading}
              className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none disabled:opacity-50"
              rows="3"
            />

            {/* Verification Warning */}
            {showVerificationWarning && !userData?.verified && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-400 font-medium">Verification Required</p>
                  <p className="text-xs text-red-300 mt-1">
                    You need to be verified to create posts. Please contact an administrator to verify your account.
                  </p>
                </div>
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
              <button
                type="button"
                disabled={!userData?.verified}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image className="w-5 h-5" />
                <span className="text-sm font-medium">Photo</span>
              </button>

              <button
                type="submit"
                disabled={!postText.trim() || loading || !userData?.verified}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-full font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Post</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Posts Feed */}
      {loadingPosts ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-black border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500">No posts yet. Be the first to post!</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} currentUser={user} />
        ))
      )}
    </div>
  );
}