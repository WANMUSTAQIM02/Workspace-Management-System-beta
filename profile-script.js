import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, verifyBeforeUpdateEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", 
    authDomain: "ot-tracker-pro-64415.firebaseapp.com", 
    projectId: "ot-tracker-pro-64415", 
    storageBucket: "ot-tracker-pro-64415.firebasestorage.app", 
    messagingSenderId: "941888808954", 
    appId: "1:941888808954:web:e40f19a0cec8a2f4272643" 
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// PREMIUM UI ENGINE - Dioptimumkan supaya tidak mengganggu Main Thread
function initPremiumUI() {
    const canvas = document.getElementById('bg-canvas');
    if(canvas && typeof THREE !== 'undefined') {
        const scene = new THREE.Scene(); 
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false }); // antialias: false lebih ringan
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
            mesh.rotation.y += 0.0005; // Lebih perlahan untuk penjimatan CPU
            renderer.render(scene, camera); 
        } 
        animate();
    }
}

// FUNGSI ANIMASI GSAP YANG SMOOTH
function jalankanAnimasiMasuk() {
    if (typeof gsap !== 'undefined') {
        // Gunakan set supaya elemen ada awal-awal lagi untuk elak flash
        gsap.set(".gsap-element", { opacity: 0, y: 30 });
        
        // Delay sikit (0.3s) supaya browser selesaikan load Three.js dulu
        gsap.to(".gsap-element", { 
            opacity: 1, 
            y: 0, 
            duration: 0.8, 
            delay: 0.3,
            ease: "power2.out" 
        });
    }
}

// KEMASKINI PROFIL
window.kemaskiniProfilCloud = async function(event) {
    if (event) event.preventDefault(); 
    if (!currentUser) return;
    
    const nameVal = document.getElementById('profile-name').value;
    const nickNameVal = document.getElementById('profile-nickname').value;
    const salaryVal = parseFloat(document.getElementById('profile-salary').value) || 2500;
    const staffIdVal = document.getElementById('profile-staff-id').value;
    const submitBtn = document.querySelector('#profile-settings-form button[type="submit"]');
    
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> Saving...`; }
    
    try {
        await setDoc(doc(db, "users_ot", currentUser.uid), { 
            employeeName: nameVal, nickName: nickNameVal, nicknameProfile: nickNameVal, basicSalaryProfile: salaryVal, staffId: staffIdVal 
        }, { merge: true });
        alert("Profile updated.");
    } catch (error) { alert("Failed: " + error.message); } 
    finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = `<i class="fas fa-save me-2"></i>Save Modifications`; } }
};

// TUKAR EMAIL
window.tukarEmailAkaun = async function(event) {
    event.preventDefault();
    if (!currentUser) return;
    const newEmail = document.getElementById('profile-new-email').value;
    try {
        await verifyBeforeUpdateEmail(currentUser, newEmail);
        alert("Check your new email to confirm.");
        await signOut(auth);
        window.location.replace("login.html");
    } catch (error) { alert(error.message); }
};

// PENGESAHAN LOGIN
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if (document.getElementById('profile-email-display')) document.getElementById('profile-email-display').value = user.email;
        
        try {
            const docSnap = await getDoc(doc(db, "users_ot", user.uid));
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                if (document.getElementById('profile-name')) document.getElementById('profile-name').value = cloudData.employeeName || "";
                if (document.getElementById('profile-nickname')) document.getElementById('profile-nickname').value = cloudData.nicknameProfile || cloudData.nickName || "";
                if (document.getElementById('profile-salary')) document.getElementById('profile-salary').value = cloudData.basicSalaryProfile || "2500";
                if (document.getElementById('profile-staff-id')) document.getElementById('profile-staff-id').value = cloudData.staffId || "";
            }
        } catch (error) { console.error(error); }
        
        // Panggil animasi di sini selepas data load
        jalankanAnimasiMasuk();
    } else { window.location.href = "login.html"; }
});

window.logKeluarSistem = async function() { await signOut(auth); window.location.href = "login.html"; };

document.addEventListener('DOMContentLoaded', () => {
    initPremiumUI();
});