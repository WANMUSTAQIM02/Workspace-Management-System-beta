import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", 
    authDomain: "ot-tracker-pro-64415.firebaseapp.com", 
    projectId: "ot-tracker-pro-64415" 
};

const app = initializeApp(firebaseConfig); 
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        window.location.replace("index.html"); 
    }
});

window.daftarAkaunBaru = async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-confirm-password').value;
    const btn = document.getElementById('reg-btn');
    
    if (pass !== confirmPass) {
        alert("Passwords do not match! Please check again.");
        return;
    }
    
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Registering...`;
    btn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        await setDoc(doc(db, "users_ot", user.uid), {
            nicknameProfile: "New User",
            basicSalaryProfile: 0,
            activeRecords: []
        });

        await sendEmailVerification(user);
        await signOut(auth);

        // Buka Custom Modal
        const modalEl = document.getElementById('emailAlertModal');
        const emailModal = new bootstrap.Modal(modalEl);
        
        modalEl.addEventListener('hidden.bs.modal', () => {
            window.location.replace("login.html");
        }, { once: true });

        emailModal.show();
        
    } catch (error) {
        console.error("Registration Error:", error);
        alert(`Registration Failed: ${error.message}`);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

function initPremiumUI() {
    const canvas = document.getElementById('bg-canvas');
    if(canvas && typeof THREE !== 'undefined') {
        const scene = new THREE.Scene(); 
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); 
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        const geom = new THREE.BufferGeometry(); 
        const posArray = new Float32Array(500 * 3);
        for(let i=0; i<500*3; i++) posArray[i] = (Math.random() - 0.5) * 10;
        geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        
        const mat = new THREE.PointsMaterial({ size: 0.005, color: 0x0d6efd }); 
        const mesh = new THREE.Points(geom, mat); 
        scene.add(mesh); 
        camera.position.z = 3;
        
        function animate() { 
            requestAnimationFrame(animate); 
            mesh.rotation.y += 0.001; 
            renderer.render(scene, camera); 
        } 
        animate();
    }
    if (typeof gsap !== 'undefined') {
        gsap.to(".gsap-element", { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out" });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initPremiumUI();
});