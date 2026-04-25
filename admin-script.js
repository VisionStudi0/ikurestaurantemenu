import { db, auth } from './firebase-config.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

// Correos que mandan en IKU
const correosAutorizados = ["cb01grupo@gmail.com", "kelly.araujotafur@gmail.com"];

const loginBtn = document.getElementById('login-btn');
const adminPanel = document.getElementById('admin-panel');
const loginScreen = document.getElementById('login-screen');
const form = document.getElementById('menu-form');

// --- 1. ACCESO ---
window.loginConGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
if (loginBtn) loginBtn.onclick = window.loginConGoogle;

onAuthStateChanged(auth, (user) => {
    if (user && correosAutorizados.includes(user.email)) {
        adminPanel.style.display = 'block';
        loginScreen.style.display = 'none';
        escucharPedidos();
        escucharMenu();
    } else if (user) {
        alert("Acceso Denegado: No eres administrador de IKU.");
        signOut(auth);
    }
});

// --- 2. PUBLICAR O EDITAR PLATOS ---
form.onsubmit = async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('edit-id').value;
    const nombre = document.getElementById('name').value;
    const precio = document.getElementById('price').value;
    const categoria = document.getElementById('category').value;
    const descripcion = document.getElementById('desc').value;
    const ingredientes = document.getElementById('ingredients').value;

    const datosPlato = {
        nombre: nombre,
        precio: Number(precio), // Forzamos que sea un número
        categoria: categoria,
        descripcion: descripcion,
        ingredientes: ingredientes.split(',').map(i => i.trim()), // Limpiamos espacios
        timestamp: serverTimestamp()
    };

    try {
        if (id) {
            await updateDoc(doc(db, "platos", id), datosPlato);
            alert("¡Plato actualizado!");
        } else {
            await addDoc(collection(db, "platos"), datosPlato);
            alert("¡Plato publicado en IKU!");
        }
        form.reset();
        cancelarEdicion();
    } catch (error) {
        console.error("Error en Firebase:", error);
        alert("No se pudo publicar. Revisa que Firestore esté activado.");
    }
};

// --- 3. VER PLATOS EN EL ADMIN ---
function escucharMenu() {
    const q = query(collection(db, "platos"), orderBy("timestamp", "desc"));
    onSnapshot(q, (sn) => {
        const listas = {
            diario: document.getElementById('lista-diario'),
            rapida: document.getElementById('lista-rapida'),
            varios: document.getElementById('lista-varios')
        };
        
        // Limpiar listas
        Object.values(listas).forEach(l => l.innerHTML = '');

        sn.docs.forEach(docSnap => {
            const d = docSnap.data();
            const id = docSnap.id;
            const item = document.createElement('div');
            item.className = 'plato-item';
            item.innerHTML = `
                <span><strong>${d.nombre}</strong> ($${d.precio})</span>
                <div>
                    <button onclick="prepararEdicion('${id}')">Editar</button>
                    <button onclick="borrarPlato('${id}')">X</button>
                </div>
            `;
            if (listas[d.categoria]) listas[d.categoria].appendChild(item);
        });
    });
}

// --- 4. VER PEDIDOS EN VIVO ---
function escucharPedidos() {
    const q = query(collection(db, "pedidos"), orderBy("timestamp", "desc"));
    onSnapshot(q, (sn) => {
        const cont = document.getElementById('lista-pedidos-realtime');
        cont.innerHTML = '';
        sn.docs.forEach(d => {
            const p = d.data();
            const card = document.createElement('div');
            card.style = `background:white; padding:15px; margin-bottom:10px; border-radius:8px; color:black; border-left:8px solid ${p.estado == 'pendiente' ? '#ffcc00' : '#28a745'}`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between">
                    <h4>Mesa/Cliente: ${p.cliente}</h4>
                    <strong>$${p.total}</strong>
                </div>
                <ul style="margin:10px 0; font-size:0.9rem;">
                    ${p.items.map(i => `<li>${i.nombre} ${i.nota ? `<br><small>📝 ${i.nota}</small>` : ''}</li>`).join('')}
                </ul>
                <button onclick="completarPedido('${d.id}')" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Completado</button>
                <button onclick="eliminarPedido('${d.id}')" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-left:5px;">X</button>
            `;
            cont.appendChild(card);
        });
    });
}

// Funciones globales para botones
window.borrarPlato = async (id) => { if(confirm("¿Borrar plato?")) await deleteDoc(doc(db, "platos", id)); };
window.completarPedido = async (id) => await updateDoc(doc(db, "pedidos", id), { estado: "completado" });
window.eliminarPedido = async (id) => { if(confirm("¿Eliminar pedido?")) await deleteDoc(doc(db, "pedidos", id)); };

window.prepararEdicion = (id) => {
    const q = query(collection(db, "platos"));
    onSnapshot(q, (sn) => {
        const d = sn.docs.find(doc => doc.id === id)?.data();
        if(d) {
            document.getElementById('edit-id').value = id;
            document.getElementById('name').value = d.nombre;
            document.getElementById('price').value = d.precio;
            document.getElementById('category').value = d.categoria;
            document.getElementById('desc').value = d.descripcion;
            document.getElementById('ingredients').value = d.ingredientes.join(', ');
            document.getElementById('submit-btn').innerText = "GUARDAR CAMBIOS";
            document.getElementById('cancel-edit').style.display = "block";
            window.scrollTo(0,0);
        }
    }, {onlyOnce: true});
};

window.cancelarEdicion = () => {
    document.getElementById('edit-id').value = "";
    document.getElementById('submit-btn').innerText = "PUBLICAR";
    document.getElementById('cancel-edit').style.display = "none";
    form.reset();
};
