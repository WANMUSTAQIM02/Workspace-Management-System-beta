import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = { /* SAMA MACAM FAIL LAIN */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. Dapatkan semua idea secara real-time
const q = query(collection(db, "community_ideas"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
    const container = document.getElementById('idea-container');
    container.innerHTML = "";
    snapshot.forEach(doc => {
        const data = doc.data();
        container.innerHTML += `
            <div class="idea-card">
                <h3>${data.title}</h3>
                <p style="margin: 10px 0; color: var(--text-muted);">${data.description}</p>
                <small>By: ${data.author}</small>
            </div>
        `;
    });
});

// 2. Fungsi hantar idea baru
window.hantarIdea = async function(event) {
    event.preventDefault();
    const title = document.getElementById('idea-title').value;
    const description = document.getElementById('idea-desc').value;
    
    await addDoc(collection(db, "community_ideas"), {
        title, description, 
        author: "User", // Boleh ambil dari profil
        createdAt: serverTimestamp()
    });
    document.getElementById('idea-modal').style.display = 'none';
};