"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Compass, 
  Bell, 
  MessageSquare, 
  Users, 
  User, 
  MoreHorizontal,
  LogOut,
  Settings,
  Shield,
  GraduationCap
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Sidebar({ user, userData }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', href: '/dashboard', active: pathname === '/dashboard' },
    { icon: Compass, label: 'Explore', href: '/explore', active: pathname === '/explore' },
    // { icon: Bell, label: 'Notifications', href: '/notifications', active: pathname === '/notifications' },
    // { icon: MessageSquare, label: 'Messages', href: '/messages', active: pathname === '/messages' },
    { icon: Users, label: 'College Groups', href: '/groups', active: pathname === '/groups' },
    { icon: User, label: 'Profile', href: '/profile', active: pathname === '/profile' },
  ];

  // Add admin link if user is admin
  if (userData?.role === 'admin') {
    navItems.push({
      icon: Shield,
      label: 'Admin',
      href: '/admin',
      active: pathname === '/admin',
      isAdmin: true
    });
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-black border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl">CollegeBuzz</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-4 px-6 py-3 mb-1 transition-colors
                ${item.active 
                  ? 'bg-blue-500/10 text-blue-500 border-r-2 border-blue-500' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }
                ${item.isAdmin ? 'text-amber-500 hover:text-amber-400' : ''}
              `}
            >
              <Icon className="w-6 h-6" />
              <span className="font-medium">{item.label}</span>
              {item.isAdmin && (
                <Shield className="w-4 h-4 ml-auto" />
              )}
            </Link>
          );
        })}

        {/* More Menu */}
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-4 px-6 py-3 mb-1 text-gray-400 hover:text-white hover:bg-gray-900 transition-colors w-full"
        >
          <MoreHorizontal className="w-6 h-6" />
          <span className="font-medium">More</span>
        </button>

        {/* Expandable More Options */}
        {showMore && (
          <div className="ml-6 mt-2 space-y-1">
            <Link
              href="/settings"
              className="flex items-center gap-4 px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-900 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-4 px-6 py-2 text-gray-400 hover:text-red-400 hover:bg-gray-900 transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        )}
      </nav>

      {/* User Profile at Bottom */}
      <div className="p-4 border-t border-gray-800">
        <Link href="/profile" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-900 transition-colors">
          <div className="relative">
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
            
            {/* Verification Badge */}
            {userData?.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-black">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-sm truncate">{userData?.name || 'User'}</p>
            </div>
            <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
            {userData?.role === 'admin' && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-500 rounded">
                Admin
              </span>
            )}
            {!userData?.verified && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-500 rounded">
                Not Verified
              </span>
            )}
          </div>
        </Link>
      </div>
    </aside>
  );
}