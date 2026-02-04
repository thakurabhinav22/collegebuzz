"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, update, remove } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import Sidebar from '../components/Sidebar';
import { 
  LogOut,
  Trash2,
  Bell,
  Lock,
  User,
  Mail,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [notifications, setNotifications] = useState({
    posts: true,
    comments: true,
    likes: true,
    groups: true
  });

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
          setUserData(data);
          setUser(currentUser);
          
          // Load notification settings
          if (data.notificationSettings) {
            setNotifications(data.notificationSettings);
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
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);

    try {
      // Delete user's posts
      const postsRef = ref(database, 'posts');
      const postsSnapshot = await get(postsRef);
      if (postsSnapshot.exists()) {
        const posts = postsSnapshot.val();
        for (const [postId, post] of Object.entries(posts)) {
          if (post.authorId === user.uid) {
            await remove(ref(database, `posts/${postId}`));
            await remove(ref(database, `comments/${postId}`));
          }
        }
      }

      // Delete user data
      await remove(ref(database, `users/${user.uid}`));

      // Delete Firebase auth account
      await user.delete();

      alert('Account deleted successfully');
      router.push('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again or contact support.');
      setDeleting(false);
    }
  };

  const handleNotificationToggle = async (key) => {
    const newSettings = {
      ...notifications,
      [key]: !notifications[key]
    };

    setNotifications(newSettings);

    try {
      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, {
        notificationSettings: newSettings
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

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

        <main className="flex-1 ml-64 min-h-screen p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Settings</h1>
              <p className="text-gray-400">Manage your account and preferences</p>
            </div>

            {/* Account Info Section */}
            <div className="bg-black border border-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="font-medium">{userData?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-lg">
                  <User className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="font-medium">{userData?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-900 rounded-lg">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">Account Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {userData?.verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-500/20 text-green-500 rounded">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-500/20 text-red-500 rounded">
                          <AlertCircle className="w-3 h-3" />
                          Not Verified
                        </span>
                      )}
                      {userData?.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-500 rounded">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-black border border-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </h2>

              <div className="space-y-3">
                {[
                  { key: 'posts', label: 'New Posts', description: 'Get notified when someone posts' },
                  { key: 'comments', label: 'Comments', description: 'Get notified when someone comments on your posts' },
                  { key: 'likes', label: 'Likes', description: 'Get notified when someone likes your content' },
                  { key: 'groups', label: 'Groups', description: 'Get notified about group activities' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle(item.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications[item.key] ? 'bg-blue-500' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Section */}
            <div className="bg-black border border-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Privacy & Security
              </h2>

              <div className="space-y-3">
                <div className="p-4 bg-gray-900 rounded-lg">
                  <p className="font-medium mb-1">Account Visibility</p>
                  <p className="text-sm text-gray-400 mb-3">Your profile is visible to all college members</p>
                  <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
                    Manage Visibility
                  </button>
                </div>

                <div className="p-4 bg-gray-900 rounded-lg">
                  <p className="font-medium mb-1">Data Download</p>
                  <p className="text-sm text-gray-400 mb-3">Download a copy of your data</p>
                  <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
                    Request Data
                  </button>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="bg-black border border-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Account Actions</h2>

              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-800 rounded-lg transition text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="flex-1">Sign Out</span>
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition text-left border border-red-500/50"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="flex-1">Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-red-500 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">Delete Account</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                This action is <span className="text-red-500 font-bold">permanent</span> and cannot be undone. All your posts, comments, and data will be deleted.
              </p>
              
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-400 mb-2">
                  To confirm, type <span className="font-bold">DELETE</span> in the box below:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 transition"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}