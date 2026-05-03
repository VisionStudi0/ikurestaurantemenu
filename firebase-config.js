import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// Tu configuración real de IKU
const firebaseConfig = {
    apiKey: "AIzaSyCTAiCQ7hi-ZmBt2MYWzciELL-lB_SsE3A",
    authDomain: "iku-menu-interactivo.firebaseapp.com",
    projectId: "iku-menu-interactivo",
    storageBucket: "iku-menu-interactivo.firebasestorage.app",
    messagingSenderId: "59457697555",
    appId: "1:59457697555:web:4a7c5fd069ad41936d4ce6",
    measurementId: "G-KZZ81XXY8V"
};

// Inicializar Firebase (Solo una vez)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Habilitar Persistencia Offline
enableIndexedDbPersistence(db)
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn("Persistencia falló: múltiples pestañas abiertas.");
      } else if (err.code == 'unimplemented') {
          console.warn("El navegador no soporta persistencia local.");
      }
  });

// Exportar las variables para SARLAB
export { db, auth };
