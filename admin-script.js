import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const correosAutorizados = ["cb01grupo@gmail.com", "kelly.araujotafur@gmail.com"];
const formatPrice = (num) => Number(num).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// --- AUTENTICACIÓN ---
onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('login-screen');
    const adminPanel = document.getElementById('admin-panel');

    if (user && correosAutorizados.includes(user.email)) {
        loginScreen.style.display = 'none';
        adminPanel.style.display = 'flex';
        iniciarAppAdmin();
    } else {
        loginScreen.style.display = 'flex';
        adminPanel.style.display = 'none';
        if (user) signOut(auth); // Cerrar sesión si no está autorizado
    }
});

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
window.logout = () => signOut(auth);

function iniciarAppAdmin() {
    escucharPedidos();
    escucharCarta();
}

// --- GESTIÓN DE PEDIDOS ---
function escucharPedidos() {
    onSnapshot(query(collection(db, "pedidos"), orderBy("fecha", "desc")), (snapshot) => {
        const listaActivos = document.getElementById('l-activos');
        const listaAtendidos = document.getElementById('l-atendidos');
        listaActivos.innerHTML = '';
        listaAtendidos.innerHTML = '';

        snapshot.docs.forEach(docSnap => {
            const p = docSnap.data();
            const id = docSnap.id;
            const card = document.createElement('div');
            card.className = `order-card state-${p.estado}`;
            
            card.innerHTML = `
                <div class="order-header">
                    <h4>${p.cliente} <span>(${p.tipo})</span></h4>
                    <span class="badge">${p.estado.toUpperCase()}</span>
                </div>
                <div class="order-body">
                    ${p.items.map(i => `<p>• ${i.cantidad}x ${i.nombre}</p>`).join('')}
                    <hr>
                    <p><strong>Total: ${formatPrice(p.total)}</strong></p>
                </div>
                <div class="order-actions">
                    ${p.estado === 'recibido' ? `<button onclick="window.cambiarEstado('${id}', 'preparando')">Cocinar</button>` : ''}
                    ${p.estado === 'preparando' ? `<button onclick="window.cambiarEstado('${id}', 'listo')">Listo</button>` : ''}
                    ${p.estado !== 'entregado' ? `<button onclick="window.cambiarEstado('${id}', 'entregado')">Entregar</button>` : ''}
                    <button class="btn-danger" onclick="window.eliminarPedido('${id}')">Eliminar</button>
                </div>
            `;

            p.estado === 'entregado' ? listaAtendidos.appendChild(card) : listaActivos.appendChild(card);
        });
    });
}

window.cambiarEstado = (id, nuevoEstado) => updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
window.eliminarPedido = (id) => confirm("¿Eliminar pedido?") && deleteDoc(doc(db, "pedidos", id));

// --- GESTIÓN DE CARTA (CRUD) ---
function escucharCarta() {
    onSnapshot(collection(db, "menu"), (snapshot) => {
        const invList = document.getElementById('inv-list');
        invList.innerHTML = '';
        snapshot.docs.forEach(docSnap => {
            const d = docSnap.data();
            const item = document.createElement('div');
            item.className = 'item-carta';
            item.innerHTML = `
                <span><strong>${d.nombre}</strong> - ${formatPrice(d.precio)}</span>
                <div>
                    <button onclick="window.eliminarPlato('${docSnap.id}')">🗑️</button>
                </div>
            `;
            invList.appendChild(item);
        });
    });
}

window.guardarPlato = async () => {
    const plato = {
        nombre: document.getElementById('p-nombre').value,
        precio: Number(document.getElementById('p-precio').value),
        categoria: document.getElementById('p-categoria').value,
        descripcion: document.getElementById('p-desc').value
    };
    await addDoc(collection(db, "menu"), plato);
    alert("Plato agregado");
};

window.eliminarPlato = (id) => confirm("¿Eliminar de la carta?") && deleteDoc(doc(db, "menu", id));
