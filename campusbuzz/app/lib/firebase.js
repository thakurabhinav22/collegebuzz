// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage'; // Add this import

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUakwGuxsZKfB9NS4TbizTn3Cva5dbpyA",
  authDomain: "collegebuzz-ita.firebaseapp.com",
  projectId: "collegebuzz-ita",
  storageBucket: "collegebuzz-ita.firebasestorage.app",
  messagingSenderId: "213704542933",
  appId: "1:213704542933:web:59715404dbbd225a66f05c",
  databaseURL: "https://collegebuzz-ita-default-rtdb.firebaseio.com"
};

// Initialize Firebase only if it hasn't been initialized already
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app); // Add this export
export default app;