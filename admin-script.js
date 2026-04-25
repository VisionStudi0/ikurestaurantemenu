import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, addDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

const correos = ["cb01grupo@gmail.com", "kelly.araujotafur@gmail.com"];

const escucharMenu = () => {
    onSnapshot(collection(db, "platos"), (sn) => {
        const inv = document.getElementById('inv-list');
        if(!inv) return;
        
        // Estructura de grupos en el Admin
        inv.innerHTML = `
            <div class="admin-category-group">
                <h4 style="background:#eee; padding:10px; border-radius:5px; margin:20px 0 10px 0;">📅 MENÚ DEL DÍA</h4>
                <div id="inv-diario"></div>
            </div>
            <div class="admin-category-group">
                <h4 style="background:#eee; padding:10px; border-radius:5px; margin:20px 0 10px 0;">🍔 COMIDAS RÁPIDAS</h4>
                <div id="inv-rapida"></div>
            </div>
            <div class="admin-category-group">
                <h4 style="background:#eee; padding:10px; border-radius:5px; margin:20px 0 10px 0;">✨ VARIOS</h4>
                <div id="inv-varios"></div>
            </div>
        `;

        sn.docs.forEach(docSnap => {
            const d = docSnap.data();
            const html = `
            <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; align-items:center;">
                <span><strong>${d.nombre}</strong></span>
                <div style="display:flex; gap:10px; align-items:center;">
                    <label class="switch">
                        <input type="checkbox" ${d.disponible !== false ? 'checked' : ''} onchange="toggleStock('${docSnap.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                    <button onclick="prepararEdicion('${docSnap.id}')" style="color:blue; border:none; background:none; cursor:pointer;">Editar</button>
                    <button onclick="borrarM('${docSnap.id}')" style="color:red; border:none; background:none; cursor:pointer;">X</button>
                </div>
            </div>`;

            const container = document.getElementById(`inv-${d.categoria}`);
            if(container) container.innerHTML += html;
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
window.borrarP = (id) => { if(confirm("¿Borrar pedido?")) deleteDoc(doc(db, "pedidos", id)); };
window.borrarM = (id) => { if(confirm("¿Borrar plato?")) deleteDoc(doc(db, "platos", id)); };

window.prepararEdicion = async (id) => {
    const snap = await getDoc(doc(db, "platos", id));
    const d = snap.data();
    document.getElementById('edit-id').value = id;
    document.getElementById('name').value = d.nombre;
    document.getElementById('price').value = d.precio;
    document.getElementById('category').value = d.categoria;
    document.getElementById('desc').value = d.descripcion || '';
    document.getElementById('ingredients').value = d.ingredientes.join(',');
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
    if(u && correos.includes(u.email)) {
        document.getElementById('admin-panel').style.display = 'flex';
        document.getElementById('login-screen').style.display = 'none';
        escucharMenu();
        // Nota: Asegúrate de tener la función escucharData para los pedidos también
    } else {
        if(u) { alert("Sin acceso"); signOut(auth); }
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    }
});

const lBtn = document.getElementById('login-btn');
if(lBtn) lBtn.onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
window.cerrarSesion = () => signOut(auth);
