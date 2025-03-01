import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile,
    browserLocalPersistence,
    setPersistence,
    connectAuthEmulator // เพิ่ม import
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    getDoc, // เพิ่ม import นี้
    updateDoc,
    arrayUnion,
    increment,
    setDoc,
    deleteDoc,
    connectFirestoreEmulator // เพิ่ม import
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBuV0yT5Xv3xjiTcJ82K2grHaaXjfdcg7E",
    authDomain: "snowdevsuperx.firebaseapp.com", // แก้ไขเป็น domain จริง
    projectId: "snowdevsuperx",
    storageBucket: "snowdevsuperx.firebasestorage.app",
    messagingSenderId: "1065365810771",
    appId: "1:1065365810771:web:add14c6891fd25d47460a6",
    measurementId: "G-976EW7V6DS"
};

// Initialize Firebase with error handling
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Initialize auth with persistence
const initializeAuth = async () => {
    try {
        if (!auth) throw new Error('Auth not initialized');
        await setPersistence(auth, browserLocalPersistence);
        console.log('Firebase persistence set to LOCAL');
    } catch (error) {
        console.error('Firebase persistence error:', error);
        throw error; // Re-throw to handle in the app
    }
};

// Development environment setup
if (window.location.hostname === 'localhost') {
    try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('Firebase emulators connected');
    } catch (error) {
        console.error('Emulator connection error:', error);
    }
}

// Initialize immediately
initializeAuth().catch(console.error);

export {
    auth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile,
    db,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    arrayUnion,
    increment,
    setDoc,
    deleteDoc
};