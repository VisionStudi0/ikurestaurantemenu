import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const correosAutorizados = ["cb01grupo@gmail.com", "kelly.araujotafur@gmail.com"];
const formatPrice = (num) => Number(num).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

let pedidosGlobales = [];
let menuGlobal = {};

// --- 1. ACCESO ---
onAuthStateChanged(auth, (user) => {
    const login = document.getElementById('login-screen');
    const panel = document.getElementById('admin-panel');
    if (user && correosAutorizados.includes(user.email)) {
        login.style.display = 'none'; panel.style.display = 'flex';
        iniciarAppAdmin();
    } else {
        if (user) signOut(auth);
        login.style.display = 'flex'; panel.style.display = 'none';
    }
});

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
window.logout = () => signOut(auth);

function iniciarAppAdmin() {
    escucharPedidos();
    escucharCarta();
}

// --- 2. PEDIDOS Y MÉTRICAS (Lógica Original Restaurada) ---
function escucharPedidos() {
    onSnapshot(query(collection(db, "pedidos"), orderBy("fecha", "desc")), (snapshot) => {
        pedidosGlobales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const lActivos = document.getElementById('l-activos');
        const lAtendidos = document.getElementById('l-atendidos');
        
        lActivos.innerHTML = ''; lAtendidos.innerHTML = '';

        pedidosGlobales.forEach(p => {
            const card = document.createElement('div');
            card.className = `pedido-card state-${p.estado}`;
            card.innerHTML = `
                <div class="order-header">
                    <h4>${p.cliente} <span>(${p.tipo})</span></h4>
                    <button onclick="window.imprimirComanda('${encodeURIComponent(JSON.stringify(p))}')" class="btn-print">🖨️ Ticket</button>
                </div>
                <div class="order-body">
                    ${p.items.map(i => `
                        <p>• ${i.cantidad}x <strong>${i.nombre}</strong> 
                        ${i.excluidos?.length > 0 ? `<br><small style="color:var(--danger)">❌ SIN: ${i.excluidos.join(', ')}</small>` : ''}</p>
                    `).join('')}
                    <hr><p><strong>Total: ${formatPrice(p.total || 0)}</strong></p>
                </div>
                <div class="order-actions">
                    ${p.estado === 'recibido' ? `<button onclick="window.cambiarEstado('${p.id}', 'preparando')">Cocinar</button>` : ''}
                    ${p.estado === 'preparando' ? `<button onclick="window.cambiarEstado('${p.id}', 'listo')">Listo</button>` : ''}
                    ${p.estado !== 'entregado' ? `<button onclick="window.cambiarEstado('${p.id}', 'entregado')">Entregar</button>` : ''}
                    <button class="btn-danger" onclick="window.eliminarPedido('${p.id}')">🗑️</button>
                </div>
            `;
            p.estado === 'entregado' ? lAtendidos.appendChild(card) : lActivos.appendChild(card);
        });
        
        actualizarEstadisticas();
        renderizarPlanoMesas();
    });
}

// --- 3. INTELIGENCIA DE NEGOCIO (Lo que faltaba) ---
function actualizarEstadisticas() {
    let tHoy = 0, nq = 0, bc = 0, ef = 0, pTotal = 0;
    const conteoPlatos = {}, conteoRechazos = {}, conteoIngredientes = {};
    const hoyStr = new Date().toDateString();

    pedidosGlobales.forEach(p => {
        if (!p.fecha) return;
        const f = p.fecha.toDate();
        if (f.toDateString() === hoyStr) {
            tHoy += p.total || 0;
            pTotal++;
            if (p.metodoPago === 'nequi') nq += p.total;
            else if (p.metodoPago === 'banco') bc += p.total;
            else ef += p.total;

            p.items.forEach(i => {
                conteoPlatos[i.nombre] = (conteoPlatos[i.nombre] || 0) + i.cantidad;
                // Seguimiento de ingredientes (según el menú)
                if (menuGlobal[i.nombre]) {
                    menuGlobal[i.nombre].forEach(ing => conteoIngredientes[ing] = (conteoIngredientes[ing] || 0) + i.cantidad);
                }
                // Seguimiento de rechazos
                if (i.excluidos) i.excluidos.forEach(ex => conteoRechazos[ex] = (conteoRechazos[ex] || 0) + 1);
            });
        }
    });

    // Actualizar UI de métricas
    document.getElementById('s-hoy').innerText = formatPrice(tHoy);
    document.getElementById('s-nequi').innerText = formatPrice(nq);
    document.getElementById('s-bancolombia').innerText = formatPrice(bc);
    document.getElementById('s-efectivo').innerText = formatPrice(ef);
    document.getElementById('s-ticket-promedio').innerText = formatPrice(pTotal > 0 ? tHoy / pTotal : 0);

    // Renderizar Rankings
    renderizarRanking('rankings-categoria', conteoPlatos, 'item');
    renderizarRanking('rankings-rechazados', conteoRechazos, 'danger');
    renderizarRanking('rankings-ingredientes', conteoIngredientes, 'success');
}

