import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, addDoc, getDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const correos = ["cb01grupo@gmail.com", "kelly.araujotafur@gmail.com"];
let totalPAnterior = 0;

// Sonido
const sonar = () => { const a = document.getElementById('notif-sound'); if(a) a.play().catch(e => {}); };

// PROCESAR ESTADÍSTICAS
const procesarEstadisticas = async (pedidos) => {
    const ahora = new Date();
    const mesActual = `${ahora.getMonth() + 1}-${ahora.getFullYear()}`;
    const hoyStr = ahora.toDateString();

    let ventaHoy = 0, ventaMes = 0;
    const conteoGlobal = {}; // { 'Nombre Plato': { cantidad: 0, categoria: '' } }
    const historialMeses = {}; // { 'Mes-Año': { total: 0, platos: {} } }

    // 1. Necesitamos saber la categoría de cada plato para el ranking por sección
    const platosSnap = await getDocs(collection(db, "platos"));
    const catMapa = {};
    platosSnap.forEach(d => { catMapa[d.data().nombre] = d.data().categoria; });

    pedidos.forEach(p => {
        if (p.estado !== 'completado' || !p.timestamp) return;
        
        const fecha = p.timestamp.toDate();
        const mesKey = `${fecha.getMonth() + 1}-${fecha.getFullYear()}`;
        const esHoy = fecha.toDateString() === hoyStr;

        if (esHoy) ventaHoy += p.total;
        if (mesKey === mesActual) ventaMes += p.total;

        // Historial Mensual
        if (!historialMeses[mesKey]) historialMeses[mesKey] = { total: 0, platos: {} };
        historialMeses[mesKey].total += p.total;

        p.items.forEach(item => {
            // Conteo para ranking
            historialMeses[mesKey].platos[item.nombre] = (historialMeses[mesKey].platos[item.nombre] || 0) + 1;
            
            if (mesKey === mesActual) {
                if (!conteoGlobal[item.nombre]) conteoGlobal[item.nombre] = { cantidad: 0, cat: catMapa[item.nombre] || 'varios' };
                conteoGlobal[item.nombre].cantidad++;
            }
        });
    });

    // Actualizar UI de Totales
    const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
    if(document.getElementById('s-hoy')) document.getElementById('s-hoy').innerText = fmt(ventaHoy);
    if(document.getElementById('s-mes')) document.getElementById('s-mes').innerText = fmt(ventaMes);

    // Rankings por Categoría (Este Mes)
    const rankingsDiv = document.getElementById('rankings-categoria');
    if(rankingsDiv) {
        const tops = { diario: { n: '---', c: 0 }, rapida: { n: '---', c: 0 }, varios: { n: '---', c: 0 } };
        
        Object.keys(conteoGlobal).forEach(nombre => {
            const info = conteoGlobal[nombre];
            if (info.cantidad > tops[info.cat].c) {
                tops[info.cat] = { n: nombre, c: info.cantidad };
            }
        });

        rankingsDiv.innerHTML = `
            <div style="border-left:3px solid var(--accent); padding-left:10px;"><strong>Menú del Día</strong><br><small>${tops.diario.n} (${tops.diario.c})</small></div>
            <div style="border-left:3px solid var(--accent); padding-left:10px;"><strong>Comidas Rápidas</strong><br><small>${tops.rapida.n} (${tops.rapida.c})</small></div>
            <div style="border-left:3px solid var(--accent); padding-left:10px;"><strong>Varios</strong><br><small>${tops.varios.n} (${tops.varios.c})</small></div>
        `;
    }

    // Historial Tabla
    const hBody = document.getElementById('historial-meses');
    if(hBody) {
        hBody.innerHTML = '';
        Object.keys(historialMeses).sort().reverse().forEach(mes => {
            const data = historialMeses[mes];
            const topPlato = Object.keys(data.platos).reduce((a, b) => data.platos[a] > data.platos[b] ? a : b, "---");
            hBody.innerHTML += `<tr><td>${mes}</td><td><strong>${fmt(data.total)}</strong></td><td>${topPlato}</td></tr>`;
        });
    }
};

