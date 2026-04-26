import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const correosAutorizados = ["cb01grupo@gmail.com", "kelly.araujotafur@gmail.com"];
const formatPrice = (num) => Number(num).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

let pedidosGlobales = [];

// --- 1. AUTENTICACIÓN ---
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

// --- 2. MONITOR DE PEDIDOS, MÉTRICAS Y MESAS ---
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
                    ${p.estado === 'recibido' ? `<button class="btn-preparar" onclick="window.cambiarEstado('${p.id}', 'preparando')">Cocinar</button>` : ''}
                    ${p.estado === 'preparando' ? `<button class="btn-listo" onclick="window.cambiarEstado('${p.id}', 'listo')">Listo</button>` : ''}
                    ${p.estado !== 'entregado' ? `<button class="btn-entregar" onclick="window.cambiarEstado('${p.id}', 'entregado')">Entregar</button>` : ''}
                    <button class="btn-delete" onclick="window.eliminarPedido('${p.id}')">🗑️</button>
                </div>
            `;
            p.estado === 'entregado' ? listaAtendidos.appendChild(card) : listaActivos.appendChild(card);
        });
        
        actualizarMétricas();
        renderizarPlanoMesas();
    });
}

// --- 3. PLANO DE MESAS (REINTEGRADO) ---
function renderizarPlanoMesas() {
    const grid = document.getElementById('grid-mesas');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Identificar mesas ocupadas (pedidos no entregados que digan "Mesa X")
    const mesasOcupadas = pedidosGlobales
        .filter(p => p.estado !== 'entregado' && p.cliente.toLowerCase().includes('mesa'))
        .map(p => p.cliente.match(/\d+/)?.[0]);

    for (let i = 1; i <= 20; i++) {
        const ocupada = mesasOcupadas.includes(i.toString());
        const mesa = document.createElement('div');
        mesa.className = `mesa-card ${ocupada ? 'mesa-ocupada' : 'mesa-libre'}`;
        mesa.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M9 9h6v6H9z"/></svg>
            <h3>Mesa ${i}</h3>
            <span>${ocupada ? 'Ocupada' : 'Disponible'}</span>
        `;
        grid.appendChild(mesa);
    }
}

// --- 4. GESTIÓN DE CARTA (EDITAR Y AGREGAR) ---
function escucharCarta() {
    onSnapshot(collection(db, "menu"), (snapshot) => {
        const invList = document.getElementById('inv-list');
        if(!invList) return;
        invList.innerHTML = '';
        snapshot.docs.forEach(docSnap => {
            const d = docSnap.data();
            const item = document.createElement('div');
            item.className = 'item-carta';
            item.innerHTML = `
                <div class="item-info">
                    <strong>${d.nombre}</strong>
                    <span>${formatPrice(d.precio)}</span>
                </div>
                <div class="item-actions">
                    <button onclick="window.prepararEdicion('${docSnap.id}', '${encodeURIComponent(JSON.stringify(d))}')">✏️</button>
                    <button onclick="window.eliminarPlato('${docSnap.id}')">🗑️</button>
                </div>
            `;
            invList.appendChild(item);
        });
    });
}

window.prepararEdicion = (id, dataStr) => {
    const d = JSON.parse(decodeURIComponent(dataStr));
    document.getElementById('edit-id').value = id;
    document.getElementById('p-nombre').value = d.nombre;
    document.getElementById('p-precio').value = d.precio;
    document.getElementById('p-categoria').value = d.categoria;
    document.getElementById('p-desc').value = d.descripcion || '';
    document.querySelector('.form-card h3').innerText = "Editando Plato";
};

window.guardarPlato = async () => {
    const id = document.getElementById('edit-id').value;
    const plato = {
        nombre: document.getElementById('p-nombre').value,
        precio: Number(document.getElementById('p-precio').value),
        categoria: document.getElementById('p-categoria').value,
        descripcion: document.getElementById('p-desc').value
    };

    if (!plato.nombre || !plato.precio) return alert("Nombre y precio obligatorios");

    try {
        if (id) await updateDoc(doc(db, "menu", id), plato);
        else await addDoc(collection(db, "menu"), plato);
        
        // Resetear formulario
        document.getElementById('edit-id').value = '';
        document.getElementById('p-nombre').value = '';
        document.getElementById('p-precio').value = '';
        document.getElementById('p-desc').value = '';
        document.querySelector('.form-card h3').innerText = "Configurar Plato";
    } catch(e) { console.error(e); }
};

// --- 5. IMPRESIÓN Y MÉTRICAS ---
window.imprimirComanda = (pJsonStr) => {
    const p = JSON.parse(decodeURIComponent(pJsonStr));
    const win = window.open('', '', 'width=300,height=600');
    win.document.write(`<html><body style="font-family:monospace;">
        <h2 style="text-align:center">IKU</h2>
        <p>Cliente: ${p.cliente}</p>
        <hr>
        ${p.items.map(i => `<p>1x ${i.nombre}</p>`).join('')}
        <hr>
        <p>Total: ${formatPrice(p.total)}</p>
    </body></html>`);
    win.document.close();
    win.print();
    win.close();
};

function actualizarMétricas() {
    let tHoy = 0, nq = 0, bc = 0, ef = 0;
    const hoy = new Date().toDateString();
    pedidosGlobales.forEach(p => {
        if (p.fecha && p.fecha.toDate().toDateString() === hoy) {
            tHoy += p.total || 0;
            if (p.metodoPago === 'nequi') nq += p.total;
            else if (p.metodoPago === 'banco') bc += p.total;
            else ef += p.total;
        }
    });
    if(document.getElementById('s-hoy')) document.getElementById('s-hoy').innerText = formatPrice(tHoy);
    if(document.getElementById('s-nequi')) document.getElementById('s-nequi').innerText = formatPrice(nq);
    if(document.getElementById('s-bancolombia')) document.getElementById('s-bancolombia').innerText = formatPrice(bc);
    if(document.getElementById('s-efectivo')) document.getElementById('s-efectivo').innerText = formatPrice(ef);
}

window.cambiarEstado = (id, nuevoEstado) => updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
window.eliminarPedido = (id) => confirm("¿Eliminar pedido?") && deleteDoc(doc(db, "pedidos", id));
window.eliminarPlato = (id) => confirm("¿Eliminar plato?") && deleteDoc(doc(db, "menu", id));
