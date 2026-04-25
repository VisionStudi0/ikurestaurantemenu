import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

let carrito = [];

window.toggleCart = () => document.getElementById('cart-modal').classList.toggle('open');

window.agregarAlCarrito = (nombre, precio, id) => {
    const nota = document.getElementById(`note-${id}`).value;
    carrito.push({ nombre, precio: parseInt(precio), nota });
    document.getElementById(`note-${id}`).value = '';
    actualizarCarrito();
    alert(`¡${nombre} añadido!`);
};

function actualizarCarrito() {
    const cont = document.getElementById('cart-items');
    document.getElementById('cart-count').innerText = carrito.length;
    cont.innerHTML = '';
    let total = 0;
    carrito.forEach((item, i) => {
        total += item.precio;
        cont.innerHTML += `<div style="border-bottom:1px solid #eee; padding:10px 0;">
            <strong>${item.nombre}</strong> ($${item.precio})
            <p style="font-size:0.8rem; color:#666">${item.nota}</p>
            <button onclick="quitar(${i})" style="color:red; background:none; border:none; cursor:pointer;">Quitar</button>
        </div>`;
    });
    document.getElementById('cart-total-price').innerText = "$" + total;
}

window.quitar = (i) => { carrito.splice(i, 1); actualizarCarrito(); };

window.enviarPedido = async () => {
    const mesa = prompt("Ingresa tu Nombre o Número de Mesa:");
    if (!mesa || carrito.length === 0) return;
    try {
        await addDoc(collection(db, "pedidos"), {
            cliente: mesa,
            items: carrito,
            total: carrito.reduce((s, x) => s + x.precio, 0),
            estado: "pendiente",
            timestamp: serverTimestamp()
        });
        alert("Pedido recibido en IKU.");
        carrito = [];
        actualizarCarrito();
        toggleCart();
    } catch (e) { alert("Error al pedir."); }
};

const q = query(collection(db, "platos"), orderBy("timestamp", "desc"));
onSnapshot(q, (sn) => {
    const cats = { diario: '', rapida: '', varios: '' };
    document.getElementById('loader').style.display = 'none';
    sn.docs.forEach(doc => {
        const d = doc.data();
        const html = `
            <div class="dish-item" onclick="this.classList.toggle('expanded')">
                <div class="dish-header"><h3>${d.nombre}</h3> <strong>$${d.precio}</strong></div>
                <div class="expand-content">
                    <p>${d.descripcion || ''}</p>
                    <input type="text" id="note-${doc.id}" class="note-input" placeholder="Notas...">
                    <button class="btn-add-cart" onclick="event.stopPropagation(); agregarAlCarrito('${d.nombre}', '${d.precio}', '${doc.id}')">PEDIR ESTE PLATO</button>
                </div>
            </div>`;
        cats[d.categoria] += html;
    });
    ['diario','rapida','varios'].forEach(c => document.getElementById(c).innerHTML = cats[c] || '<p>Viene pronto...</p>');
});

// Lógica de Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    };
});
