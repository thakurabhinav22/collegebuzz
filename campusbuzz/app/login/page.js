"use client";

import { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, Clock } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get, serverTimestamp } from 'firebase/database';
import { auth, database } from '../lib/firebase';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDomainPopup, setShowDomainPopup] = useState(false);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [showPendingPopup, setShowPendingPopup] = useState(false);
  const [rejectedEmail, setRejectedEmail] = useState('');

  // Allowed email domain
  const ALLOWED_DOMAIN = '@tcetmumbai.in';

  // Check if email domain is allowed
  const isAllowedDomain = (email) => {
    return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
  };

  // Check if user has already requested access
  const hasAlreadyRequested = async (email) => {
    try {
      const requestsRef = ref(database, 'accessRequests');
      const snapshot = await get(requestsRef);
      
      if (snapshot.exists()) {
        const requests = snapshot.val();
        // Check if any request matches the email
        const existingRequest = Object.values(requests).find(
          request => request.email.toLowerCase() === email.toLowerCase()
        );
        return existingRequest !== undefined;
      }
      return false;
    } catch (err) {
      console.error('Error checking existing requests:', err);
      return false;
    }
  };

  // Save user data to Realtime Database
  const saveUserToDatabase = async (user) => {
    try {
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);

      // Only save if user doesn't exist
      if (!userSnapshot.exists()) {
        await set(userRef, {
          uid: user.uid,
          email: user.email,
          name: user.displayName || formData.name || 'TCET Student',
          profileImage: user.photoURL || '',
          role: 'student',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      } else {
        // Update last login
        const existingData = userSnapshot.val();
        await set(userRef, {
          ...existingData,
          lastLogin: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error saving user to database:', err);
      throw new Error('Failed to save user data');
    }
  };

  // Save access request to database
  const saveAccessRequest = async (email, name = '') => {
    try {
      const requestRef = ref(database, `accessRequests/${Date.now()}`);
      await set(requestRef, {
        email: email,
        name: name,
        requestedAt: serverTimestamp(),
        status: 'pending'
      });
    } catch (err) {
      console.error('Error saving access request:', err);
      throw new Error('Failed to save access request');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setShowDomainPopup(false);
    setShowPendingPopup(false);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if email domain is allowed
      if (!isAllowedDomain(user.email)) {
        // Sign out the user
        await auth.signOut();
        
        // Check if user has already requested access
        const alreadyRequested = await hasAlreadyRequested(user.email);
        
        setRejectedEmail(user.email);
        
        if (alreadyRequested) {
          // Show pending request popup
          setShowPendingPopup(true);
        } else {
          // Show domain restriction popup with option to request
          setShowDomainPopup(true);
        }
        
        setLoading(false);
        return;
      }

      // Save user to database
      await saveUserToDatabase(user);

      // Redirect to home page
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Google sign in error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowDomainPopup(false);
    setShowPendingPopup(false);

    // Validate email domain
    if (!isAllowedDomain(formData.email)) {
      // Check if user has already requested access
      const alreadyRequested = await hasAlreadyRequested(formData.email);
      
      setRejectedEmail(formData.email);
      
      if (alreadyRequested) {
        // Show pending request popup
        setShowPendingPopup(true);
      } else {
        // Show domain restriction popup with option to request
        setShowDomainPopup(true);
      }
      
      setLoading(false);
      return;
    }

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (isSignUp && !formData.name.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

    try {
      let user;
      
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        user = result.user;
      } else {
        const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        user = result.user;
      }

      // Save user to database
      await saveUserToDatabase(user);

      // Redirect to home page
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Email auth error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Please sign up.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Save the new request
      await saveAccessRequest(rejectedEmail, formData.name);
      setShowDomainPopup(false);
      setShowRequestPopup(true);
    } catch (err) {
      setError('Failed to submit access request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-400 transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-400">
            {isSignUp 
              ? 'Sign up to access your student portal' 
              : 'Sign in to access your student portal'
            }
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-gray-900 hover:bg-gray-100 py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-3 mb-6 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-900 text-gray-400">Or continue with email</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Name Input (Sign Up only) */}
            {isSignUp && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-12 focus:outline-none focus:border-blue-500 transition text-white"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-12 focus:outline-none focus:border-blue-500 transition text-white"
                  placeholder="student@tcetmumbai.in"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Only @tcetmumbai.in emails are allowed
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-12 focus:outline-none focus:border-blue-500 transition text-white"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-12 focus:outline-none focus:border-blue-500 transition text-white"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

            {/* Forgot Password (Sign In only) */}
            {!isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-blue-400 hover:text-blue-300 transition"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 py-3 px-4 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setFormData({ email: '', password: '', confirmPassword: '', name: '' });
                }}
                className="text-blue-400 hover:text-blue-300 font-medium transition"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>

        {/* Terms and Privacy */}
        <p className="text-center text-gray-500 text-xs mt-6">
          By continuing, you agree to our{' '}
          <a href="#" className="text-blue-400 hover:text-blue-300">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-blue-400 hover:text-blue-300">Privacy Policy</a>
        </p>
      </div>

      {/* Domain Restriction Popup (First-time users) */}
      {showDomainPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-red-500 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">Access Denied</h2>
            </div>
            
            <p className="text-gray-300 mb-4">
              Only students with <span className="text-blue-400 font-semibold">@tcetmumbai.in</span> email addresses are allowed to access this portal.
            </p>
            
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-400">
                Your email: <span className="font-semibold">{rejectedEmail}</span>
              </p>
            </div>

            {error && (
              <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-500 px-4 py-3 rounded-lg mb-4 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-sm text-gray-400 mb-6">
              If you believe you should have access, you can request approval from an administrator.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleRequestAccess}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 py-3 px-4 rounded-lg font-medium transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Request Admin Approval'}
              </button>
              
              <button
                onClick={() => {
                  setShowDomainPopup(false);
                  setError('');
                }}
                className="w-full bg-gray-800 hover:bg-gray-700 py-3 px-4 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Pending Popup (Users who already requested) */}
      {showPendingPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-yellow-500 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold">Request Pending</h2>
            </div>
            
            <p className="text-gray-300 mb-4">
              Your access request is currently being reviewed by the administrators.
            </p>
            
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-400">
                Email: <span className="font-semibold">{rejectedEmail}</span>
              </p>
              <p className="text-sm text-yellow-400 mt-2">
                Status: <span className="font-semibold">Under Review</span>
              </p>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              You will receive an email notification once your request has been approved. Please check your inbox regularly.
            </p>

            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-400">
                💡 <span className="font-semibold">Tip:</span> If you need urgent access, please contact your administrator directly.
              </p>
            </div>

            <button
              onClick={() => {
                setShowPendingPopup(false);
                setRejectedEmail('');
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 py-3 px-4 rounded-lg font-medium transition"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}

      {/* Request Submitted Popup (Just submitted) */}
      {showRequestPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 border border-green-500 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">Request Submitted</h2>
            </div>
            
            <p className="text-gray-300 mb-6">
              Your access request has been submitted to the administrators. You will be notified via email once your request is reviewed.
            </p>

            <button
              onClick={() => {
                setShowRequestPopup(false);
                setRejectedEmail('');
                setError('');
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 py-3 px-4 rounded-lg font-medium transition"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}