function renderizarRanking(containerId, datos, tipo) {
    const cont = document.getElementById(containerId);
    if (!cont) return;
    cont.innerHTML = Object.entries(datos)
        .sort((a,b) => b[1] - a[1]).slice(0, 5)
        .map(([name, qty]) => `<div class="rank-badge ${tipo}">${name} <span>${qty}</span></div>`).join('');
}

// --- 4. PLANO DE MESAS ---
function renderizarPlanoMesas() {
    const grid = document.getElementById('grid-mesas');
    if (!grid) return;
    grid.innerHTML = '';
    const ocupadas = pedidosGlobales
        .filter(p => p.estado !== 'entregado' && p.cliente.toLowerCase().includes('mesa'))
        .map(p => p.cliente.match(/\d+/)?.[0]);

    for (let i = 1; i <= 20; i++) {
        const esOcupada = ocupadas.includes(i.toString());
        const mesa = document.createElement('div');
        mesa.className = `mesa-card ${esOcupada ? 'mesa-ocupada' : 'mesa-libre'}`;
        mesa.innerHTML = `<div>🪑</div><h3>Mesa ${i}</h3><span>${esOcupada ? 'Ocupada' : 'Libre'}</span>`;
        grid.appendChild(mesa);
    }
}

// --- 5. GESTIÓN DE CARTA (EDITAR Y AGREGAR) ---
function escucharCarta() {
    onSnapshot(collection(db, "menu"), (snapshot) => {
        const invList = document.getElementById('inv-list');
        if(!invList) return;
        invList.innerHTML = '';
        snapshot.docs.forEach(docSnap => {
            const d = docSnap.data();
            menuGlobal[d.nombre] = d.ingredientes || []; // Para el conteo de despensa
            const item = document.createElement('div');
            item.className = 'item-carta';
            item.innerHTML = `
                <span><strong>${d.nombre}</strong> - ${formatPrice(d.precio)}</span>
                <div class="actions">
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
    document.getElementById('p-ingredientes').value = d.ingredientes ? d.ingredientes.join(', ') : '';
    document.querySelector('.form-card h3').innerText = "Editando: " + d.nombre;
};

window.guardarPlato = async () => {
    const id = document.getElementById('edit-id').value;
    const plato = {
        nombre: document.getElementById('p-nombre').value,
        precio: Number(document.getElementById('p-precio').value),
        categoria: document.getElementById('p-categoria').value,
        descripcion: document.getElementById('p-desc').value,
        ingredientes: document.getElementById('p-ingredientes').value.split(',').map(i => i.trim()).filter(i => i !== "")
    };

    if (!plato.nombre || !plato.precio) return alert("Llena los campos obligatorios");

    try {
        if (id) await updateDoc(doc(db, "menu", id), plato);
        else await addDoc(collection(db, "menu"), plato);
        
        // Reset
        document.getElementById('edit-id').value = '';
        document.getElementById('p-nombre').value = '';
        document.getElementById('p-precio').value = '';
        document.getElementById('p-ingredientes').value = '';
        document.querySelector('.form-card h3').innerText = "Configurar Plato";
        alert("¡Plato guardado!");
    } catch(e) { console.error(e); }
};

window.imprimirComanda = (pJsonStr) => {
    const p = JSON.parse(decodeURIComponent(pJsonStr));
    const win = window.open('', '', 'width=300,height=600');
    win.document.write(`<html><body style="font-family:monospace;padding:10px;">
        <h2 style="text-align:center">IKU COMANDA</h2>
        <p>Cliente: ${p.cliente}</p><hr>
        ${p.items.map(i => `<p>1x ${i.nombre}${i.excluidos ? '<br>- Sin: '+i.excluidos.join(',') : ''}</p>`).join('')}
        <hr><p style="text-align:right">Total: ${formatPrice(p.total)}</p>
    </body></html>`);
    win.document.close(); win.print(); win.close();
};

window.cambiarEstado = (id, nE) => updateDoc(doc(db, "pedidos", id), { estado: nE });
window.eliminarPedido = (id) => confirm("¿Eliminar pedido?") && deleteDoc(doc(db, "pedidos", id));
window.eliminarPlato = (id) => confirm("¿Eliminar de la carta?") && deleteDoc(doc(db, "menu", id));
