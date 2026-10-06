// Paste values from Firebase Console → Project settings → Your apps → Web app.
// Enable Email/Password under Authentication → Sign-in method.
// Under Authentication → Settings → Authorized domains, add:
//   - localhost
//   - mattkenyon01.github.io  (your GitHub Pages host)

export const firebaseConfig = {
  apiKey: "AIzaSyAmZ9JTA5P4CLBOAtPrnNEuEP6XVkAY5eI",
  authDomain: "prbeats-996dd.firebaseapp.com",
  projectId: "prbeats-996dd",
  storageBucket: "prbeats-996dd.firebasestorage.app",
  messagingSenderId: "577315527526",
  appId: "1:577315527526:web:2fd778d5228e6e227706a7",
  measurementId: "G-RCSNNSY22C"
};

export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    Boolean(firebaseConfig.apiKey) &&
    Boolean(firebaseConfig.projectId) &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}