// ESCUCHAR DATOS
const escucharData = () => {
    onSnapshot(query(collection(db, "pedidos"), orderBy("timestamp", "desc")), (sn) => {
        const lp = document.getElementById('l-pendientes');
        const la = document.getElementById('l-atendidos');
        const pedidos = [];
        let pCount = 0;

        lp.innerHTML = ''; la.innerHTML = '';
        const hoyStr = new Date().toDateString();

        sn.docs.forEach(docSnap => {
            const p = docSnap.data();
            pedidos.push(p);

            if (p.estado === 'pendiente') {
                pCount++;
                lp.innerHTML += `
                <div class="pedido-card">
                    <div style="display:flex; justify-content:space-between;"><strong>👤 ${p.cliente}</strong> <small>${p.tipo.toUpperCase()}</small></div>
                    <p style="margin:10px 0;">${p.items.map(i=>i.nombre).join(', ')}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--success); font-weight:bold;">$${p.total.toLocaleString()}</span>
                        <button class="btn-ready" onclick="completar('${docSnap.id}')">LISTO</button>
                    </div>
                </div>`;
            } else if (p.estado === 'completado' && p.timestamp?.toDate().toDateString() === hoyStr) {
                la.innerHTML += `<div class="admin-row"><span>${p.cliente}</span> <span>$${p.total.toLocaleString()}</span></div>`;
            }
        });

        if(pCount > totalPAnterior) sonar();
        totalPAnterior = pCount;
        procesarEstadisticas(pedidos);
    });
};

const escucharMenu = () => {
    onSnapshot(collection(db, "platos"), (sn) => {
        const inv = document.getElementById('inv-list');
        inv.innerHTML = `
            <div class="admin-group"><div class="admin-group-title">Menú del Día</div><div id="adm-diario"></div></div>
            <div class="admin-group"><div class="admin-group-title">Comidas Rápidas</div><div id="adm-rapida"></div></div>
            <div class="admin-group"><div class="admin-group-title">Varios</div><div id="adm-varios"></div></div>
        `;
        sn.docs.forEach(docSnap => {
            const d = docSnap.data();
            const html = `
            <div class="admin-row">
                <span>${d.nombre}</span>
                <div style="display:flex; gap:10px; align-items:center;">
                    <label class="switch"><input type="checkbox" ${d.disponible !== false ? 'checked' : ''} onchange="toggleStock('${docSnap.id}', this.checked)"><span class="slider"></span></label>
                    <button onclick="prepararEdicion('${docSnap.id}')" style="color:blue; border:none; background:none; cursor:pointer;">Edit</button>
                    <button onclick="borrarM('${docSnap.id}')" style="color:red; border:none; background:none; cursor:pointer;">×</button>
                </div>
            </div>`;
            document.getElementById(`adm-${d.categoria}`).innerHTML += html;
        });
    });
};

// FUNCIONES GLOBALES
window.completar = (id) => updateDoc(doc(db, "pedidos", id), { estado: 'completado' });
window.toggleStock = (id, val) => updateDoc(doc(db, "platos", id), { disponible: val });
window.borrarM = (id) => confirm("¿Eliminar?") && deleteDoc(doc(db, "platos", id));

window.prepararEdicion = async (id) => {
    const snap = await getDoc(doc(db, "platos", id));
    const d = snap.data();
    document.getElementById('edit-id').value = id;
    document.getElementById('name').value = d.nombre;
    document.getElementById('price').value = d.precio;
    document.getElementById('category').value = d.categoria;
    document.getElementById('desc').value = d.descripcion || '';
    document.getElementById('ingredients').value = d.ingredientes?.join(',') || '';
    document.getElementById('f-title').innerText = "Editando...";
};

document.getElementById('m-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const datos = {
        nombre: document.getElementById('name').value,
        precio: Number(document.getElementById('price').value),
        categoria: document.getElementById('category').value,
        descripcion: document.getElementById('desc').value,
        ingredientes: document.getElementById('ingredients').value.split(','),
        timestamp: serverTimestamp()
    };
    id ? await updateDoc(doc(db, "platos", id), datos) : await addDoc(collection(db, "platos"), { ...datos, disponible: true });
    document.getElementById('m-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('f-title').innerText = "Gestión de Platos";
};

onAuthStateChanged(auth, (u) => {
    if(u && correos.includes(u.email)) {
        document.getElementById('admin-panel').style.display = 'flex';
        document.getElementById('login-screen').style.display = 'none';
        escucharData(); escucharMenu();
    } else {
        if(u) signOut(auth);
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    }
});

document.getElementById('login-btn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
