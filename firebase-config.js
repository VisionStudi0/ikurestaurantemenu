import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTAiCQ7hi-ZmBt2MYWzciELL-lB_SsE3A",
  authDomain: "iku-menu-interactivo.firebaseapp.com",
  projectId: "iku-menu-interactivo",
  storageBucket: "iku-menu-interactivo.firebasestorage.app",
  messagingSenderId: "59457697555",
  appId: "1:59457697555:web:4a7c5fd069ad41936d4ce6",
  measurementId: "G-KZZ81XXY8V"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
