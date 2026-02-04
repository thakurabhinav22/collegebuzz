"use client";

import { useState, useEffect } from 'react';
import { Image, Send, X, AlertCircle, Shield, Award, Briefcase, Users, Heart, MessageCircle, Share2, Loader2 } from 'lucide-react';
import { ref, push, set, onValue, serverTimestamp, get, update } from 'firebase/database';
import { database } from "../lib/firebase";
import { uploadMultipleToCloudinary, validateImage } from "../lib/cloudinary";

export default function HomeFeed({ user, userData }) {
  const [postText, setPostText] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState('');
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});

  const MAX_IMAGES = 5;

  // Check if user can post with photo
  const canPostWithPhoto = () => {
    return userData?.verified === true || userData?.inCommunity === true;
  };

  // Get badge info based on role
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

            // Get comments
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
      } else {
        setPosts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (!canPostWithPhoto()) {
      setShowAccessDenied(true);
      e.target.value = '';
      return;
    }

    if (selectedImages.length + files.length > MAX_IMAGES) {
      setError(`You can only upload up to ${MAX_IMAGES} images per post`);
      return;
    }

    const validFiles = [];
    const validPreviews = [];

    for (const file of files) {
      const validation = validateImage(file);
      if (!validation.valid) {
        setError(validation.error);
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

  // Remove image
  const removeImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  // Create post
  const handlePost = async () => {
    if (!postText.trim() && selectedImages.length === 0) {
      setError('Please write something or select an image');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let imageUrls = [];

      // Upload images to Cloudinary
      if (selectedImages.length > 0) {
        if (!canPostWithPhoto()) {
          setError('You need to be verified or part of a community to post photos');
          setLoading(false);
          return;
        }

        setUploadingImages(true);
        imageUrls = await uploadMultipleToCloudinary(selectedImages);
        setUploadingImages(false);
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
        authorImage: userData.profileImage || '',
        text: postText.trim(),
        images: imageUrls,
        timestamp: serverTimestamp(),
        likes: 0,
        likedBy: {},
        commentCount: 0
      });

      // Reset form
      setPostText('');
      setSelectedImages([]);
      setImagePreviews([]);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  // Handle like
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

  // Handle comment
  const handleComment = async (postId) => {
    const text = commentText[postId];
    if (!text || !text.trim()) return;

    try {
      const commentsRef = ref(database, `comments/${postId}`);
      const newCommentRef = push(commentsRef);
      
      await set(newCommentRef, {
        authorId: user.uid,
        authorName: userData.name || 'Anonymous',
        authorImage: userData.profileImage || '',
        text: text.trim(),
        timestamp: serverTimestamp()
      });

      // Update comment count
      const postRef = ref(database, `posts/${postId}`);
      const postSnapshot = await get(postRef);
      if (postSnapshot.exists()) {
        const currentCount = postSnapshot.val().commentCount || 0;
        await update(postRef, {
          commentCount: currentCount + 1
        });
      }

      setCommentText({ ...commentText, [postId]: '' });
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  // Verification Badge Component
  const VerificationBadge = ({ role, verified }) => {
    const badge = getBadgeInfo(role, verified);
    if (!badge) return null;

    const Icon = badge.icon;

    return (
      <div className="relative group inline-block">
        <div className={`w-5 h-5 ${badge.color} rounded-full flex items-center justify-center cursor-pointer`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        
        {/* Tooltip */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {badge.label}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-800 rotate-45 -mt-1"></div>
        </div>
      </div>
    );
  };

  // Format timestamp
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

  return (
    <div className="space-y-4">
      {/* Create Post Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex gap-3">
          {/* User Avatar */}
          {userData?.profileImage ? (
            <img src={userData.profileImage} alt={userData.name} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold">{userData?.name?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
          )}

          {/* Post Input */}
          <div className="flex-1">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's happening?"
              className="w-full bg-transparent border-none focus:outline-none text-white resize-none text-xl placeholder-gray-500"
              rows="2"
            />

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className={`mt-3 grid gap-2 ${
                imagePreviews.length === 1 ? 'grid-cols-1' :
                imagePreviews.length === 2 ? 'grid-cols-2' :
                'grid-cols-3'
              }`}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-gray-900/80 hover:bg-gray-900 p-1.5 rounded-full transition opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-3 bg-red-500/10 border border-red-500 text-red-500 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer text-blue-400 hover:bg-blue-400/10 p-2 rounded-full transition">
                  <Image className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={selectedImages.length >= MAX_IMAGES}
                  />
                </label>
                {selectedImages.length > 0 && (
                  <span className="text-xs text-gray-500">{selectedImages.length}/{MAX_IMAGES}</span>
                )}
              </div>

              <button
                onClick={handlePost}
                disabled={loading || uploadingImages || (!postText.trim() && selectedImages.length === 0)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-full font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploadingImages ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : loading ? (
                  'Posting...'
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-400">No posts yet. Be the first to post!</p>
          </div>
        ) : (
          posts.map((post) => {
            const hasLiked = post.likedBy && post.likedBy[user.uid];
            
            return (
              <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:bg-gray-900/80 transition">
                {/* Post Header */}
                <div className="flex gap-3">
                  {post.authorData?.profileImage ? (
                    <img src={post.authorData.profileImage} alt={post.authorName} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold">{post.authorName?.charAt(0).toUpperCase() || 'U'}</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-white truncate">{post.authorName}</span>
                      <VerificationBadge role={post.authorRole} verified={post.authorVerified} />
                      <span className="text-gray-500 text-sm">· {formatTimestamp(post.timestamp)}</span>
                    </div>

                    {/* Post Text */}
                    {post.text && (
                      <p className="text-white mt-1 whitespace-pre-wrap break-words">{post.text}</p>
                    )}

                    {/* Post Images */}
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

                    {/* Post Actions */}
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

                    {/* Comments Section */}
                    {showComments[post.id] && (
                      <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                        {/* Add Comment */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText[post.id] || ''}
                            onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                            placeholder="Post your reply"
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 focus:outline-none focus:border-blue-500 transition text-white text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleComment(post.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            disabled={!commentText[post.id]?.trim()}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-full font-bold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            Reply
                          </button>
                        </div>

                        {/* Comments List */}
                        {post.comments?.map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            {comment.authorImage ? (
                              <img src={comment.authorImage} alt={comment.authorName} className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold">{comment.authorName?.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1 bg-gray-800 rounded-2xl px-3 py-2">
                              <p className="font-semibold text-sm text-white">{comment.authorName}</p>
                              <p className="text-sm text-gray-200">{comment.text}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatTimestamp(comment.timestamp)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
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