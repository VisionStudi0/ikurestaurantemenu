import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

let carrito = [];

// Iconos SVG para usar en el JS
const ICON_CLOSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
const ICON_TRASH = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const ICON_WHATSAPP = `<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.122.554 4.197 1.606 6.023L0 24l6.117-1.605a11.803 11.803 0 005.925 1.586h.005c6.631 0 12.026-5.391 12.03-12.03a11.85 11.85 0 00-3.534-8.482z"/></svg>`;

// Inicializar el carrito y el Modal (X en el header)
document.querySelector('.close-cart').innerHTML = ICON_CLOSE;

const toastDiv = document.createElement('div');
toastDiv.id = 'toast';
document.body.appendChild(toastDiv);

const mostrarNotificacion = (msj) => {
    toastDiv.innerText = msj;
    toastDiv.classList.add("show");
    setTimeout(() => toastDiv.classList.remove("show"), 3000);
};

window.toggleDish = (header) => {
    const dish = header.parentElement;
    const isOpened = dish.classList.contains('expanded');
    document.querySelectorAll('.dish-item').forEach(i => i.classList.remove('expanded'));
    if (!isOpened) dish.classList.add('expanded');
};

window.toggleCart = () => document.getElementById('cart-modal').classList.toggle('open');

window.agregarAlCarrito = (nombre, precio, id) => {
    const nota = document.getElementById(`note-${id}`)?.value || "";
    carrito.push({ nombre, precio: parseInt(precio), nota });
    if(document.getElementById(`note-${id}`)) document.getElementById(`note-${id}`).value = '';
    actualizarCarrito();
    mostrarNotificacion(`Añadido: ${nombre} 🛒`);
};

function actualizarCarrito() {
    const cont = document.getElementById('cart-items');
    const priceEl = document.getElementById('cart-total-price');
    document.getElementById('cart-count').innerText = carrito.length;
    
    if(!cont) return;
    cont.innerHTML = '';
    let total = 0;
    
    carrito.forEach((item, i) => {
        total += item.precio;
        cont.innerHTML += `
            <div class="cart-item-row">
                <div class="cart-item-info">
                    <strong>${item.nombre}</strong>
                    <span style="color:var(--success); font-weight:600; font-size:0.9rem;">$${item.precio.toLocaleString()}</span>
                    ${item.nota ? `<span class="cart-item-note">Nota: ${item.nota}</span>` : ''}
                </div>
                <button onclick="quitar(${i})" class="btn-remove-item" title="Quitar producto">
                    ${ICON_TRASH}
                </button>
            </div>`;
    });
    
    priceEl.innerText = `$${total.toLocaleString()}`;
    
    // Actualizar botón de envío si el carrito cambia
    const btnSend = document.querySelector('.btn-send-order');
    if (btnSend) {
        btnSend.innerHTML = `${ICON_WHATSAPP} <span>CONFIRMAR PEDIDO</span>`;
    }
}

window.quitar = (i) => { carrito.splice(i, 1); actualizarCarrito(); };

window.enviarPedido = async () => {
    const cliente = document.getElementById('nombre-cliente')?.value;
    const tipo = document.getElementById('tipo-servicio')?.value;
    const quiereWA = document.getElementById('check-whatsapp')?.checked;

    if (!cliente || carrito.length === 0) return alert("Por favor, ingresa tus datos y añade productos.");

    const total = carrito.reduce((s, x) => s + x.precio, 0);
    try {
        await addDoc(collection(db, "pedidos"), {
            cliente, tipo, items: carrito, total, estado: "pendiente", timestamp: serverTimestamp()
        });
        
        if (quiereWA) {
            const msjWA = `*NUEVO PEDIDO IKU*%0A------------------%0A*Cliente:* ${cliente}%0A*Tipo:* ${tipo.toUpperCase()}%0A*Items:*%0A${carrito.map(i => `- ${i.nombre} (${i.nota || 'Sin notas'})`).join('%0A')}%0A%0A*TOTAL:* $${total.toLocaleString()}`;
            window.open(`https://wa.me/573210000000?text=${msjWA}`); 
        }
        
        mostrarNotificacion("¡Pedido enviado con éxito! 🧑‍🍳");
        carrito = []; actualizarCarrito(); window.toggleCart();
    } catch (e) { alert("Error al procesar el pedido."); }
};

onSnapshot(query(collection(db, "platos"), orderBy("timestamp", "desc")), (sn) => {
    const sections = { diario: document.getElementById('diario'), rapida: document.getElementById('rapida'), varios: document.getElementById('varios') };
    Object.values(sections).forEach(s => { if(s) s.innerHTML = ''; });
    document.getElementById('loader').style.display = 'none';

    sn.docs.forEach(docSnap => {
        const d = docSnap.data();
        if (d.disponible === false) return;

        let listaIng = Array.isArray(d.ingredientes) ? d.ingredientes : (d.ingredientes ? d.ingredientes.split(',') : []);
        let ingHTML = '';
        if (listaIng.length > 0 && listaIng[0].trim() !== "") {
            ingHTML = `<div class="ing-container">${listaIng.map(ing => ing.trim() ? `<span class="ing-pill">${ing.trim()}</span>` : '').join('')}</div>`;
        }

        const html = `
            <div class="dish-item">
                <div class="dish-header" onclick="toggleDish(this)">
                    <div><h3>${d.nombre}</h3><p style="font-size:0.85rem; color:#777;">${d.descripcion || ''}</p></div>
                    <strong class="dish-price">$${Number(d.precio).toLocaleString()}</strong>
                </div>
                <div class="expand-content">
                    ${ingHTML}
                    <input type="text" id="note-${docSnap.id}" class="note-input" placeholder="¿Alguna nota especial?">
                    <button class="btn-add-cart" onclick="agregarAlCarrito('${d.nombre}', '${d.precio}', '${docSnap.id}')">AÑADIR AL PEDIDO</button>
                </div>
            </div>`;
        if (sections[d.categoria]) sections[d.categoria].innerHTML += html;
    });
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    };
});
