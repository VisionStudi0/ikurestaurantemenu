import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, addDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const correos = ["cb01grupo@gmail.com", "kelly.araujotafur@gmail.com"];
let totalPendientesAnterior = 0;

const sonar = () => {
    const audio = document.getElementById('notif-sound');
    if(audio) audio.play().catch(e => console.log("Sonido bloqueado"));
};

const escucharData = () => {
    onSnapshot(query(collection(db, "pedidos"), orderBy("timestamp", "desc")), (sn) => {
        const lp = document.getElementById('l-pendientes');
        const la = document.getElementById('l-atendidos');
        const sHoy = document.getElementById('s-hoy');
        const sMes = document.getElementById('s-mes');
        const hBody = document.getElementById('historial-body');

        let pendCount = 0, hoy = 0, mesActualTotal = 0;
        const historialMeses = {}; 
        const ahora = new Date();
        const mesActualKey = `${ahora.getMonth() + 1}-${ahora.getFullYear()}`;

        if(lp) lp.innerHTML = ''; 
        if(la) la.innerHTML = '';

        sn.docs.forEach(d => {
            const p = d.data();
            const id = d.id;
            const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.total);

            if(p.estado === 'pendiente') {
                pendCount++;
                const badgeStyle = p.tipo === 'domicilio' ? 'background: #fff3cd; color: #856404;' : 'background: #d1ecf1; color: #0c5460;';
                lp.innerHTML += `
                    <div class="pedido-card">
                        <span style="font-size: 0.65rem; padding: 4px 10px; border-radius: 20px; font-weight: bold; ${badgeStyle}">${p.tipo.toUpperCase()}</span>
                        <div style="margin: 10px 0;"><strong>👤 ${p.cliente}</strong></div>
                        <p style="font-size:0.85rem; color:#555;">${p.items.map(i=>i.nombre).join(', ')}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                            <strong style="color:#28a745; font-size:1.1rem;">${fmt}</strong>
                            <button onclick="completar('${id}')" style="background:#28a745; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold;">LISTO</button>
                        </div>
                    </div>`;
            } else if (p.estado === 'completado' && p.timestamp) {
                const f = p.timestamp.toDate();
                const fKey = `${f.getMonth() + 1}-${f.getFullYear()}`;
                
                if(f.toDateString() === ahora.toDateString()) {
                    la.innerHTML += `<div class="atendido-row"><span>${p.cliente}</span><span style="color:#28a745; font-weight:600;">${fmt}</span><button onclick="borrarP('${id}')" style="color:red; background:none; border:none; cursor:pointer;">×</button></div>`;
                    hoy += p.total;
                }

                if(!historialMeses[fKey]) historialMeses[fKey] = { total: 0 };
                historialMeses[fKey].total += p.total;
                if(fKey === mesActualKey) mesActualTotal += p.total;
            }
        });

        if(pendCount > totalPendientesAnterior) sonar();
        totalPendientesAnterior = pendCount;

        if(sHoy) sHoy.innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(hoy);
        if(sMes) sMes.innerText = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(mesActualTotal);
    });
};

const escucharMenu = () => {
    onSnapshot(collection(db, "platos"), (sn) => {
        const inv = document.getElementById('inv-list');
        if(!inv) return;
        inv.innerHTML = '<h4 style="margin-bottom:15px;">Inventario de Platos</h4>';
        sn.docs.forEach(docSnap => {
            const d = docSnap.data();
            inv.innerHTML += `
            <div style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid #f1f1f1; align-items:center;">
                <div>
                    <div style="font-weight:600;">${d.nombre}</div>
                    <div style="font-size:0.75rem; color:#888;">${d.categoria}</div>
                </div>
                <div style="display:flex; gap:15px; align-items:center;">
                    <label class="switch">
                        <input type="checkbox" ${d.disponible !== false ? 'checked' : ''} onchange="toggleStock('${docSnap.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                    <button onclick="prepararEdicion('${docSnap.id}')" style="color:#007bff; border:none; background:none; cursor:pointer; font-weight:600;">Editar</button>
                    <button onclick="borrarM('${docSnap.id}')" style="color:#dc3545; border:none; background:none; cursor:pointer; font-weight:600;">×</button>
                </div>
            </div>`;
        });
    });
};

window.toggleStock = (id, val) => updateDoc(doc(db, "platos", id), { disponible: val });

const mForm = document.getElementById('m-form');
if(mForm) {
    mForm.onsubmit = async (e) => {
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
        if(id) await updateDoc(doc(db, "platos", id), datos);
        else await addDoc(collection(db, "platos"), { ...datos, disponible: true });
        mForm.reset(); window.cancelarEdicion();
    };
}

window.completar = (id) => updateDoc(doc(db, "pedidos", id), { estado: 'completado' });
window.borrarP = (id) => { if(confirm("¿Borrar registro?")) deleteDoc(doc(db, "pedidos", id)); };
window.borrarM = (id) => { if(confirm("¿Eliminar plato?")) deleteDoc(doc(db, "platos", id)); };

window.prepararEdicion = async (id) => {
    const snap = await getDoc(doc(db, "platos", id));
    if(!snap.exists()) return;
    const d = snap.data();
    document.getElementById('edit-id').value = id;
    document.getElementById('name').value = d.nombre;
    document.getElementById('price').value = d.precio;
    document.getElementById('category').value = d.categoria;
    document.getElementById('desc').value = d.descripcion || '';
    document.getElementById('ingredients').value = d.ingredientes ? d.ingredientes.join(',') : '';
    document.getElementById('f-title').innerText = "Editando Plato...";
    document.getElementById('s-btn').innerText = "ACTUALIZAR CAMBIOS";
    document.getElementById('close-x').style.display = "block";
    document.querySelector('.content-area').scrollTo({top:0, behavior:'smooth'});
};

window.cancelarEdicion = () => {
    document.getElementById('edit-id').value = "";
    document.getElementById('f-title').innerText = "Añadir Plato";
    document.getElementById('s-btn').innerText = "PUBLICAR";
    document.getElementById('close-x').style.display = "none";
    if(mForm) mForm.reset();
};

onAuthStateChanged(auth, (u) => {
    const panel = document.getElementById('admin-panel');
    const login = document.getElementById('login-screen');
    if(u && correos.includes(u.email)) {
        panel.style.display = 'flex';
        login.style.display = 'none';
        escucharData(); escucharMenu();
    } else {
        if(u) { alert("No autorizado"); signOut(auth); }
        panel.style.display = 'none';
        login.style.display = 'flex';
    }
});

const lBtn = document.getElementById('login-btn');
if(lBtn) lBtn.onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
