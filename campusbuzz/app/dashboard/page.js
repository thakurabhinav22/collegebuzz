"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import Sidebar from '../components/Sidebar';
import HomeFeed from '../components/HomeFeed';
import TrendingWidget from '../components/TrendingWidget';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // User not logged in, redirect to login
        router.push('/login');
        return;
      }

      try {
        // Get user data from database
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          setUserData(data);
          setUser(currentUser);
        } else {
          // User not in database, redirect to login
          await auth.signOut();
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setAuthChecking(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Only show loading for auth check, not the entire page
  if (authChecking) {
    return null; // Return nothing while checking auth (prevents flash)
  }

  if (!user || !userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex">
        {/* Sidebar - Loads immediately */}
        <Sidebar user={user} userData={userData} />

        {/* Main Content */}
        <main className="flex-1 ml-64 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              {/* Feed - Takes 2 columns - Has its own loading state */}
              <div className="lg:col-span-2">
                <HomeFeed user={user} userData={userData} />
              </div>

              {/* Right Sidebar - Takes 1 column - Has its own loading state */}
              <div className="lg:col-span-1">
                <TrendingWidget />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}