import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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

/* =========================================================================
   1. UI SIDEBAR CONTROL
   ========================================================================= */
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
};

/* =========================================================================
   2. SYSTEM THEME CONTROLLER
   ========================================================================= */
window.toggleTheme = function() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    if (body.classList.contains('dark-theme')) {
        body.classList.replace('dark-theme', 'light-theme');
        if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
        body.classList.replace('light-theme', 'dark-theme');
        if (themeIcon) themeIcon.classList.replace('fa-sun', 'fa-moon');
    }
};

/* =========================================================================
   3. SYSTEM LOGOUT METHOD
   ========================================================================= */
window.logKeluarSistem = async function() {
    try { 
        await signOut(auth); 
        window.location.href = "index.html"; 
    } catch (error) { 
        console.error(error); 
    }
};

/* =========================================================================
   4. CLOUD SYNCHRONIZATION (SAVE PROFILE)
   ========================================================================= */
window.kemaskiniProfilCloud = async function(event) {
    if (event) event.preventDefault();
    if (!currentUser) return;

    const nameVal = document.getElementById('profile-name').value;
    const nickNameVal = document.getElementById('profile-nickname').value;
    const salaryVal = parseFloat(document.getElementById('profile-salary').value) || 2500;
    const staffIdVal = document.getElementById('profile-staff-id').value;

    const submitBtn = document.querySelector('#profile-settings-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    }

    try {
        await setDoc(doc(db, "users_ot", currentUser.uid), {
            employeeName: nameVal,
            nickName: nickNameVal, 
            basicSalaryProfile: salaryVal,
            staffId: staffIdVal
        }, { merge: true });

        alert("Profile update synchronized successfully.");
    } catch (error) {
        alert("Failed to update profile configurations: " + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-save" style="margin-right: 8px;"></i> Save Modifications`;
        }
    }
};

function processSystemClock() {
    const clockEl = document.getElementById('current-time');
    if (clockEl) {
        const timestampSiri = new Date();
        clockEl.innerText = timestampSiri.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
}

/* =========================================================================
   5. REAL-TIME SECURITY WATCHER & PAGE WRAPPER CONTROL (Satu Fungsi Bersepadu)
   ========================================================================= */
onAuthStateChanged(auth, async (user) => {
    const pageLoader = document.getElementById('page-loader');
    const mainUi = document.getElementById('main-ui');

    if (user) {
        currentUser = user;
        
        // Map emel pengguna ke input element
        if (document.getElementById('profile-email-display')) {
            document.getElementById('profile-email-display').value = user.email;
        }

        try {
            // Tarik maklumat dari Firestore
            const docRef = doc(db, "users_ot", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                if (document.getElementById('profile-name')) document.getElementById('profile-name').value = cloudData.employeeName || "";
                if (document.getElementById('profile-nickname')) document.getElementById('profile-nickname').value = cloudData.nickName || "";
                if (document.getElementById('profile-salary')) document.getElementById('profile-salary').value = cloudData.basicSalaryProfile || "2500";
                if (document.getElementById('profile-staff-id')) document.getElementById('profile-staff-id').value = cloudData.staffId || "";
            }
        } catch (error) { 
            console.error("Ralat memuatkan profil:", error); 
        }

        // SELESAI SEMUA PROSES: Matikan skrin loading dan paparkan keseluruhan UI
        if (pageLoader) pageLoader.style.display = 'none';
        if (mainUi) mainUi.style.display = 'block';

        // Pastikan navigasi sistem dipaparkan dengan betul
        if (document.getElementById('logout-btn')) document.getElementById('logout-btn').style.display = 'inline-block';
        if (document.getElementById('menu-trigger-btn')) document.getElementById('menu-trigger-btn').style.display = 'flex';

    } else {
        currentUser = null;
        window.location.href = "index.html";
    }
});

/* =========================================================================
   6. GLOBAL WINDOW EVENTS (MODAL & DOM LISTENER)
   ========================================================================= */
// Klik di luar kawasan 'About Modal' untuk menutup panel secara automatik
window.addEventListener('click', (event) => {
    const aboutModal = document.getElementById('about-modal');
    if (event.target === aboutModal) {
        aboutModal.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setInterval(processSystemClock, 1000);
    processSystemClock();
    
    const profileForm = document.getElementById('profile-settings-form');
    if (profileForm) {
        profileForm.addEventListener('submit', window.kemaskiniProfilCloud);
    }
});

/* =========================================================================
   6. SISTEM AUTO LOGOUT JIKA TIDAK AKTIF (IDLE TIMEOUT - 30 MINIT)
   ========================================================================= */
let idleTimer;
const TEMPOH_IDLE = 30 * 60 * 1000; // 30 minit dalam milisaat (ms)

function setSemulaTimerIdle() {
    // Bersihkan timer lama jika pengguna melakukan aktiviti
    clearTimeout(idleTimer);
    
    // Set timer baharu untuk log keluar jika tiada aktiviti dalam masa 30 minit
    idleTimer = setTimeout(async () => {
        if (currentUser) {
            tampilkanNotifikasi("Sesi anda telah tamat kerana tidak aktif selama 30 minit.", "error");
            
            // Beri ruang 1.5 saat untuk pengguna sempat membaca notifikasi sebelum log keluar
            setTimeout(async () => {
                try {
                    await signOut(auth);
                    window.location.href = "index.html";
                } catch (error) {
                    console.error("Ralat log keluar automatik:", error);
                }
            }, 1500);
        }
    }, TEMPOH_IDLE);
}

