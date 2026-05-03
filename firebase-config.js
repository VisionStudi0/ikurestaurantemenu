import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
// --- EN TU ARCHIVO firebase-config.js (o al inicio de admin-script.js) ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- LA MAGIA SUCEDE AQUÍ: HABILITAR PERSISTENCIA ---
enableIndexedDbPersistence(db)
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          // Múltiples pestañas de la misma aplicación abiertas a la vez
          // Esto suele pasar en desarrollo, no te preocupes mucho por este log
          console.warn("La persistencia de Firestore falló: Posiblemente tengas múltiples pestañas abiertas. Esto está bien.");
      } else if (err.code == 'unimplemented') {
          // El navegador actual no soporta todas las características necesarias
          // (ej. navegadores muy antiguos)
          console.warn("El navegador no soporta la persistencia de datos local.");
      }
  });

// Exportar las variables
export { db, auth };
const firebaseConfig = {
  apiKey: "AIzaSyCTAiCQ7hi-ZmBt2MYWzciELL-lB_SsE3A",
  authDomain: "iku-menu-interactivo.firebaseapp.com",
  projectId: "iku-menu-interactivo",
  storageBucket: "iku-menu-interactivo.firebasestorage.app",
  messagingSenderId: "59457697555",
  appId: "1:59457697555:web:4a7c5fd069ad41936d4ce6",
  measurementId: "G-KZZ81XXY8V"
};


