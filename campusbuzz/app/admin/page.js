"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, set, onValue, remove } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import Sidebar from '../components/Sidebar';
import { Shield, CheckCircle, XCircle, Clock, Loader2, Search } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessRequests, setAccessRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingRequest, setProcessingRequest] = useState(null);

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
          
          // Check if user is admin
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

    return () => {
      unsubscribeRequests();
      unsubscribeUsers();
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

  const handleApproveRequest = async (requestId, requestData) => {
    setProcessingRequest(requestId);
    
    try {
      // Create a placeholder user entry in the database
      // This allows the user to login with their @tcetmumbai.in email
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
        approved: true, // Mark as approved
        createdAt: Date.now(),
        lastLogin: null
      });

      // Delete the access request from database
      const requestRef = ref(database, `accessRequests/${requestId}`);
      await remove(requestRef);

      alert(`Access approved for ${requestData.email}! They can now sign in with their email and create an account.`);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId, requestData) => {
    setProcessingRequest(requestId);
    
    try {
      // Update request status to rejected
      const requestRef = ref(database, `accessRequests/${requestId}`);
      await set(requestRef, {
        ...requestData,
        status: 'rejected',
        rejectedAt: Date.now()
      });

      alert(`Access request from ${requestData.email} has been rejected.`);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeleteRejectedRequest = async (requestId) => {
    setProcessingRequest(requestId);
    
    try {
      const requestRef = ref(database, `accessRequests/${requestId}`);
      await remove(requestRef);
      alert('Rejected request deleted successfully.');
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequests = accessRequests.filter(r => r.status === 'pending');
  const rejectedRequests = accessRequests.filter(r => r.status === 'rejected');

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
              <p className="text-gray-400">Manage users and access requests</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <p className="text-gray-400 text-sm mb-2">Pending Requests</p>
                <p className="text-3xl font-bold text-amber-500">
                  {pendingRequests.length}
                </p>
              </div>
              <div className="bg-black border border-gray-800 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-2">Admins</p>
                <p className="text-3xl font-bold text-blue-500">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>

            {/* Pending Access Requests */}
            {pendingRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Pending Access Requests</h2>
                <div className="bg-black border border-gray-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Requested</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {pendingRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-gray-900/50">
                            <td className="px-6 py-4 text-sm">{request.email}</td>
                            <td className="px-6 py-4 text-sm">{request.name || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm text-gray-400">
                              {new Date(request.requestedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-500 rounded">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleApproveRequest(request.id, request)}
                                  disabled={processingRequest === request.id}
                                  className="px-3 py-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  {processingRequest === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                  <span className="text-xs">Approve</span>
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(request.id, request)}
                                  disabled={processingRequest === request.id}
                                  className="px-3 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  {processingRequest === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                  <span className="text-xs">Reject</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected Access Requests */}
            {rejectedRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Rejected Access Requests</h2>
                <div className="bg-black border border-red-900/30 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Requested</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rejected</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {rejectedRequests.map((request) => (
                          <tr key={request.id} className="hover:bg-gray-900/50">
                            <td className="px-6 py-4 text-sm">{request.email}</td>
                            <td className="px-6 py-4 text-sm">{request.name || 'N/A'}</td>
                            <td className="px-6 py-4 text-sm text-gray-400">
                              {new Date(request.requestedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400">
                              {request.rejectedAt ? new Date(request.rejectedAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-500/20 text-red-500 rounded">
                                <XCircle className="w-3 h-3" />
                                Rejected
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteRejectedRequest(request.id)}
                                disabled={processingRequest === request.id}
                                className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-1 ml-auto"
                              >
                                {processingRequest === request.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                <span className="text-xs">Delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* User Management */}
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
          </div>
        </main>
      </div>
    </div>
  );
}