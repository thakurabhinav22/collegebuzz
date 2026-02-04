"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, set, onValue, remove, push, update } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import Sidebar from '../components/Sidebar';
import { Shield, CheckCircle, XCircle, Clock, Loader2, Search, Users as UsersIcon, Megaphone } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessRequests, setAccessRequests] = useState([]);
  const [groupRequests, setGroupRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingRequest, setProcessingRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // users, access, groups, posts

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
          const data = snapshot.val();
          
          if (data.role !== 'admin') {
            router.push('/dashboard');
            return;
          }
          
          setUserData(data);
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

  useEffect(() => {
    if (!user || userData?.role !== 'admin') return;

    // Listen for access requests
    const requestsRef = ref(database, 'accessRequests');
    const unsubscribeRequests = onValue(requestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const requestsData = snapshot.val();
        const requestsArray = Object.entries(requestsData).map(([id, data]) => ({
          id,
          ...data
        }));
        setAccessRequests(requestsArray);
      } else {
        setAccessRequests([]);
      }
    });

    // Listen for group requests
    const groupRequestsRef = ref(database, 'groupRequests');
    const unsubscribeGroupRequests = onValue(groupRequestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const requestsData = snapshot.val();
        const requestsArray = Object.entries(requestsData).map(([id, data]) => ({
          id,
          ...data
        }));
        setGroupRequests(requestsArray);
      } else {
        setGroupRequests([]);
      }
    });

    // Listen for all users
    const usersRef = ref(database, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersArray = Object.entries(usersData).map(([id, data]) => ({
          uid: id,
          ...data
        }));
        setUsers(usersArray);
      } else {
        setUsers([]);
      }
    });

    // Listen for all posts
    const postsRef = ref(database, 'posts');
    const unsubscribePosts = onValue(postsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const postsData = snapshot.val();
        const postsArray = await Promise.all(
          Object.entries(postsData).map(async ([id, post]) => {
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
        
        postsArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setPosts(postsArray);
      } else {
        setPosts([]);
      }
    });

    return () => {
      unsubscribeRequests();
      unsubscribeGroupRequests();
      unsubscribeUsers();
      unsubscribePosts();
    };
  }, [user, userData]);

  const handleVerifyUser = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const existingData = snapshot.val();
        await set(userRef, {
          ...existingData,
          verified: true
        });
        alert('User verified successfully!');
      }
    } catch (error) {
      console.error('Error verifying user:', error);
      alert('Failed to verify user');
    }
  };

  const handleUnverifyUser = async (userId) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const existingData = snapshot.val();
        await set(userRef, {
          ...existingData,
          verified: false
        });
        alert('User unverified successfully!');
      }
    } catch (error) {
      console.error('Error unverifying user:', error);
      alert('Failed to unverify user');
    }
  };

  const handleApproveAccessRequest = async (requestId, requestData) => {
    setProcessingRequest(requestId);
    
    try {
      const userPlaceholderId = `pending_${Date.now()}_${requestData.email.replace(/[.@]/g, '_')}`;
      const userRef = ref(database, `users/${userPlaceholderId}`);
      
      await set(userRef, {
        uid: userPlaceholderId,
        email: requestData.email,
        name: requestData.name || 'New User',
        profileImage: '',
        role: 'student',
        verified: false,
        inCommunity: false,
        approved: true,
        createdAt: Date.now(),
        lastLogin: null
      });

      const requestRef = ref(database, `accessRequests/${requestId}`);
      await remove(requestRef);

      alert(`Access approved for ${requestData.email}!`);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectAccessRequest = async (requestId, requestData) => {
    setProcessingRequest(requestId);
    
    try {
      const requestRef = ref(database, `accessRequests/${requestId}`);
      await set(requestRef, {
        ...requestData,
        status: 'rejected',
        rejectedAt: Date.now()
      });

      alert(`Access request from ${requestData.email} has been rejected.`);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleApproveGroupRequest = async (requestId, requestData) => {
    setProcessingRequest(requestId);
    
    try {
      // Create the group
      const groupsRef = ref(database, 'groups');
      const newGroupRef = push(groupsRef);

      await set(newGroupRef, {
        name: requestData.groupName,
        description: requestData.description,
        privacy: requestData.privacy,
        category: requestData.category,
        createdBy: requestData.requesterId,
        createdAt: Date.now(),
        approved: true
      });

      // Add creator as first member
      const memberRef = ref(database, `groupMembers/${newGroupRef.key}/${requestData.requesterId}`);
      await set(memberRef, {
        userId: requestData.requesterId,
        userName: requestData.requesterName,
        userEmail: requestData.requesterEmail,
        role: 'admin',
        joinedAt: Date.now()
      });

      // Update request status
      const requestRef = ref(database, `groupRequests/${requestId}`);
      await update(requestRef, {
        status: 'approved',
        approvedAt: Date.now(),
        groupId: newGroupRef.key
      });

      alert(`Group "${requestData.groupName}" created successfully!`);
    } catch (error) {
      console.error('Error approving group request:', error);
      alert('Failed to approve group request.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectGroupRequest = async (requestId, requestData) => {
    setProcessingRequest(requestId);
    
    try {
      const requestRef = ref(database, `groupRequests/${requestId}`);
      await update(requestRef, {
        status: 'rejected',
        rejectedAt: Date.now()
      });

      alert(`Group request "${requestData.groupName}" has been rejected.`);
    } catch (error) {
      console.error('Error rejecting group request:', error);
      alert('Failed to reject group request.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleToggleAnnouncement = async (postId, currentStatus) => {
    try {
      const postRef = ref(database, `posts/${postId}`);
      await update(postRef, {
        isAnnouncement: !currentStatus
      });
      alert(currentStatus ? 'Announcement removed' : 'Post marked as announcement!');
    } catch (error) {
      console.error('Error toggling announcement:', error);
      alert('Failed to update post');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const postRef = ref(database, `posts/${postId}`);
      await remove(postRef);

      const commentsRef = ref(database, `comments/${postId}`);
      await remove(commentsRef);

      alert('Post deleted successfully!');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingAccessRequests = accessRequests.filter(r => r.status === 'pending');
  const pendingGroupRequests = groupRequests.filter(r => r.status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData || userData.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex">
        <Sidebar user={user} userData={userData} />

        <main className="flex-1 ml-64 min-h-screen p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-amber-500" />
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              </div>
              <p className="text-gray-400">Manage users, groups, and content</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-black border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Total Users</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <div className="bg-black border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Pending Access</p>
                <p className="text-3xl font-bold text-amber-500">
                  {pendingAccessRequests.length}
                </p>
              </div>
              <div className="bg-black border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Group Requests</p>
                <p className="text-3xl font-bold text-blue-500">
                  {pendingGroupRequests.length}
                </p>
              </div>
              <div className="bg-black border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Total Posts</p>
                <p className="text-3xl font-bold text-green-500">
                  {posts.length}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-800">
              {[
                { id: 'users', label: 'Users', icon: UsersIcon },
                { id: 'access', label: 'Access Requests', badge: pendingAccessRequests.length },
                { id: 'groups', label: 'Group Requests', badge: pendingGroupRequests.length },
                { id: 'posts', label: 'Posts', icon: Megaphone }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-500'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-amber-500 text-black rounded-full font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content based on active tab */}
            {activeTab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">User Management</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users..."
                      className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="bg-black border border-gray-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {filteredUsers.map((u) => (
                          <tr key={u.uid} className="hover:bg-gray-900/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {u.profileImage ? (
                                  <img src={u.profileImage} alt={u.name} className="w-10 h-10 rounded-full" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                    {u.name?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-medium">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400">{u.email}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                u.role === 'admin' 
                                  ? 'bg-amber-500/20 text-amber-500'
                                  : 'bg-blue-500/20 text-blue-500'
                              }`}>
                                {u.role || 'student'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {u.verified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-500/20 text-green-500 rounded">
                                  <CheckCircle className="w-3 h-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-500/20 text-red-500 rounded">
                                  <XCircle className="w-3 h-3" />
                                  Not Verified
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {u.verified ? (
                                <button
                                  onClick={() => handleUnverifyUser(u.uid)}
                                  className="px-3 py-1 text-sm bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition"
                                >
                                  Unverify
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleVerifyUser(u.uid)}
                                  className="px-3 py-1 text-sm bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition"
                                >
                                  Verify
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'access' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Access Requests</h2>
                {pendingAccessRequests.length === 0 ? (
                  <div className="bg-black border border-gray-800 rounded-xl p-12 text-center">
                    <p className="text-gray-400">No pending access requests</p>
                  </div>
                ) : (
                  <div className="bg-black border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Requested</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {pendingAccessRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-gray-900/50">
                            <td className="px-6 py-4 text-sm">{request.email}</td>
                            <td className="px-6 py-4 text-sm">{request.name || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm text-gray-400">
                              {new Date(request.requestedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleApproveAccessRequest(request.id, request)}
                                  disabled={processingRequest === request.id}
                                  className="px-3 py-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50"
                                >
                                  {processingRequest === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRejectAccessRequest(request.id, request)}
                                  disabled={processingRequest === request.id}
                                  className="px-3 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'groups' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Group Creation Requests</h2>
                {pendingGroupRequests.length === 0 ? (
                  <div className="bg-black border border-gray-800 rounded-xl p-12 text-center">
                    <p className="text-gray-400">No pending group requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingGroupRequests.map((request) => (
                      <div key={request.id} className="bg-black border border-gray-800 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">{request.groupName}</h3>
                            <p className="text-gray-400 mb-3">{request.description}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Requested by: <span className="text-white">{request.requesterName}</span></span>
                              <span>•</span>
                              <span>{request.requesterEmail}</span>
                              <span>•</span>
                              <span>{new Date(request.requestedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <span className="px-2 py-1 text-xs bg-gray-800 rounded">{request.category}</span>
                              <span className="px-2 py-1 text-xs bg-gray-800 rounded">{request.privacy}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApproveGroupRequest(request.id, request)}
                            disabled={processingRequest === request.id}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50"
                          >
                            {processingRequest === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                Approve & Create Group
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleRejectGroupRequest(request.id, request)}
                            disabled={processingRequest === request.id}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'posts' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Manage Posts</h2>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div 
                      key={post.id} 
                      className={`bg-black border rounded-xl p-4 ${
                        post.isAnnouncement ? 'border-amber-500/50' : 'border-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{post.authorData?.name || 'Unknown'}</span>
                          <span className="text-gray-500 text-sm">
                            {new Date(post.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleAnnouncement(post.id, post.isAnnouncement)}
                            className={`px-3 py-1 text-sm rounded-lg transition ${
                              post.isAnnouncement
                                ? 'bg-amber-500/20 text-amber-500'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            <Megaphone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="px-3 py-1 text-sm bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {post.text && <p className="text-gray-300">{post.text}</p>}
                      {post.images?.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {post.images.slice(0, 3).map((img, idx) => (
                            <img key={idx} src={img} alt="" className="w-20 h-20 object-cover rounded" />
                          ))}
                          {post.images.length > 3 && (
                            <div className="w-20 h-20 bg-gray-800 rounded flex items-center justify-center">
                              <span className="text-sm">+{post.images.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}