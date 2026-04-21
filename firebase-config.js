// Importamos las librerías desde la red (CDN) para que funcionen en GitHub Pages
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// Tu configuración de Firebase (la que acabas de obtener)
const firebaseConfig = {
  apiKey: "AIzaSyCTAiCQ7hi-ZmBt2MYWzciELL-lB_SsE3A",
  authDomain: "iku-menu-interactivo.firebaseapp.com",
  projectId: "iku-menu-interactivo",
  storageBucket: "iku-menu-interactivo.firebasestorage.app",
  messagingSenderId: "59457697555",
  appId: "1:59457697555:web:bf61c6746038a8906d4ce6",
  measurementId: "G-ZJLHEDSVSB"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos la Base de Datos (db) y la Autenticación (auth) para usarlas en los otros archivos
export const db = getFirestore(app);
export const auth = getAuth(app);
