import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

let carrito = [];

// --- NOTIFICACIÓN TOAST ---
const toastDiv = document.createElement('div');
toastDiv.id = 'toast';
document.body.appendChild(toastDiv);

const mostrarNotificacion = (mensaje) => {
    toastDiv.innerText = mensaje;
    toastDiv.classList.add("show");
    setTimeout(() => { toastDiv.classList.remove("show"); }, 3000);
};

// --- ACORDEÓN ---
window.toggleDish = (header) => {
    const dish = header.parentElement;
    const isOpened = dish.classList.contains('expanded');
    document.querySelectorAll('.dish-item').forEach(i => i.classList.remove('expanded'));
    if (!isOpened) dish.classList.add('expanded');
};

// --- CARRITO ---
window.toggleCart = () => document.getElementById('cart-modal').classList.toggle('open');

window.agregarAlCarrito = (nombre, precio, id) => {
    const nota = document.getElementById(`note-${id}`).value;
    carrito.push({ nombre, precio: parseInt(precio), nota });
    document.getElementById(`note-${id}`).value = '';
    actualizarCarrito();
    mostrarNotificacion(`Añadido: ${nombre} 🛒`); 
};

function actualizarCarrito() {
    const cont = document.getElementById('cart-items');
    document.getElementById('cart-count').innerText = carrito.length;
    cont.innerHTML = '';
    let total = 0;
    carrito.forEach((item, i) => {
        total += item.precio;
        cont.innerHTML += `
            <div style="border-bottom:1px solid #eee; padding:15px 0;">
                <div style="display:flex; justify-content:space-between;"><strong>${item.nombre}</strong> <span>$${item.precio}</span></div>
                ${item.nota ? `<p style="font-size:0.8rem; color:#666;">Nota: ${item.nota}</p>` : ''}
                <button onclick="quitar(${i})" style="color:red; background:none; border:none; cursor:pointer; font-size:0.8rem;">Quitar</button>
            </div>`;
    });
    document.getElementById('cart-total-price').innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total);
}

window.quitar = (i) => { carrito.splice(i, 1); actualizarCarrito(); };

// --- ENVIAR PEDIDO (FIREBASE + OPCIONAL WHATSAPP) ---
window.enviarPedido = async () => {
    const mesaDireccion = document.getElementById('nombre-cliente').value;
    const tipoServicio = document.getElementById('tipo-servicio').value;
    const quiereWhatsApp = document.getElementById('check-whatsapp').checked;

    if (!mesaDireccion || carrito.length === 0) {
        alert("Por favor ingresa tu nombre y ubicación (Mesa o Dirección)");
        return;
    }
    
    const total = carrito.reduce((s, x) => s + x.precio, 0);
    
    try {
        // 1. Siempre se guarda en Firebase para que Kelly lo vea en el Dashboard
        await addDoc(collection(db, "pedidos"), {
            cliente: mesaDireccion,
            tipo: tipoServicio, // "mesa" o "domicilio"
            items: carrito,
            total: total,
            estado: "pendiente",
            timestamp: serverTimestamp()
        });

        // 2. Si marcó WhatsApp, abrimos el link
        if (quiereWhatsApp) {
            const textoWA = `*IKU - NUEVO PEDIDO*%0A------------------%0A*Tipo:* ${tipoServicio.toUpperCase()}%0A*Cliente/Ubicación:* ${mesaDireccion}%0A*Items:*%0A${carrito.map(i => `- ${i.nombre} (${i.nota || 'Sin notas'})`).join('%0A')}%0A%0A*Total:* $${total}`;
            const numeroIKU = "573210000000"; // PON TU NÚMERO AQUÍ
            window.open(`https://wa.me/${numeroIKU}?text=${textoWA}`);
        }

        mostrarNotificacion("¡Tu pedido estará listo muy pronto! 🧑‍🍳"); 
        carrito = []; 
        actualizarCarrito(); 
        toggleCart();
    } catch (e) { 
        mostrarNotificacion("Error al enviar pedido."); 
    }
};

// --- RENDER MENU ---
onSnapshot(query(collection(db, "platos"), orderBy("timestamp", "desc")), (sn) => {
    const cats = { diario: '', rapida: '', varios: '' };
    document.getElementById('loader').style.display = 'none';
    sn.docs.forEach(doc => {
        const d = doc.data();
        if (d.disponible === false) return;
        const html = `<div class="dish-item"><div class="dish-header" onclick="toggleDish(this)"><h3>${d.nombre}</h3> <strong>$${d.precio}</strong></div><div class="expand-content"><p style="font-size:0.9rem; color:#555; margin-bottom:10px;">${d.descripcion || ''}</p><input type="text" id="note-${doc.id}" class="note-input" placeholder="¿Alguna nota?"><button class="btn-add-cart" onclick="agregarAlCarrito('${d.nombre}', '${d.precio}', '${doc.id}')">AÑADIR AL PEDIDO</button></div></div>`;
        if (cats[d.categoria] !== undefined) cats[d.categoria] += html;
    });
    ['diario','rapida','varios'].forEach(c => document.getElementById(c).innerHTML = cats[c] || '<p style="text-align:center; padding:20px;">Próximamente...</p>');
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    };
});
