import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAWy5qoujArUCErkJ3ZSm8UVe56ExN4qJ0",
    authDomain: "mahjong-calculator-d4162.firebaseapp.com",
    projectId: "mahjong-calculator-d4162",
    storageBucket: "mahjong-calculator-d4162.firebasestorage.app",
    messagingSenderId: "945214755822",
    appId: "1:945214755822:web:303b2d323bc9b137cb34ff",
    measurementId: "G-BZ1NZNJWCS"
};

// Firebaseの初期化
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);