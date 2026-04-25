onSnapshot(query(collection(db, "platos"), orderBy("timestamp", "desc")), (sn) => {
    const cats = { diario: '', rapida: '', varios: '' };
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = 'none';

    // LIMPIEZA INICIAL: Asegúrate de vaciar los divs antes de llenarlos
    ['diario', 'rapida', 'varios'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = ''; 
    });

    sn.docs.forEach(docSnap => {
        const d = docSnap.data();
        if (d.disponible === false) return; // Esto oculta los no disponibles correctamente

        const html = `
            <div class="dish-item">
                <div class="dish-header" onclick="toggleDish(this)">
                    <div>
                        <h3>${d.nombre}</h3>
                        <p class="dish-desc-short">${d.descripcion || ''}</p>
                    </div>
                    <strong class="dish-price">$${d.precio.toLocaleString()}</strong>
                </div>
                <div class="expand-content">
                    <input type="text" id="note-${docSnap.id}" class="note-input" placeholder="¿Alguna nota especial (sin cebolla, etc)?">
                    <button class="btn-add-cart" onclick="agregarAlCarrito('${d.nombre}', ${d.precio}, '${docSnap.id}')">
                        AÑADIR AL PEDIDO
                    </button>
                </div>
            </div>`;
        
        if (cats.hasOwnProperty(d.categoria)) {
            cats[d.categoria] += html;
        }
    });

    // Inyectar el contenido final
    Object.keys(cats).forEach(cat => {
        const container = document.getElementById(cat);
        if(container) {
            container.innerHTML = cats[cat] || '<p class="empty-msg">No hay platos disponibles.</p>';
        }
    });
});
