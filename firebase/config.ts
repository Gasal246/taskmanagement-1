import { getApp, getApps, initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// info@tektontechnology.com

const firebaseConfig = {
  apiKey: "AIzaSyDu8e76eUQnaCiETaeh-af2hQtVg9vnUWo",
  authDomain: "taskmanager-4b024.firebaseapp.com",
  projectId: "taskmanager-4b024",
  storageBucket: "taskmanager-4b024.firebasestorage.app",
  messagingSenderId: "536356281424",
  appId: "1:536356281424:web:4324c9101f775b9b664555"
};

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const storage = getStorage(app);
