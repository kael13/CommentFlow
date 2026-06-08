// Firebase config (from login-scripts)
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

// Auth state observer
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Get fresh token
    const token = await user.getIdToken();
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify({
      id: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    }));
    
    // Show dashboard
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    
    // Update UI
    document.getElementById('user-name').textContent = user.displayName;
    document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/32';
    
    // Load user settings
    loadSettings();
    
    // Initialize default page
    navigate('inbox');
    
    // Start autopilot polling if enabled
    initAutopilotPolling();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }
});

// Facebook login
document.getElementById('login-btn').addEventListener('click', () => {
  auth.signInWithPopup(facebookProvider)
    .catch(error => {
      showToast(error.message, 'alert');
    });
});

// Logout
document.getElementById('logout-btn').addEventListener('click', (e) => {
  e.preventDefault();
  auth.signOut();
});
