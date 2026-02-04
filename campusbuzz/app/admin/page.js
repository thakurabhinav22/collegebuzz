"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, set, onValue, remove, push, update } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import Sidebar from '../components/Sidebar';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  Search, 
  Users as UsersIcon, 
  Megaphone,
  Trash2,
  Edit,
  MoreVertical,
  UserCog,
  Ban,
  Mail,
  Award,
  Briefcase
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('users');
  
  // User management states
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Professional roles
  const professionalRoles = [
    { value: 'student', label: 'Student', color: 'bg-blue-500/20 text-blue-500' },
    { value: 'admin', label: 'Administrator', color: 'bg-amber-500/20 text-amber-500' },
    { value: 'principal', label: 'Principal', color: 'bg-red-500/20 text-red-500' },
    { value: 'vice_principal', label: 'Vice Principal', color: 'bg-orange-500/20 text-orange-500' },
    { value: 'hod', label: 'Head of Department', color: 'bg-purple-500/20 text-purple-500' },
    { value: 'professor', label: 'Professor', color: 'bg-indigo-500/20 text-indigo-500' },
    { value: 'assistant_professor', label: 'Assistant Professor', color: 'bg-cyan-500/20 text-cyan-500' },
    { value: 'lecturer', label: 'Lecturer', color: 'bg-teal-500/20 text-teal-500' },
    { value: 'office_staff', label: 'Office Staff', color: 'bg-pink-500/20 text-pink-500' },
    { value: 'lab_assistant', label: 'Lab Assistant', color: 'bg-green-500/20 text-green-500' },
    { value: 'librarian', label: 'Librarian', color: 'bg-violet-500/20 text-violet-500' },
    { value: 'counselor', label: 'Counselor', color: 'bg-rose-500/20 text-rose-500' },
    { value: 'placement_officer', label: 'Placement Officer', color: 'bg-yellow-500/20 text-yellow-500' },
    { value: 'alumni', label: 'Alumni', color: 'bg-gray-500/20 text-gray-500' },
    { value: 'community_member', label: 'Community Member', color: 'bg-emerald-500/20 text-emerald-500' }
  ];

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
        await update(userRef, {
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
      await update(userRef, {
        verified: false
      });
      alert('User unverified successfully!');
    } catch (error) {
      console.error('Error unverifying user:', error);
      alert('Failed to unverify user');
    }
  };

  const handleChangeUserRole = async (userId, newRole) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        role: newRole
      });
      alert(`Role updated to ${professionalRoles.find(r => r.value === newRole)?.label}!`);
    } catch (error) {
      console.error('Error changing role:', error);
      alert('Failed to change role');
    }
  };

  const handleSuspendUser = async (userId, currentStatus) => {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        suspended: !currentStatus,
        suspendedAt: !currentStatus ? Date.now() : null
      });
      alert(currentStatus ? 'User unsuspended' : 'User suspended');
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      // Delete user's posts
      const postsRef = ref(database, 'posts');
      const postsSnapshot = await get(postsRef);
      if (postsSnapshot.exists()) {
        const posts = postsSnapshot.val();
        for (const [postId, post] of Object.entries(posts)) {
          if (post.authorId === userId) {
            await remove(ref(database, `posts/${postId}`));
            await remove(ref(database, `comments/${postId}`));
          }
        }
      }

      // Delete user from group memberships
      const groupsRef = ref(database, 'groups');
      const groupsSnapshot = await get(groupsRef);
      if (groupsSnapshot.exists()) {
        const groups = groupsSnapshot.val();
        for (const groupId of Object.keys(groups)) {
          await remove(ref(database, `groupMembers/${groupId}/${userId}`));
        }
      }

      // Delete user data
      await remove(ref(database, `users/${userId}`));

      setShowDeleteConfirm(false);
      setUserToDelete(null);
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditingUser({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'student',
      verified: user.verified || false,
      bio: user.bio || '',
      location: user.location || ''
    });
    setShowUserModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !editingUser) return;

    try {
      const userRef = ref(database, `users/${selectedUser.uid}`);
      await update(userRef, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        verified: editingUser.verified,
        bio: editingUser.bio,
        location: editingUser.location
      });

      setShowUserModal(false);
      setSelectedUser(null);
      setEditingUser(null);
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
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
      await update(requestRef, {
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
      const groupsRef = ref(database, 'groups');
      const newGroupRef = push(groupsRef);

      await set(newGroupRef, {
        name: requestData.groupName,
        description: requestData.description,
        privacy: requestData.privacy,
        category: requestData.category,
        createdBy: requestData.requesterId,
        createdAt: Date.now(),
        approved: true,
        postingRestricted: false
      });

      const memberRef = ref(database, `groupMembers/${newGroupRef.key}/${requestData.requesterId}`);
      await set(memberRef, {
        userId: requestData.requesterId,
        userName: requestData.requesterName,
        userEmail: requestData.requesterEmail,
        role: 'owner',
        joinedAt: Date.now()
      });

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
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingAccessRequests = accessRequests.filter(r => r.status === 'pending');
  const pendingGroupRequests = groupRequests.filter(r => r.status === 'pending');

  const getRoleInfo = (role) => {
    return professionalRoles.find(r => r.value === role) || professionalRoles[0];
  };

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
              <p className="text-gray-400">Comprehensive user and content management</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <div className="bg-black border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Total Users</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <div className="bg-black border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Verified Users</p>
                <p className="text-3xl font-bold text-green-500">
                  {users.filter(u => u.verified).length}
                </p>
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
                <p className="text-3xl font-bold text-purple-500">
                  {posts.length}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-800 overflow-x-auto">
              {[
                { id: 'users', label: 'Users', icon: UsersIcon },
                { id: 'access', label: 'Access Requests', badge: pendingAccessRequests.length },
                { id: 'groups', label: 'Group Requests', badge: pendingGroupRequests.length },
                { id: 'posts', label: 'Posts', icon: Megaphone }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 whitespace-nowrap ${
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

            {/* Users Tab */}
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
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {filteredUsers.map((u) => {
                          const roleInfo = getRoleInfo(u.role);
                          
                          return (
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
                                  <div>
                                    <p className="font-medium">{u.name}</p>
                                    {u.suspended && (
                                      <span className="text-xs text-red-500">Suspended</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">{u.email}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${roleInfo.color}`}>
                                  {roleInfo.label}
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
                                    Unverified
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleEditUser(u)}
                                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                                    title="Edit User"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  
                                  {u.verified ? (
                                    <button
                                      onClick={() => handleUnverifyUser(u.uid)}
                                      className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition"
                                      title="Unverify"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleVerifyUser(u.uid)}
                                      className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition"
                                      title="Verify"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => handleSuspendUser(u.uid, u.suspended)}
                                    className={`p-2 rounded-lg transition ${
                                      u.suspended 
                                        ? 'text-green-500 hover:bg-green-500/10' 
                                        : 'text-yellow-500 hover:bg-yellow-500/10'
                                    }`}
                                    title={u.suspended ? 'Unsuspend' : 'Suspend'}
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      setUserToDelete(u);
                                      setShowDeleteConfirm(true);
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Access Requests Tab */}
            {activeTab === 'access' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Access Requests</h2>
                {pendingAccessRequests.length === 0 ? (
                  <div className="bg-black border border-gray-800 rounded-xl p-12 text-center">
                    <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
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
                                  className="px-3 py-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  {processingRequest === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4" />
                                      <span className="text-xs">Approve</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRejectAccessRequest(request.id, request)}
                                  disabled={processingRequest === request.id}
                                  className="px-3 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span className="text-xs">Reject</span>
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

            {/* Groups Tab */}
            {activeTab === 'groups' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Group Creation Requests</h2>
                {pendingGroupRequests.length === 0 ? (
                  <div className="bg-black border border-gray-800 rounded-xl p-12 text-center">
                    <UsersIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
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

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Manage Posts</h2>
                <div className="space-y-4">
                  {posts.length === 0 ? (
                    <div className="bg-black border border-gray-800 rounded-xl p-12 text-center">
                      <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No posts yet</p>
                    </div>
                  ) : (
                    posts.map((post) => (
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
                              className={`px-3 py-1 text-sm rounded-lg transition flex items-center gap-1 ${
                                post.isAnnouncement
                                  ? 'bg-amber-500/20 text-amber-500'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                              title={post.isAnnouncement ? 'Remove announcement' : 'Mark as announcement'}
                            >
                              <Megaphone className="w-4 h-4" />
                              {post.isAnnouncement && <span className="text-xs">Announcement</span>}
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="px-3 py-1 text-sm bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="text-xs">Delete</span>
                            </button>
                          </div>
                        </div>
                        {post.text && <p className="text-gray-300 mb-2">{post.text}</p>}
                        {post.images?.length > 0 && (
                          <div className="flex gap-2">
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
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>{post.likes || 0} likes</span>
                          <span>{post.commentCount || 0} comments</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit User Modal */}
      {showUserModal && selectedUser && editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Edit User</h2>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                >
                  {professionalRoles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={editingUser.location}
                  onChange={(e) => setEditingUser({ ...editingUser, location: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g., Mumbai, India"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  value={editingUser.bio}
                  onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition resize-none"
                  placeholder="User bio..."
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  checked={editingUser.verified}
                  onChange={(e) => setEditingUser({ ...editingUser, verified: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium">Verified User</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                  setEditingUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-red-500 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">Delete User</h2>
            </div>
            
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete <span className="font-bold text-white">{userToDelete.name}</span>? 
              This will permanently delete:
            </p>
            
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
              <ul className="text-sm text-red-400 space-y-1">
                <li>• User account and profile</li>
                <li>• All posts and comments</li>
                <li>• Group memberships</li>
                <li>• All associated data</li>
              </ul>
              <p className="text-sm text-red-400 mt-3 font-bold">This action cannot be undone!</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(userToDelete.uid)}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}