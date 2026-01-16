/**
 * Firebase Configuration
 * Initializes Firebase app and auth for the frontend
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase config for tradesync-ai-prod
// Generated via: firebase apps:sdkconfig WEB
const firebaseConfig = {
    apiKey: "AIzaSyDezGCDGIA16cGLiMBnPYCUXsHy70niDxc",
    authDomain: "tradesync-ai-prod.firebaseapp.com",
    projectId: "tradesync-ai-prod",
    storageBucket: "tradesync-ai-prod.firebasestorage.app",
    messagingSenderId: "400328681664",
    appId: "1:400328681664:web:3dd8f5f2d70dda89972525"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
    prompt: 'select_account'
});
