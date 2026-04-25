import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

let carrito = [];

const toastDiv = document.createElement('div');
toastDiv.id = 'toast';
document.body.appendChild(toastDiv);

const mostrarNotificacion = (mensaje) => {
    toastDiv.innerText = mensaje;
    toastDiv.classList.add("show");
    setTimeout(() => { toastDiv.classList.remove("show"); }, 3000);
};

// Función para abrir/cerrar platos (Acordeón)
window.toggleDish = (header) => {
    const dish = header.parentElement;
    const isOpened = dish.classList.contains('expanded');
    document.querySelectorAll('.dish-item').forEach(i => i.classList.remove('expanded'));
    if (!isOpened) dish.classList.add('expanded');
};

// Función para abrir/cerrar carrito
window.toggleCart = () => {
    const modal = document.getElementById('cart-modal');
    if(modal) modal.classList.toggle('open');
};

window.agregarAlCarrito = (nombre, precio, id) => {
    const notaEl = document.getElementById(`note-${id}`);
    const nota = notaEl ? notaEl.value : "";
    carrito.push({ nombre, precio: parseInt(precio), nota });
    if(notaEl) notaEl.value = '';
    actualizarCarrito();
    mostrarNotificacion(`Añadido: ${nombre} 🛒`); 
};

function actualizarCarrito() {
    const cont = document.getElementById('cart-items');
    const countEl = document.getElementById('cart-count');
    const priceEl = document.getElementById('cart-total-price');
    
    if(countEl) countEl.innerText = carrito.length;
    if(!cont) return;
    
    cont.innerHTML = '';
    let total = 0;
    
    carrito.forEach((item, i) => {
        total += item.precio;
        cont.innerHTML += `
            <div style="border-bottom:1px solid #eee; padding:15px 0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${item.nombre}</strong> 
                    <span>$${item.precio.toLocaleString()}</span>
                </div>
                ${item.nota ? `<p style="font-size:0.8rem; color:#666; font-style:italic; margin-top:4px;">Nota: ${item.nota}</p>` : ''}
                <button onclick="quitar(${i})" style="color:#ff4444; background:none; border:none; cursor:pointer; font-size:0.8rem; margin-top:8px; font-weight:600;">Remover</button>
            </div>`;
    });
    
    if(priceEl) priceEl.innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total);
}

window.quitar = (i) => { carrito.splice(i, 1); actualizarCarrito(); };

window.enviarPedido = async () => {
    const mesaDireccion = document.getElementById('nombre-cliente')?.value;
    const tipoServicio = document.getElementById('tipo-servicio')?.value;
    const quiereWhatsApp = document.getElementById('check-whatsapp')?.checked;

    if (!mesaDireccion || carrito.length === 0) { 
        alert("Por favor ingresa tu nombre/mesa y añade productos."); 
        return; 
    }

    const total = carrito.reduce((s, x) => s + x.precio, 0);
    
    try {
        await addDoc(collection(db, "pedidos"), {
            cliente: mesaDireccion,
            tipo: tipoServicio,
            items: carrito,
            total: total,
            estado: "pendiente",
            timestamp: serverTimestamp()
        });

        if (quiereWhatsApp) {
            const textoWA = `*IKU - NUEVO PEDIDO*%0A*Cliente:* ${mesaDireccion}%0A*Items:*%0A${carrito.map(i => `- ${i.nombre}`).join('%0A')}%0A*Total:* $${total.toLocaleString()}`;
            window.open(`https://wa.me/573210000000?text=${textoWA}`); // Cambia el numero aqui
        }

        mostrarNotificacion("¡Pedido enviado! 🧑‍🍳"); 
        carrito = []; 
        actualizarCarrito(); 
        window.toggleCart();
    } catch (e) { 
        mostrarNotificacion("Error al conectar con cocina."); 
    }
};

// ESCUCHAR DATOS DE FIREBASE Y RENDERIZAR POR CATEGORÍA
onSnapshot(query(collection(db, "platos"), orderBy("timestamp", "desc")), (sn) => {
    const sections = {
        diario: document.getElementById('diario'),
        rapida: document.getElementById('rapida'),
        varios: document.getElementById('varios')
    };

    // Limpiar antes de cargar
    Object.values(sections).forEach(s => { if(s) s.innerHTML = ''; });

    const loader = document.getElementById('loader');
    if(loader) loader.style.display = 'none';

    sn.docs.forEach(docSnap => {
        const d = docSnap.data();
        if (d.disponible === false) return; 

        const html = `
            <div class="dish-item">
                <div class="dish-header" onclick="toggleDish(this)">
                    <div>
                        <h3>${d.nombre}</h3>
                        <p style="font-size:0.85rem; color:#777;">${d.descripcion || ''}</p>
                    </div>
                    <strong class="dish-price">$${Number(d.precio).toLocaleString()}</strong>
                </div>
                <div class="expand-content">
                    <input type="text" id="note-${docSnap.id}" class="note-input" placeholder="¿Nota especial? (Ej: sin cebolla)">
                    <button class="btn-add-cart" onclick="agregarAlCarrito('${d.nombre}', '${d.precio}', '${docSnap.id}')">AÑADIR AL PEDIDO</button>
                </div>
            </div>`;
        
        if (sections[d.categoria]) {
            sections[d.categoria].innerHTML += html;
        }
    });

    // Mensaje si no hay platos
    Object.keys(sections).forEach(key => {
        if (sections[key] && sections[key].innerHTML === '') {
            sections[key].innerHTML = '<p style="text-align:center; padding:30px; color:#999; font-size:0.9rem;">No hay platos disponibles en esta categoría.</p>';
        }
    });
});

// LOGICA DE LAS PESTAÑAS (TABS)
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        document.getElementById(targetId).classList.add('active');
    };
});
