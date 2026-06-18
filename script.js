import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Konfigurasi Pangkalan Data Firebase
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
let localOTDraft = []; 
let globalBasicSalary = 2500; // Nilai fallback
let isRegisterMode = false;   // Status mod login/register

/* =========================================================================
   1. PENGESAHAN KESELAMATAN & PROFILE DATA SYNC (ANTI-SPAM RELOAD)
   ========================================================================= */
onAuthStateChanged(auth, async (user) => {
    const pageLoader = document.getElementById('page-loader');
    const mainUi = document.getElementById('main-ui');
    const namaHalamanSemasa = window.location.pathname.split("/").pop();

    if (user) {
        currentUser = user;
        
        // Jika user dah login tapi cuba gatal buka page login, tolak ke dashboard
        if (namaHalamanSemasa === "login.html") {
            window.location.href = "index.html";
            return;
        }
        
        try {
            const docRef = doc(db, "users_ot", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                const namaPanggilan = cloudData.nickName || cloudData.employeeName || "User";
                globalBasicSalary = parseFloat(cloudData.basicSalaryProfile) || 2500;

                if (document.getElementById('dashboard-greeting')) {
                    document.getElementById('dashboard-greeting').innerText = `Welcome back, ${namaPanggilan}`;
                }
                kemaskiniKadarGajiUI(globalBasicSalary);
            } else {
                if (document.getElementById('dashboard-greeting')) {
                    document.getElementById('dashboard-greeting').innerText = `Welcome back, User`;
                }
                kemaskiniKadarGajiUI(globalBasicSalary);
            }
        } catch (error) {
            console.error("Ralat ketika memproses profil:", error);
            kemaskiniKadarGajiUI(globalBasicSalary);
        }

        // Paparkan antaramuka utama serentak selepas data dimuatkan
        if (pageLoader) pageLoader.style.display = 'none';
        if (mainUi) mainUi.style.display = 'block';

        if (document.getElementById('logout-btn')) document.getElementById('logout-btn').style.display = 'inline-block';
        if (document.getElementById('menu-trigger-btn')) document.getElementById('menu-trigger-btn').style.display = 'flex';

    } else {
        currentUser = null;
        
        // JIKA TIADA USER: Hanya tendang keluar ke login.html kalau dia berada di index.html
        if (namaHalamanSemasa !== "login.html") {
            window.location.href = "login.html";
        } else {
            // Jika memang dah berada di login.html, matikan spinner loader
            if (pageLoader) pageLoader.style.display = 'none';
            if (mainUi) mainUi.style.display = 'block';
            console.log("Sesi kosong statik. Halaman login sedia menerima input.");
        }
    }
});

/* =========================================================================
   2. FUNGSI AUTENTIKASI UTAMA (LOG IN / REGISTER ENGINE)
   ========================================================================= */
window.kendalikanAutentikasi = async function(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!email || !password) {
        tampilkanNotifikasi("Sila isi emel dan kata laluan dengan lengkap.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = isRegisterMode ? "Registering Account..." : "Logging In...";

    try {
        if (isRegisterMode) {
            // Proses Pendaftaran Baru
            await createUserWithEmailAndPassword(auth, email, password);
            tampilkanNotifikasi("Pendaftaran akaun baru berjaya!", "success");
        } else {
            // Proses Log Masuk Biasa
            await signInWithEmailAndPassword(auth, email, password);
            tampilkanNotifikasi("Log masuk berjaya!", "success");
        }
        // Pengalihan ke index.html diuruskan automatik oleh onAuthStateChanged di atas
    } catch (error) {
        console.error("Auth process failed:", error);
        let mesejRalat = "Ralat: " + error.message;
        
        if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
            mesejRalat = "Emel atau kata laluan salah.";
        } else if (error.code === "auth/email-already-in-use") {
            mesejRalat = "Emel ini telah pun didaftarkan sebelum ini.";
        } else if (error.code === "auth/weak-password") {
            mesejRalat = "Kata laluan mestilah sekurang-kurangnya 6 aksara.";
        }
        
        tampilkanNotifikasi(mesejRalat, "error");
        submitBtn.disabled = false;
        submitBtn.innerText = isRegisterMode ? "Register Now" : "Log In";
    }
};

// Tukar paparan kad antara Login & Register Mod
window.toggleAuthMode = function() {
    isRegisterMode = !isRegisterMode;
    const title = document.querySelector('.auth-header h2');
    const desc = document.querySelector('.auth-header p');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');

    if (!submitBtn || !toggleText) return;

    if (isRegisterMode) {
        if (title) title.innerText = "Create Account";
        if (desc) desc.innerText = "Sign up to start tracking your workspace productivity.";
        submitBtn.innerText = "Register Now";
        toggleText.innerText = "Already have an account? Log In";
    } else {
        if (title) title.innerText = "Welcome";
        if (desc) desc.innerText = "Please log in to access the workspace management system.";
        submitBtn.innerText = "Log In";
        toggleText.innerText = "Don't have an account? Register Now";
    }
};

/* =========================================================================
   3. LOGIK KIRAAN FORMULA (AKTA KERJA MALAYSIA)
   ========================================================================= */
