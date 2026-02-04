"use client";

import { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';

export default function PostCard({ post, currentUser }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes || 0);

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1);
    } else {
      setLikes(likes + 1);
    }
    setLiked(!liked);
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

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="bg-black border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Author Avatar */}
          {post.authorImage ? (
            <img 
              src={post.authorImage} 
              alt={post.authorName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-lg font-bold">
                {post.authorName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          )}

          {/* Author Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{post.authorName}</span>
              {post.authorVerified && (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-500">{formatTimestamp(post.timestamp)}</p>
          </div>
        </div>

        {/* More Options */}
        <button className="text-gray-500 hover:text-gray-400 transition">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Post Content */}
      <div className="mb-4">
        <p className="text-white whitespace-pre-wrap">{post.text}</p>
      </div>

      {/* Post Image (if exists) */}
      {post.image && (
        <div className="mb-4 rounded-xl overflow-hidden">
          <img 
            src={post.image} 
            alt="Post content"
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Post Stats */}
      <div className="flex items-center gap-6 py-3 border-t border-gray-800 text-gray-500 text-sm">
        <span>{likes} likes</span>
        <span>{post.comments || 0} comments</span>
        <span>{post.shares || 0} shares</span>
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-around pt-3 border-t border-gray-800">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            liked 
              ? 'text-red-500 hover:bg-red-500/10' 
              : 'text-gray-500 hover:text-red-500 hover:bg-red-500/10'
          }`}
        >
          <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
          <span className="font-medium">Like</span>
        </button>

        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 transition">
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Comment</span>
        </button>

        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 hover:text-green-500 hover:bg-green-500/10 transition">
          <Share2 className="w-5 h-5" />
          <span className="font-medium">Share</span>
        </button>
      </div>
    </div>
  );
}