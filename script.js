import { db, auth } from './firebase-config.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
// Añadimos 'doc', 'deleteDoc' y 'onSnapshot'
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const correosAutorizados = ["cb01grupo@gmail.com", "kelly.araujotafur@gmail.com"];
const adminPanel = document.getElementById('admin-panel');
const loginScreen = document.getElementById('login-screen');
const listaAdmin = document.getElementById('lista-admin');

// --- Lógica de Login (se mantiene igual) ---
document.getElementById('login-btn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
window.logout = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    if (user && correosAutorizados.includes(user.email)) {
        adminPanel.style.display = 'block';
        loginScreen.style.display = 'none';
        cargarPlatosAdmin(); // Cargamos la lista cuando entres
    } else {
        if(user) { alert("Acceso denegado"); signOut(auth); }
        adminPanel.style.display = 'none';
        loginScreen.style.display = 'block';
    }
});

// --- FUNCIÓN PARA BORRAR PLATOS ---
window.eliminarPlato = async (id) => {
    if (confirm("¿Seguro que quieres retirar este plato del menú?")) {
        try {
            await deleteDoc(doc(db, "platos", id));
            alert("Plato retirado con éxito.");
        } catch (error) {
            alert("Error al eliminar: " + error.message);
        }
    }
};

// --- MOSTRAR PLATOS EN EL PANEL ---
function cargarPlatosAdmin() {
    const q = query(collection(db, "platos"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        listaAdmin.innerHTML = ''; // Limpiamos la lista
        snapshot.docs.forEach(plato => {
            const data = plato.data();
            listaAdmin.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; background: #f9f9f9; margin-bottom: 5px; border-radius: 4px;">
                    <div>
                        <strong style="font-size: 0.9rem;">${data.nombre}</strong><br>
                        <small style="color: #666;">$${data.precio} - ${data.categoria}</small>
                    </div>
                    <button onclick="eliminarPlato('${plato.id}')" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                        Eliminar
                    </button>
                </div>
            `;
        });
    });
}

// --- GUARDAR PLATO (se mantiene igual) ---
document.getElementById('menu-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "platos"), {
            nombre: document.getElementById('name').value,
            precio: document.getElementById('price').value,
            categoria: document.getElementById('category').value,
            descripcion: document.getElementById('desc').value,
            ingredientes: document.getElementById('ingredients').value.split(','),
            timestamp: serverTimestamp()
        });
        alert("¡Plato guardado!");
        e.target.reset();
    } catch (err) { alert("Error: " + err.message); }
});
