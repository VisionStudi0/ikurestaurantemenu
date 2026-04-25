import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

let carrito = [];
const SOUND_POP = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-pop-up-alert-notification-2357.mp3');

document.addEventListener('click', () => { SOUND_POP.play().then(() => { SOUND_POP.pause(); SOUND_POP.currentTime = 0; }); }, { once: true });

window.toggleDish = (header) => {
    const dish = header.parentElement;
    const isOpened = dish.classList.contains('expanded');
    document.querySelectorAll('.dish-item').forEach(i => i.classList.remove('expanded'));
    if (!isOpened) dish.classList.add('expanded');
};

window.ajustarCant = (id, d) => {
    const el = document.getElementById(`cant-${id}`);
    let c = parseInt(el.innerText) + d;
    if(c < 1) c = 1; el.innerText = c;
};

window.agregarAlCarrito = (nombre, precio, id) => {
    const cant = parseInt(document.getElementById(`cant-${id}`).innerText);
    const excluidos = Array.from(document.querySelectorAll(`#dish-${id} .ing-pill.excluido`)).map(el => el.innerText);
    
    carrito.push({ nombre, precio: Number(precio), cantidad: cant, excluidos });
    
    document.getElementById(`cant-${id}`).innerText = "1";
    document.querySelectorAll(`#dish-${id} .ing-pill.excluido`).forEach(el => el.classList.remove('excluido'));
    
    SOUND_POP.currentTime = 0; SOUND_POP.play();
    const fab = document.querySelector('.cart-fab');
    fab.classList.add('cart-bounce'); setTimeout(() => fab.classList.remove('cart-bounce'), 300);
    
    actualizarCarrito();
};

function actualizarCarrito() {
    const cont = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total-price');
    const countEl = document.getElementById('cart-count');
    let total = 0, itemsCount = 0;
    
    cont.innerHTML = '';
    carrito.forEach((item, i) => {
        total += (item.precio * item.cantidad);
        itemsCount += item.cantidad;
        cont.innerHTML += `<div style="padding:10px; border-bottom:1px solid #eee;">
            <strong>${item.cantidad}x ${item.nombre}</strong> - $${(item.precio * item.cantidad).toLocaleString()}<br>
            ${item.excluidos.length ? `<small style="color:red">Sin: ${item.excluidos.join(', ')}</small>` : ''}
            <button onclick="quitar(${i})" style="float:right; color:red; border:none; background:none;">Eliminar</button>
        </div>`;
    });
    totalEl.innerText = `$${total.toLocaleString()}`;
    countEl.innerText = itemsCount;
}

window.quitar = (i) => { carrito.splice(i, 1); actualizarCarrito(); };
window.toggleCart = () => document.getElementById('cart-modal').classList.toggle('open');

window.enviarPedido = async () => {
    const cliente = document.getElementById('nombre-cliente').value;
    if(!cliente || carrito.length === 0) return alert("Faltan datos");
    
    const itemsEnvio = [];
    carrito.forEach(c => { for(let i=0; i<c.cantidad; i++) itemsEnvio.push({ nombre: c.nombre, precio: c.precio, excluidos: c.excluidos }); });
    
    const total = carrito.reduce((a, b) => a + (b.precio * b.cantidad), 0);
    await addDoc(collection(db, "pedidos"), { cliente, tipo: "mesa", items: itemsEnvio, total, estado: "pendiente", timestamp: serverTimestamp() });
    
    alert("Pedido enviado con éxito");
    carrito = []; actualizarCarrito(); toggleCart();
};

onSnapshot(collection(db, "platos"), (snap) => {
    const secciones = { diario: document.getElementById('diario'), rapida: document.getElementById('rapida'), varios: document.getElementById('varios') };
    Object.values(secciones).forEach(s => s.innerHTML = '');
    document.getElementById('loader').style.display = 'none';

    snap.forEach(docSnap => {
        const d = docSnap.data(); if(d.disponible === false) return;
        const html = `
        <div class="dish-item" id="dish-${docSnap.id}">
            <div class="dish-header" onclick="toggleDish(this)">
                <div><h3>${d.nombre}</h3><p style="font-size:0.8rem; color:#666;">${d.descripcion||''}</p></div>
                <strong class="dish-price">$${d.precio.toLocaleString()}</strong>
            </div>
            <div class="expand-content">
                ${d.ingredientes?.length ? `<div style="display:flex; justify-content:space-between;"><small>Ingredientes:</small><span class="ing-instruction">Toca para quitar</span></div><div class="ing-container">${d.ingredientes.map(i => `<span class="ing-pill" onclick="event.stopPropagation(); this.classList.toggle('excluido')">${i}</span>`).join('')}</div>` : ''}
                <div class="qty-wrapper">
                    <button onclick="ajustarCant('${docSnap.id}', -1)" class="btn-qty">-</button>
                    <span id="cant-${docSnap.id}">1</span>
                    <button onclick="ajustarCant('${docSnap.id}', 1)" class="btn-qty">+</button>
                </div>
                <button class="btn-add-cart" onclick="agregarAlCarrito('${d.nombre}', ${d.precio}, '${docSnap.id}')">AÑADIR</button>
            </div>
        </div>`;
        if(secciones[d.categoria]) secciones[d.categoria].innerHTML += html;
    });
});
