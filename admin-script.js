import { db, auth } from './firebase-config.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const correos = ["cb01grupo@gmail.com", "kelly.araujotafur@gmail.com"];

window.login = () => signInWithPopup(auth, new GoogleAuthProvider());

onAuthStateChanged(auth, (user) => {
    if (user && correos.includes(user.email)) {
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('login-screen').style.display = 'none';
        escucharPedidos();
        escucharMenu();
    }
});

function escucharPedidos() {
    const q = query(collection(db, "pedidos"), orderBy("timestamp", "desc"));
    onSnapshot(q, (sn) => {
        const cont = document.getElementById('lista-pedidos-realtime');
        cont.innerHTML = '';
        sn.docs.forEach(d => {
            const p = d.data();
            const card = document.createElement('div');
            card.style = "background:white; padding:15px; margin-bottom:10px; border-radius:8px; color:black; border-left:8px solid " + (p.estado == 'pendiente' ? '#ffcc00' : '#28a745');
            card.innerHTML = `
                <h4>Mesa/Cliente: ${p.cliente}</h4>
                <ul>${p.items.map(i => `<li>${i.nombre} (${i.nota})</li>`).join('')}</ul>
                <p>Total: $${p.total}</p>
                <button onclick="completar('${d.id}')" style="background:green; color:white; padding:5px; border:none; cursor:pointer;">LISTO</button>
                <button onclick="borrarP('${d.id}')" style="background:red; color:white; padding:5px; border:none; cursor:pointer;">X</button>
            `;
            cont.appendChild(card);
        });
    });
}

window.completar = (id) => updateDoc(doc(db, "pedidos", id), { estado: "completado" });
window.borrarP = (id) => deleteDoc(doc(db, "pedidos", id));

// (Aquí incluirías también la lógica de añadir platos que ya teníamos)
