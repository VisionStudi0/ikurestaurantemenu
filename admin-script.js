import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const correosAutorizados = ["cb01grupo@gmail.com", "kelly.araujotafur@gmail.com"];
const formatPrice = (num) => Number(num).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

let pedidosGlobales = [];

// --- 1. CONTROL DE ACCESO ---
onAuthStateChanged(auth, (user) => {
    const loginScreen = document.getElementById('login-screen');
    const adminPanel = document.getElementById('admin-panel');
    if (user && correosAutorizados.includes(user.email)) {
        loginScreen.style.display = 'none';
        adminPanel.style.display = 'flex';
        iniciarAppAdmin();
    } else {
        if (user) signOut(auth);
        loginScreen.style.display = 'flex';
        adminPanel.style.display = 'none';
    }
});

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
window.logout = () => signOut(auth);

function iniciarAppAdmin() {
    escucharPedidos();
    escucharCarta();
}

// --- 2. GESTIÓN DE LA CARTA (AQUÍ ESTABA EL FALLO) ---

// Escuchar cambios en la base de datos y mostrar la lista
function escucharCarta() {
    onSnapshot(collection(db, "menu"), (snapshot) => {
        const invList = document.getElementById('inv-list');
        if(!invList) return;
        invList.innerHTML = '';

        snapshot.docs.forEach(docSnap => {
            const d = docSnap.data();
            const id = docSnap.id;
            const item = document.createElement('div');
            item.className = 'item-carta';
            item.innerHTML = `
                <div class="item-info">
                    <strong>${d.nombre}</strong>
                    <span>${formatPrice(d.precio)}</span>
                    <small style="display:block; color:var(--text-muted)">${d.categoria}</small>
                </div>
                <div class="item-actions">
                    <button onclick="window.prepararEdicion('${id}', '${encodeURIComponent(JSON.stringify(d))}')">✏️</button>
                    <button onclick="window.eliminarPlato('${id}')">🗑️</button>
                </div>
            `;
            invList.appendChild(item);
        });
    });
}

// Función para cargar los datos en el formulario para editar
window.prepararEdicion = (id, dataStr) => {
    const d = JSON.parse(decodeURIComponent(dataStr));
    
    // Llenamos los campos del formulario
    document.getElementById('edit-id').value = id;
    document.getElementById('p-nombre').value = d.nombre;
    document.getElementById('p-precio').value = d.precio;
    document.getElementById('p-categoria').value = d.categoria;
    document.getElementById('p-desc').value = d.descripcion || '';
    
    // Cambiamos el estilo del botón para indicar edición
    const btn = document.querySelector('.btn-primary');
    btn.innerText = "ACTUALIZAR PLATO";
    btn.style.background = "var(--success)";
    
    // Scroll hacia el formulario para que el usuario lo vea
    document.querySelector('.carta-form-container').scrollIntoView({ behavior: 'smooth' });
};

// Función para Guardar (Nuevo o Editado)
window.guardarPlato = async () => {
    const id = document.getElementById('edit-id').value;
    const nombre = document.getElementById('p-nombre').value;
    const precio = document.getElementById('p-precio').value;
    const categoria = document.getElementById('p-categoria').value;
    const descripcion = document.getElementById('p-desc').value;

    if (!nombre || !precio) {
        alert("Por favor, llena nombre y precio.");
        return;
    }

    const platoData = {
        nombre: nombre,
        precio: Number(precio),
        categoria: categoria,
        descripcion: descripcion,
        ultimaActualizacion: serverTimestamp()
    };

    try {
        if (id) {
            // Si hay ID, actualizamos el existente
            await updateDoc(doc(db, "menu", id), platoData);
            alert("Plato actualizado con éxito");
        } else {
            // Si no hay ID, creamos uno nuevo
            await addDoc(collection(db, "menu"), platoData);
            alert("Plato agregado a la carta");
        }

        // Limpiar formulario y resetear botón
        resetearFormulario();
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar en la base de datos");
    }
};

function resetearFormulario() {
    document.getElementById('edit-id').value = '';
    document.getElementById('p-nombre').value = '';
    document.getElementById('p-precio').value = '';
    document.getElementById('p-desc').value = '';
    const btn = document.querySelector('.btn-primary');
    btn.innerText = "GUARDAR PLATO";
    btn.style.background = "var(--primary)";
}

window.eliminarPlato = async (id) => {
    if (confirm("¿Estás seguro de que quieres eliminar este plato de la carta?")) {
        try {
            await deleteDoc(doc(db, "menu", id));
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    }
};

// --- 3. MONITOR DE PEDIDOS Y MESAS ---
// (Mantenemos la lógica de pedidos que ya tenías)
function escucharPedidos() {
    onSnapshot(query(collection(db, "pedidos"), orderBy("fecha", "desc")), (snapshot) => {
        pedidosGlobales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const listaActivos = document.getElementById('l-activos');
        const listaAtendidos = document.getElementById('l-atendidos');
        
        if(!listaActivos || !listaAtendidos) return;
        listaActivos.innerHTML = ''; 
        listaAtendidos.innerHTML = '';

        pedidosGlobales.forEach(p => {
            const card = document.createElement('div');
            card.className = `pedido-card state-${p.estado}`;
            card.innerHTML = `
                <div class="order-header">
                    <h4>${p.cliente} <span>(${p.tipo})</span></h4>
                    <button onclick="window.imprimirComanda('${encodeURIComponent(JSON.stringify(p))}')" class="btn-print">🖨️ Ticket</button>
                </div>
                <div class="order-body">
                    ${p.items.map(i => `<p>• ${i.cantidad}x <strong>${i.nombre}</strong></p>`).join('')}
                    <hr>
                    <p><strong>Total: ${formatPrice(p.total || 0)}</strong></p>
                </div>
                <div class="order-actions">
                    ${p.estado === 'recibido' ? `<button onclick="window.cambiarEstado('${p.id}', 'preparando')">Cocinar</button>` : ''}
                    ${p.estado === 'preparando' ? `<button onclick="window.cambiarEstado('${p.id}', 'listo')">Listo</button>` : ''}
                    ${p.estado !== 'entregado' ? `<button onclick="window.cambiarEstado('${p.id}', 'entregado')">Entregar</button>` : ''}
                    <button class="btn-danger" onclick="window.eliminarPedido('${p.id}')">🗑️</button>
                </div>
            `;
            p.estado === 'entregado' ? listaAtendidos.appendChild(card) : listaActivos.appendChild(card);
        });
        actualizarMétricas();
    });
}

window.cambiarEstado = (id, nuevoEstado) => updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
window.eliminarPedido = (id) => confirm("¿Eliminar pedido?") && deleteDoc(doc(db, "pedidos", id));

// --- 4. MÉTRICAS ---
function actualizarMétricas() {
    let tHoy = 0;
    const hoy = new Date().toDateString();
    pedidosGlobales.forEach(p => {
        if (p.fecha && p.fecha.toDate().toDateString() === hoy) {
            tHoy += p.total || 0;
        }
    });
    if(document.getElementById('s-hoy')) document.getElementById('s-hoy').innerText = formatPrice(tHoy);
}
