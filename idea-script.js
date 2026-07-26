import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", 
    authDomain: "ot-tracker-pro-64415.firebaseapp.com", 
    projectId: "ot-tracker-pro-64415" 
};
const app = initializeApp(firebaseConfig); 
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserName = "User";
let currentUserUid = null; 
let ideaToDeleteId = null; // Variable simpan ID sementara untuk fungsi Delete Modal

// Ambil profil & UID user dari Firestore
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid; 
        try {
            const userDocRef = doc(db, "users_ot", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                currentUserName = data.nicknameProfile || data.nickName || user.email.split('@')[0];
            } else {
                currentUserName = user.email.split('@')[0];
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            currentUserName = user.email.split('@')[0];
        }
    } else {
        window.location.replace("login.html");
    }
});

function initPremiumUI() {
    const canvas = document.getElementById('bg-canvas');
    if(canvas && typeof THREE !== 'undefined') {
        const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight);
        const geom = new THREE.BufferGeometry(); const posArray = new Float32Array(500 * 3);
        for(let i=0; i<500*3; i++) posArray[i] = (Math.random() - 0.5) * 10;
        geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const mat = new THREE.PointsMaterial({ size: 0.005, color: 0x0d6efd }); const mesh = new THREE.Points(geom, mat); scene.add(mesh); camera.position.z = 3;
        function animate() { requestAnimationFrame(animate); mesh.rotation.y += 0.001; renderer.render(scene, camera); } animate();
    }
}

// LOGIK TARIK DATA DAN RENDER PAPARAN
onSnapshot(query(collection(db, "community_ideas"), orderBy("createdAt", "desc")), (snapshot) => {
    const container = document.getElementById('idea-container'); 
    container.innerHTML = ""; 
    
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const docId = docSnap.id;
        
        let deleteBtnHtml = "";
        
        // Semak UID untuk paparkan butang delete
        if (data.uid === currentUserUid) {
            deleteBtnHtml = `
            <button onclick="window.padamIdea('${docId}')" class="btn btn-sm btn-outline-danger border-0 position-absolute" style="top: 15px; right: 15px;" title="Delete my idea">
                <i class="fas fa-trash"></i>
            </button>`;
        }

        container.innerHTML += `
        <div class="col-md-4 gsap-idea">
            <div class="glass-panel p-4 h-100 position-relative">
                ${deleteBtnHtml}
                <h5 class="fw-bold text-white" style="padding-right: 30px;">${data.title}</h5>
                <p class="text-secondary mt-3">${data.description}</p>
                <small class="text-primary fw-bold"><i class="fas fa-user-circle me-1"></i> By: ${data.author}</small>
            </div>
        </div>`;
    });

    if (typeof gsap !== 'undefined') {
        gsap.fromTo(".gsap-idea", 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" }
        );
    }
});

// HANTAR IDEA
window.hantarIdea = async function(event) {
    event.preventDefault();
    
    const btn = document.querySelector('#idea-form button[type="submit"]');
    const originalText = btn.innerHTML;
    
    if (btn) {
        btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Submitting...`;
        btn.disabled = true;
    }

    try {
        await addDoc(collection(db, "community_ideas"), { 
            title: document.getElementById('idea-title').value, 
            description: document.getElementById('idea-desc').value, 
            author: currentUserName, 
            uid: currentUserUid, 
            createdAt: serverTimestamp() 
        });
        
        document.getElementById('idea-form').reset(); 
        
        const modalEl = document.getElementById('idea-modal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.hide();
        
    } catch (error) {
        console.error(error);
        alert("Failed to submit idea: " + error.message);
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
};

// PANGGIL MODAL BILA KLIK TONG SAMPAH
window.padamIdea = function(docId) {
    ideaToDeleteId = docId; // Simpan ID dalam variable
    const modalEl = document.getElementById('delete-confirm-modal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
};

document.addEventListener('DOMContentLoaded', () => {
    initPremiumUI();
    if (typeof gsap !== 'undefined') {
        gsap.to(".gsap-element", { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" });
    }

    // LISTENER UNTUK BUTANG CONFIRM DELETE DALAM MODAL
    const confirmBtn = document.getElementById('confirm-delete-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (ideaToDeleteId) {
                const originalText = confirmBtn.innerHTML;
                confirmBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
                confirmBtn.disabled = true;

                try {
                    await deleteDoc(doc(db, "community_ideas", ideaToDeleteId));
                    
                    const modalEl = document.getElementById('delete-confirm-modal');
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if(modalInstance) modalInstance.hide();
                    
                    ideaToDeleteId = null; // Kosongkan balik lepas berjaya
                } catch (error) {
                    console.error("Delete Error:", error);
                    alert("Failed to delete idea: " + error.message);
                } finally {
                    confirmBtn.innerHTML = originalText;
                    confirmBtn.disabled = false;
                }
            }
        });
    }
});

window.logKeluarSistem = async function() {
    try { 
        await signOut(auth); 
        window.location.replace("login.html"); 
    } catch (e) { 
        console.error(e); 
    }
};