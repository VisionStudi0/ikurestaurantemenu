// ... (Lógica de carrito y pestañas se mantiene igual) ...

window.enviarPedido = () => {
    if (carrito.length === 0) return alert("El carrito está vacío");

    // CAMBIA EL NÚMERO AQUÍ CON TU CELULAR REAL
    let numeroWhatsapp = "573XXXXXXXXX"; 
    let mensaje = "¡Hola IKU Restaurante Bar (Pueblo Bello)! 🍹\nQuiero hacer el siguiente pedido:\n\n";
    let total = 0;

    carrito.forEach(item => {
        mensaje += `• *${item.nombre}* ($${item.precio})\n`;
        if (item.nota) mensaje += `  _Nota: ${item.nota}_\n`;
        total += item.precio;
    });

    mensaje += `\n*TOTAL: $${total}*\n\n¿Me confirman el pedido? Gracias.`;
    const url = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
};

// ... (Resto del script de Firebase igual) ...
