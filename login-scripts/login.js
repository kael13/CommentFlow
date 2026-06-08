// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, FacebookAuthProvider, onAuthStateChanged } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMQJ8qx0uJxGd2C1onCHqxiWDWV0FeQEg",
  authDomain: "oauth-project-1099b.firebaseapp.com",
  projectId: "oauth-project-1099b",
  storageBucket: "oauth-project-1099b.firebasestorage.app",
  messagingSenderId: "656738296444",
  appId: "1:656738296444:web:5d95d0139f3bff1fd2dff9",
  measurementId: "G-YPT7T55ZT9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Configure Facebook Auth Provider
const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('public_profile');
facebookProvider.setCustomParameters({
  'display': 'popup'
});

// Export for use in the dashboard
export { auth, facebookProvider, signInWithPopup, onAuthStateChanged };

// Helper function to get user token
export async function getToken() {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
}

console.log('CommentFlow Firebase initialized successfully');