function kemaskiniKadarGajiUI(gajiPokok) {
    const kadarSejam = (gajiPokok / 26) / 8;
    const indicatorEl = document.getElementById('salary-indicator');
    if (indicatorEl) {
        indicatorEl.innerText = `Hourly Rate: RM ${kadarSejam.toFixed(2)}/hour`;
    }
}

/* =========================================================================
   4. OPERASI BORANG & SENARAI DRAF AKTIF (DENGAN AUTO-SPLIT PUBLIC HOLIDAY)
   ========================================================================= */
window.tambahKeSenaraiTempatan = function(event) {
    if (event) event.preventDefault();

    const tarikhKerja = document.getElementById('ot-date').value;
    const tugasan = document.getElementById('ot-reason').value;
    const gandaanRate = parseFloat(document.getElementById('ot-rate').value);
    const jumlahJam = parseFloat(document.getElementById('ot-hours').value);

    if (!tarikhKerja || !tugasan || isNaN(gandaanRate) || isNaN(jumlahJam)) {
        tampilkanNotifikasi("Sila pastikan seluruh borang diisi dengan lengkap.", "error");
        return;
    }

    const kadarAsalSejam = (globalBasicSalary / 26) / 8;

    // ⚡ LOGIK AUTO-SPLIT CUTI UMUM (PUBLIC HOLIDAY)
    if (gandaanRate === 3.0) {
        if (jumlahJam > 8) {
            // Entri Pertama: 8 Jam pertama pada kadar 2.0x
            localOTDraft.push({
                id: Date.now(),
                tarikhKerja,
                tugasan: `${tugasan} (PH - 8 Jam Pertama)`,
                gandaanRate: 2.0,
                jumlahJam: 8,
                bayaranHasil: 8 * kadarAsalSejam * 2.0
            });

            // Entri Kedua: Lebihan jam pada kadar 3.0x
            const lebihanJam = jumlahJam - 8;
            localOTDraft.push({
                id: Date.now() + 1, // Tambah 1 ms supaya ID unik
                tarikhKerja,
                tugasan: `${tugasan} (PH - Lebihan Jam OT)`,
                gandaanRate: 3.0,
                jumlahJam: lebihanJam,
                bayaranHasil: lebihanJam * kadarAsalSejam * 3.0
            });
        } else {
            // Jika jam bekerja pada PH kurang atau sama dengan 8 jam (Hanya 2.0x)
            localOTDraft.push({
                id: Date.now(),
                tarikhKerja,
                tugasan: `${tugasan} (PH - Waktu Normal)`,
                gandaanRate: 2.0,
                jumlahJam: jumlahJam,
                bayaranHasil: jumlahJam * kadarAsalSejam * 2.0
            });
        }
    } else {
        // ⚡ LOGIK BIASA (Untuk rate 1.5x dan 2.0x Rest Day)
        localOTDraft.push({
            id: Date.now(),
            tarikhKerja,
            tugasan,
            gandaanRate,
            jumlahJam,
            bayaranHasil: jumlahJam * kadarAsalSejam * gandaanRate
        });
    }

    document.getElementById('ot-input-form').reset();
    
    document.getElementById('ot-hours').value = "10.5";
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('ot-date').value = today;

    binaSemulaJadualDraf();
    tampilkanNotifikasi("Entri OT berjaya direkodkan.", "success");

    if (document.getElementById('ot-modal')) {
        document.getElementById('ot-modal').style.display = 'none';
    }
};

window.padamDrafItem = function(idItem) {
    localOTDraft = localOTDraft.filter(item => item.id !== idItem);
    binaSemulaJadualDraf();
    tampilkanNotifikasi("Item draf telah dibuang.", "info");
};

