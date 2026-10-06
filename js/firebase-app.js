import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { firebaseConfig, isFirebaseConfigured } from "../firebase-config.js";

let app;
let auth;

export function getFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Edit firebase-config.js with your Firebase web app keys."
    );
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }

  return auth;
}

export {
  EmailAuthProvider,
  isFirebaseConfigured,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
};

export function friendlyAuthError(error) {
  const code = error?.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/weak-password":
      return "Choose a stronger password (at least 6 characters).";
    case "auth/requires-recent-login":
      return "Please enter your current password and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return error?.message || "Something went wrong.";
  }
}
