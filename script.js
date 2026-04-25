import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

let carrito = [];

window.toggleCart = () => {
    document.getElementById('cart-modal').classList.toggle('open');
};

window.agregarAlCarrito = (nombre, precio, id) => {
    const nota = document.getElementById(`note-${id}`).value;
    const producto = {
        nombre: nombre,
        precio: parseInt(precio),
        nota: nota
    };
    carrito.push(producto);
    document.getElementById(`note-${id}`).value = '';
    actualizarInterfazCarrito();
};

function actualizarInterfazCarrito() {
    const contenedor = document.getElementById('cart-items');
    const badge = document.querySelector('.cart-count');
    const totalLabel = document.getElementById('cart-total-price');
    badge.innerText = carrito.length;
    contenedor.innerHTML = '';
    let total = 0;

    carrito.forEach((item, index) => {
        total += item.precio;
        contenedor.innerHTML += `
            <div class="cart-item">
                <div style="display:flex; justify-content:space-between">
                    <h4>${item.nombre}</h4>
                    <span>$${item.precio}</span>
                </div>
                ${item.nota ? `<p class="cart-item-note">Nota: ${item.nota}</p>` : ''}
                <button onclick="eliminarDelCarrito(${index})" style="background:none; border:none; color:red; font-size:0.7rem; cursor:pointer;">Quitar</button>
            </div>
        `;
    });

    totalLabel.innerText = new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(total);
}

window.eliminarDelCarrito = (index) => {
    carrito.splice(index, 1);
    actualizarInterfazCarrito();
};

// --- NUEVA FUNCIÓN: ENVIAR AL PANEL DE ADMIN ---
window.enviarPedido = async () => {
    const nombreCliente = prompt("Por favor, ingresa tu nombre o número de mesa:");
    
    if (!nombreCliente) return alert("Necesitamos un nombre para procesar el pedido.");
    if (carrito.length === 0) return alert("El carrito está vacío.");

    let total = carrito.reduce((sum, item) => sum + item.precio, 0);

    try {
        await addDoc(collection(db, "pedidos"), {
            cliente: nombreCliente,
            items: carrito,
            total: total,
            estado: "pendiente",
            timestamp: serverTimestamp()
        });
        
        alert("¡Pedido enviado con éxito! En IKU ya estamos trabajando en él.");
        carrito = [];
        actualizarInterfazCarrito();
        toggleCart();
    } catch (error) {
        alert("Error al enviar el pedido: " + error.message);
    }
};

// Renderizado del menú (se mantiene igual que antes)
const renderMenu = () => {
    const q = query(collection(db, "platos"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        const categories = { diario: '', rapida: '', varios: '' };
        document.getElementById('loader').style.display = 'none';
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const formattedPrice = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(data.precio);
            const dishHTML = `
                <div class="dish-item">
                    <div class="dish-header" onclick="this.parentElement.classList.toggle('expanded')">
                        <h3>${data.nombre}</h3>
                        <span class="price">${formattedPrice}</span>
                    </div>
                    <div class="expand-content">
                        <p class="description">${data.descripcion || ''}</p>
                        <div class="order-controls">
                            <input type="text" id="note-${id}" class="note-input" placeholder="Personaliza tu plato...">
                            <button class="btn-add-cart" onclick="agregarAlCarrito('${data.nombre}', '${data.precio}', '${id}')">Agregar</button>
                        </div>
                    </div>
                </div>`;
            if (categories[data.categoria] !== undefined) categories[data.categoria] += dishHTML;
        });
        Object.keys(categories).forEach(cat => { document.getElementById(cat).innerHTML = categories[cat] || '<p>Próximamente...</p>'; });
    });
};
renderMenu();
