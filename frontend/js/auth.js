// Firebase config — injected by generate-config.sh (see config.js)
const firebaseConfig = window.FIREBASE_CONFIG;

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
