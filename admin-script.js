import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, getDocs, serverTimestamp, addDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const CORREO_MASTER = "cb01grupo@gmail.com";
const correosAutorizados = [CORREO_MASTER, "kelly.araujotafur@gmail.com"];

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

if (loginBtn) loginBtn.onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
if (logoutBtn) logoutBtn.onclick = () => signOut(auth);

let menuGlobal = {};
let pedidosGlobales = [];

onAuthStateChanged(auth, (u) => {
    if(u && correosAutorizados.includes(u.email)) {
        document.getElementById('admin-panel').style.display = 'flex';
        document.getElementById('login-screen').style.display = 'none';
        const superZone = document.getElementById('super-admin-zone');
        if(superZone) superZone.style.display = (u.email === CORREO_MASTER) ? 'block' : 'none';
        escucharCarta(); escucharPedidos(); 
    } else {
        if(u) signOut(auth);
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    }
});

// FUNCIÓN PARA VER EL PEDIDO DESDE LA MESA
window.verPedidoDeMesa = (nombreMesa) => {
    // 1. Cambiamos la vista al Monitor de Pedidos
    const navPedidos = document.querySelector('.sidebar .nav-item:first-child');
    cambiarVista('v-pedidos', navPedidos);

    // 2. Buscamos el pedido en la lista y lo resaltamos
    setTimeout(() => {
        const tarjetas = document.querySelectorAll('.pedido-card');
        tarjetas.forEach(card => {
            if (card.innerText.includes(nombreMesa)) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.transition = "0.3s";
                card.style.outline = "4px solid var(--accent)";
                card.style.transform = "scale(1.02)";
                setTimeout(() => {
                    card.style.outline = "none";
                    card.style.transform = "scale(1)";
                }, 3000);
            }
        });
    }, 400);
};

window.resetearEstadisticas = async () => {
    if (confirm("¡ATENCIÓN DAGOBERTO!\n\nEsto eliminará todos los pedidos históricos. ¿Deseas continuar?")) {
        const batch = writeBatch(db);
        const snp = await getDocs(collection(db, "pedidos"));
        snp.forEach(d => batch.delete(d.ref));
        await batch.commit();
        alert("Métricas reseteadas.");
    }
};

function escucharPedidos() {
    const q = query(collection(db, "pedidos"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        pedidosGlobales = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        renderizarListaPedidos();
        actualizarMétricas();
        renderizarPlanoMesas(pedidosGlobales);
    });
}

function renderizarListaPedidos() {
    const lp = document.getElementById('l-pendientes');
    const la = document.getElementById('l-atendidos');
    lp.innerHTML = ''; la.innerHTML = '';
    pedidosGlobales.forEach(p => {
        const card = document.createElement('div');
        card.className = `pedido-card ${p.estado}`;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <strong>${p.cliente}</strong>
                <button onclick="imprimirComanda('${encodeURIComponent(JSON.stringify(p))}')" style="background:#3b82f6; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;">🖨️ Ticket</button>
            </div>
            <div style="font-size:0.9rem; margin-bottom:10px;">
                ${p.items.map(i => `• 1x ${i.nombre} ${i.nota ? `<span style='color:#eab308;'>(${i.nota})</span>` : ''}`).join('<br>')}
            </div>
            <div style="display:flex; gap:8px;">
                ${p.estado === 'pendiente' ? `<button onclick="actualizarEstado('${p.id}', 'preparando')" class="btn-estado btn-preparar">Cocinar</button>` : ''}
                ${p.estado === 'preparando' ? `
                    <button onclick="cerrarPedido('${p.id}', 'nequi')" class="btn-pago nequi">Nequi</button>
                    <button onclick="cerrarPedido('${p.id}', 'banco')" class="btn-pago banco">Banco</button>
                    <button onclick="cerrarPedido('${p.id}', 'efectivo')" class="btn-pago efectivo">Efec.</button>` : ''}
            </div>`;
        if (p.estado === 'listo') la.appendChild(card); else lp.appendChild(card);
    });
}

function actualizarMétricas() {
    let tHoy = 0, tMes = 0;
    const ventasPlatos = {}, usoIngredientes = {}, hoy = new Date();
    pedidosGlobales.forEach(p => {
        if(!p.timestamp) return;
        const f = p.timestamp.toDate();
        if(f.getMonth() === hoy.getMonth()) tMes += p.total;
        if(f.getDate() === hoy.getDate() && f.getMonth() === hoy.getMonth()) tHoy += p.total;
        p.items.forEach(item => {
            ventasPlatos[item.nombre] = (ventasPlatos[item.nombre] || 0) + 1;
            (menuGlobal[item.nombre] || []).forEach(ing => usoIngredientes[ing] = (usoIngredientes[ing] || 0) + 1);
        });
    });
    document.getElementById('s-hoy').innerText = `$${tHoy.toLocaleString()}`;
    document.getElementById('s-mes').innerText = `$${tMes.toLocaleString()}`;
}

window.actualizarEstado = async (id, est) => await updateDoc(doc(db, "pedidos", id), { estado: est });
window.cerrarPedido = async (id, met) => await updateDoc(doc(db, "pedidos", id), { estado: 'listo', metodoPago: met });

function escucharCarta() {
    onSnapshot(collection(db, "platos"), (snap) => {
        const list = document.getElementById('inv-list');
        list.innerHTML = '';
        snap.forEach(d => {
            const p = d.data(); p.id = d.id;
            menuGlobal[p.nombre] = p.ingredientes || [];
            list.innerHTML += `<div style="background:white; padding:10px; margin-bottom:5px; border-radius:8px; display:flex; justify-content:space-between;">
                <span>${p.nombre}</span><button onclick="editarPlato('${p.id}','${p.nombre}',${p.precio},'${p.categoria}','','${(p.ingredientes||[]).join(',')}')">Edit</button>
            </div>`;
        });
    });
}

window.renderizarPlanoMesas = (pedidos) => {
    const grid = document.getElementById('grid-mesas');
    if(!grid) return;
    grid.innerHTML = '';
    const activas = pedidos.filter(p => p.estado !== 'listo' && p.cliente.toLowerCase().includes('mesa'));
    for(let i=1; i<=12; i++){
        const nombre = `Mesa ${i}`;
        const ocupada = activas.find(p => p.cliente.toLowerCase() === nombre.toLowerCase());
        grid.innerHTML += `
            <div class="mesa-card ${ocupada?'mesa-ocupada':''}" 
                 onclick="${ocupada ? `verPedidoDeMesa('${nombre}')` : ''}" 
                 style="${ocupada ? 'cursor:pointer;' : 'cursor:default;'}">
                <strong>${nombre}</strong><br>
                <small>${ocupada ? 'Ocupada - $' + ocupada.total.toLocaleString() : 'Libre'}</small>
            </div>`;
    }
};

window.imprimirComanda = (pJson) => {
    const p = JSON.parse(decodeURIComponent(pJson));
    const win = window.open('', '', 'width=300,height=600');
    win.document.write(`<h3>IKU</h3><hr>${p.cliente}<br>${p.items.map(i=>i.nombre).join('<br>')}`);
    win.print(); win.close();
};
