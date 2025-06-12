import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Replace these with your Firebase config values
  apiKey: "AIzaSyDyYCMFXas0sBKGsrI8oW9x6hfELfpLxCg",
  authDomain: "coffee-container.firebaseapp.com",
  projectId: "coffee-container",
  storageBucket: "coffee-container.firebasestorage.app",
  messagingSenderId: "546521320425",
  appId: "1:546521320425:web:379bfa2a45a0079b4a1978",
  databaseURL: "https://coffee-container-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app); 