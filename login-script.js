import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
// TAMBAH: sendPasswordResetEmail
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", 
    authDomain: "ot-tracker-pro-64415.firebaseapp.com", 
    projectId: "ot-tracker-pro-64415" 
};

const app = initializeApp(firebaseConfig); 
const auth = getAuth(app);

// LOGIK SEKURITI
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (user.emailVerified) {
            window.location.replace("index.html"); 
        } else {
            signOut(auth);
        }
    }
});

// FUNGSI LUPA KATA LALUAN (RESET PASSWORD)
window.hantarEmailReset = async function(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('reset-email');
    const btn = document.getElementById('reset-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Sending...`;
    btn.disabled = true;

    try {
        await sendPasswordResetEmail(auth, emailInput.value);
        
        // Tutup modal form input
        const forgotModalEl = document.getElementById('forgotPasswordModal');
        const forgotModal = bootstrap.Modal.getInstance(forgotModalEl);
        if(forgotModal) forgotModal.hide();

        // Kosongkan input
        emailInput.value = '';

        // Buka modal kejayaan (success)
        const successModal = new bootstrap.Modal(document.getElementById('resetSuccessModal'));
        successModal.show();

    } catch (error) {
        console.error("Reset Password Error:", error);
        // Kalau error (cth: email tak wujud)
        alert(`Error: ${error.message}`);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// FUNGSI LOGIN
window.logMasukSistem = async function(e) {
    e.preventDefault(); 
    
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Authenticating...`;
    btn.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        
        if (!userCredential.user.emailVerified) {
            await sendEmailVerification(userCredential.user);
            await signOut(auth); 
            
            const emailModal = new bootstrap.Modal(document.getElementById('emailAlertModal'));
            emailModal.show();
            
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
    } catch (error) {
        console.error("Login Error:", error);
        alert("Authentication Failed: Invalid Email or Password.");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// BACKGROUND ANIMATION
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