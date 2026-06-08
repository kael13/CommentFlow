// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, FacebookAuthProvider, onAuthStateChanged } from "firebase/auth";
import firebaseConfig from "./config.js";

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
