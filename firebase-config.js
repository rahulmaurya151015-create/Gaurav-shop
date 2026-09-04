// =====================================================================
// PASTE YOUR FIREBASE PROJECT KEYS HERE.
// Get these from: Firebase Console → Project settings → General →
// "Your apps" → Web app → SDK setup and configuration → Config
// (Full step-by-step is in README.md)
// =====================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBghagikxhoVpWg6-vyjWGBgpGC9VDJ6Tg",
  authDomain: "gaurav-shop-website.firebaseapp.com",
  projectId: "gaurav-shop-website",
  storageBucket: "gaurav-shop-website.firebasestorage.app",
  messagingSenderId: "62577914839",
  appId: "1:62577914839:web:d2decfb7217fbd74731192"
};

firebase.initializeApp(firebaseConfig);

// =====================================================================
// CLOUDINARY — used only for photo/video uploads (free, no card needed).
// =====================================================================
const CLOUDINARY_CLOUD_NAME = "nanffhss";
const CLOUDINARY_UPLOAD_PRESET = "shop_uploads";