function binaSemulaJadualDraf() {
    const tBody = document.getElementById('ot-table-body');
    if (!tBody) return;

    tBody.innerHTML = "";

    let totalJam15 = 0;
    let totalJam20 = 0;
    let totalJam30 = 0;
    let grandTotalKiraan = 0;

    const kadarAsalSejam = (globalBasicSalary / 26) / 8;

    localOTDraft.forEach((item, indeks) => {
        if (item.gandaanRate === 1.5) totalJam15 += item.jumlahJam;
        if (item.gandaanRate === 2.0) totalJam20 += item.jumlahJam;
        if (item.gandaanRate === 3.0) totalJam30 += item.jumlahJam;
        
        grandTotalKiraan += item.bayaranHasil;

        const barisHtml = `
            <tr>
                <td>${indeks + 1}</td>
                <td style="white-space: nowrap;">${item.tarikhKerja}</td>
                <td>${item.tugasan}</td>
                <td><span class="badge-rate">${item.gandaanRate.toFixed(1)}x</span></td>
                <td>${item.jumlahJam.toFixed(1)} hrs</td>
                <td style="font-weight: 600; color: #34c759;">RM ${item.bayaranHasil.toFixed(2)}</td>
                <td style="text-align: right;">
                    <button onclick="window.padamDrafItem(${item.id})" class="btn-delete-row" aria-label="Padam" style="background: none; border: none; color: #ff3b30; cursor: pointer;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
        tBody.insertAdjacentHTML('beforeend', barisHtml);
    });

    if(document.getElementById('breakdown-1-5')) document.getElementById('breakdown-1-5').innerText = `${totalJam15.toFixed(1)} hours (RM ${(totalJam15 * kadarAsalSejam * 1.5).toFixed(2)})`;
    if(document.getElementById('breakdown-2-0')) document.getElementById('breakdown-2-0').innerText = `${totalJam20.toFixed(1)} hours (RM ${(totalJam20 * kadarAsalSejam * 2.0).toFixed(2)})`;
    if(document.getElementById('breakdown-3-0')) document.getElementById('breakdown-3-0').innerText = `${totalJam30.toFixed(1)} hours (RM ${(totalJam30 * kadarAsalSejam * 3.0).toFixed(2)})`;
    if(document.getElementById('grand-total-val')) document.getElementById('grand-total-val').innerText = `RM ${grandTotalKiraan.toFixed(2)}`;
}

/* =========================================================================
   5. CLOUD SYNCHRONIZATION (SIMPAN KE ARRAY ACTIVERECORDS SEPERTI HISTORY.JS)
   ========================================================================= */
window.simpanKeCloud = async function() {
    if (!currentUser) return;
    if (localOTDraft.length === 0) {
        tampilkanNotifikasi("Tiada rekod draf aktif untuk disimpan.", "error");
        return;
    }

    const simpanBtn = document.querySelector('.accent-cloud-btn');
    if (simpanBtn) {
        simpanBtn.disabled = true;
        simpanBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;
    }

    try {
        // 1. Tarik rekod OT lama dari Cloud (supaya data lama tak tertindih)
        const docRef = doc(db, "users_ot", currentUser.uid);
        const docSnap = await getDoc(docRef);
        let activeRecords = [];
        
        if (docSnap.exists() && docSnap.data().activeRecords) {
            activeRecords = docSnap.data().activeRecords;
        }

        // 2. Format semula draf supaya NGAM dengan kehendak history.js & money-script.js
        for (const item of localOTDraft) {
            // Tukar tarikh dari YYYY-MM-DD ke DD/MM/YYYY (Sangat Penting untuk logik cut-off 15hb)
            const tarikhSplit = item.tarikhKerja.split('-');
            const tarikhFormatBaru = `${tarikhSplit[2]}/${tarikhSplit[1]}/${tarikhSplit[0]}`;

            activeRecords.push({
                otDate: tarikhFormatBaru,
                taskName: item.tugasan,
                rateFactor: item.gandaanRate,
                hoursCount: item.jumlahJam
            });
        }

        // 3. Tembak/Simpan array yang dah digabungkan ke Cloud menggunakan setDoc
        await setDoc(docRef, { 
            activeRecords: activeRecords,
            lastCommittedTime: serverTimestamp() 
        }, { merge: true });

        tampilkanNotifikasi("Semua rekod draf berjaya disinkronkan ke Cloud.", "success");
        localOTDraft = []; 
        binaSemulaJadualDraf();

    } catch (error) {
        tampilkanNotifikasi("Sinkronisasi gagal: " + error.message, "error");
    } finally {
        if (simpanBtn) {
            simpanBtn.disabled = false;
            simpanBtn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> Save to Cloud`;
        }
    }
};

/* =========================================================================
   6. UTALITI PEMBANTU (SIDEBAR, CLOCK, THEME & LOGOUT)
   ========================================================================= */
window.logKeluarSistem = async function() {
    try { 
        await signOut(auth); 
        window.location.href = "login.html"; 
    } catch (error) { 
        console.error("Ralat ketika log keluar:", error); 
    }
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
};

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

function processSystemClock() {
    const clockEl = document.getElementById('current-time');
    if (clockEl) {
        const timestampSiri = new Date();
        clockEl.innerText = timestampSiri.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
}

function tampilkanNotifikasi(mesej, jenis = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.style.padding = "12px 20px";
    toast.style.borderRadius = "8px";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "500";
    toast.style.color = "#ffffff";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "10px";
    toast.style.transition = "all 0.3s ease";
    toast.classList.add('animate-popup');

    if (jenis === "success") {
        toast.style.background = "#34c759";
        toast.innerHTML = `<i class="fas fa-check-circle"></i> ${mesej}`;
    } else if (jenis === "error") {
        toast.style.background = "#ff3b30";
        toast.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mesej}`;
    } else {
        toast.style.background = "#007aff";
        toast.innerHTML = `<i class="fas fa-info-circle"></i> ${mesej}`;
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

window.addEventListener('click', (event) => {
    const aboutModal = document.getElementById('about-modal');
    const otModal = document.getElementById('ot-modal');
    if (event.target === aboutModal) aboutModal.style.display = 'none';
    if (event.target === otModal) otModal.style.display = 'none';
});

document.addEventListener('DOMContentLoaded', () => {
    setInterval(processSystemClock, 1000);
    processSystemClock();
    
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('ot-date')) {
        document.getElementById('ot-date').value = today;
    }
});