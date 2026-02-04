// User Verification and Badge Utilities

/**
 * Check if user can post photos
 * @param {Object} userData - User data from Firebase
 * @returns {boolean}
 */
export const canPostWithPhoto = (userData) => {
  return userData?.verified === true || userData?.inCommunity === true;
};

/**
 * Get badge configuration based on role
 * @param {string} role - User role
 * @returns {Object|null} Badge configuration
 */
export const getBadgeConfig = (role) => {
  const badges = {
    'admin': {
      color: 'bg-lime-500',
      textColor: 'text-lime-500',
      borderColor: 'border-lime-500',
      label: 'Admin',
      icon: 'shield'
    },
    'principal': {
      color: 'bg-red-500',
      textColor: 'text-red-500',
      borderColor: 'border-red-500',
      label: 'Principal',
      icon: 'award'
    },
    'office_staff': {
      color: 'bg-red-500',
      textColor: 'text-red-500',
      borderColor: 'border-red-500',
      label: 'Office Staff',
      icon: 'briefcase'
    },
    'community_member': {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-500',
      borderColor: 'border-yellow-500',
      label: 'Community',
      icon: 'users'
    },
    'student': {
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      borderColor: 'border-blue-500',
      label: 'Student',
      icon: 'graduation-cap'
    }
  };

  return badges[role] || null;
};

/**
 * Check if user is verified
 * @param {Object} userData - User data from Firebase
 * @returns {boolean}
 */
export const isVerified = (userData) => {
  return userData?.verified === true;
};

/**
 * Check if user is in community
 * @param {Object} userData - User data from Firebase
 * @returns {boolean}
 */
export const isInCommunity = (userData) => {
  return userData?.inCommunity === true;
};

/**
 * Get user display role
 * @param {Object} userData - User data from Firebase
 * @returns {string}
 */
export const getUserDisplayRole = (userData) => {
  const roleMap = {
    'admin': 'Administrator',
    'principal': 'Principal',
    'office_staff': 'Office Staff',
    'community_member': 'Community Member',
    'student': 'Student',
    'teacher': 'Teacher',
    'faculty': 'Faculty'
  };

  return roleMap[userData?.role] || 'Member';
};

/**
 * Sample user data structure for reference
 * 
 * User Data Schema:
 * {
 *   uid: string,
 *   email: string,
 *   name: string,
 *   role: 'admin' | 'principal' | 'office_staff' | 'community_member' | 'student',
 *   verified: boolean,
 *   inCommunity: boolean,
 *   profileImage: string (url),
 *   createdAt: timestamp,
 *   lastLogin: timestamp
 * }
 */