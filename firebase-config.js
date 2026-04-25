/* =========================================
   CONEXIÓN CENTRAL IKU - PUEBLO BELLO
   ========================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// Tus datos reales de IKU
const firebaseConfig = {
  apiKey: "AIzaSyCTAiCQ7hi-ZmBt2MYWzciELL-lB_SsE3A",
  authDomain: "iku-menu-interactivo.firebaseapp.com",
  projectId: "iku-menu-interactivo",
  storageBucket: "iku-menu-interactivo.firebasestorage.app",
  messagingSenderId: "59457697555",
  appId: "1:59457697555:web:4a7c5fd069ad41936d4ce6",
  measurementId: "G-KZZ81XXY8V"
};

// Inicializamos los servicios
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas para que script.js y admin-script.js las usen
export const db = getFirestore(app);
export const auth = getAuth(app);
