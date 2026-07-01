import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
let basicSalary = 0;
let totalOTPayBulanIni = 0;
let totalPerbelanjaanBulanIni = 0;
let unsubscribeExpenses = null;

// Cache data OT supaya tak perlu fetch berulang kali bila tukar bulan
let globalActiveRecords = []; 

// Tetapkan String Penapis Bulan (Default: Bulan Semasa. Format: YYYY-MM)
const tarikhSekarang = new Date();
let selectedMonthString = `${tarikhSekarang.getFullYear()}-${String(tarikhSekarang.getMonth() + 1).padStart(2, '0')}`;

/* =========================================================================
   1. PENGESAHAN KESELAMATAN & AMBIL DATA SECARA LIVE
   ========================================================================= */
onAuthStateChanged(auth, async (user) => {
    const pageLoader = document.getElementById('page-loader');
    const mainUi = document.getElementById('main-ui');

    if (user) {
        currentUser = user;
        
        try {
            const userDoc = await getDoc(doc(db, "users_ot", user.uid));
            if (userDoc.exists()) {
                const cloudData = userDoc.data();
                
                // Set Gaji Pokok
                basicSalary = parseFloat(cloudData.basicSalaryProfile) || 0;
                
                // Simpan rekod OT dalam cache global
                globalActiveRecords = cloudData.activeRecords || [];
                
                // Kira OT berdasarkan bulan yang dipilih (default: semasa)
                kiraOTDariDatabase();
            }

            // Pasang Real-Time Listener untuk perbelanjaan
            dengarDataExpensesRealTime(user.uid);

        } catch (error) {
            console.error("Ralat pemuatan profil kewangan:", error);
        }

        if (pageLoader) pageLoader.style.display = 'none';
        if (mainUi) mainUi.style.display = 'block';
        if (document.getElementById('logout-btn')) document.getElementById('logout-btn').style.display = 'inline-block';
        if (document.getElementById('menu-trigger-btn')) document.getElementById('menu-trigger-btn').style.display = 'flex';
    } else {
        currentUser = null;
        if (unsubscribeExpenses) unsubscribeExpenses();
        window.location.href = "index.html";
    }
});

/* =========================================================================
   2. FUNGSI TUKAR BULAN (DIHUBUNGKAN DENGAN UI HTML)
   ========================================================================= */
window.tukarBulanKewangan = function() {
    const filterElement = document.getElementById('month-filter');
    if (!filterElement || !filterElement.value) return;

    // Update variable bulan yang dipilih
    selectedMonthString = filterElement.value; // cth: "2026-07"

    // Kemaskini Teks Label di atas
    const [tahun, bulan] = selectedMonthString.split('-');
    const dateObj = new Date(tahun, parseInt(bulan) - 1);
    const pilihanNamaBulan = { month: 'long', year: 'numeric' };
    document.getElementById('budget-month-label').innerText = `Financial ledger tracking for ${dateObj.toLocaleDateString('en-US', pilihanNamaBulan)}`;

    // Kira semula OT & Tarik data perbelanjaan baru berdasarkan bulan dipilih
    if (currentUser) {
        kiraOTDariDatabase();
        dengarDataExpensesRealTime(currentUser.uid);
    }
};

/* =========================================================================
   3. KIRA DATA OT DIRECT DARI FIRESTORE (LOGIK CUT-OFF 15HB & TAHUN)
   ========================================================================= */
function kiraOTDariDatabase() {
    totalOTPayBulanIni = 0;
    
    // Pecahkan bulan pilihan (Cth: 2026 dan 7)
    const [selYearStr, selMonthStr] = selectedMonthString.split('-');
    const selYear = parseInt(selYearStr, 10);
    const selMonth = parseInt(selMonthStr, 10);
    
    // Formula standard: Gaji / 26 hari / 8 jam
    const hourlyRate = basicSalary / 26 / 8;

    globalActiveRecords.forEach(row => {
        if (!row.otDate) return;

        // Pecahkan tarikh DD/MM/YYYY dari pangkalan data
        const parts = row.otDate.split('/'); 
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10) || selYear; // Fallback jika tiada tahun direkod
        
        let targetPayrollMonth = month;
        let targetPayrollYear = year;

        // Logik Cut-Off: Jika lebih 15hb, OT bawa ke bulan depan
        if (day > 15) {
            targetPayrollMonth = month + 1;
            if (targetPayrollMonth > 12) {
                targetPayrollMonth = 1;
                targetPayrollYear += 1;
            }
        }

        // Jika rekod OT sepadan dengan Bulan & Tahun yang dipilih, tambahkan duit
        if (targetPayrollMonth === selMonth && targetPayrollYear === selYear) {
            const itemPay = hourlyRate * row.hoursCount * row.rateFactor;
            totalOTPayBulanIni += itemPay;
        }
    });

    // Panggil kemaskini UI (Sekiranya tiada perbelanjaan dikesan, UI masih ter-update)
    kemaskiniPaparanKunciKiraKira();
}

/* =========================================================================
   4. PENGURUSAN DATA EXPENSES BULAN SEMASA (REAL-TIME LISTENER)
   ========================================================================= */
function dengarDataExpensesRealTime(uid) {
    const expensesRef = collection(db, "users_ot", uid, "expenses_records");
    const q = query(expensesRef, orderBy("datePaid", "desc"));

    if (unsubscribeExpenses) unsubscribeExpenses();

    unsubscribeExpenses = onSnapshot(q, (snapshot) => {
        const tBody = document.getElementById('expense-table-body');
        if (!tBody) return;
        tBody.innerHTML = "";

        totalPerbelanjaanBulanIni = 0;
        let indeks = 1;

        snapshot.forEach((docSnap) => {
            const id = docSnap.id;
            const data = docSnap.data();

            // Tapis perbelanjaan MENGGUNAKAN BULAN PILIHAN (selectedMonthString)
            if (data.datePaid && data.datePaid.startsWith(selectedMonthString)) {
                const amaun = parseFloat(data.amount) || 0;
                totalPerbelanjaanBulanIni += amaun;

                const row = `
                    <tr>
                        <td>${indeks++}</td>
                        <td style="white-space: nowrap;">${data.datePaid}</td>
                        <td style="font-weight: 500;">${data.description}</td>
                        <td><span class="badge-rate" style="background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 6px; font-size: 12px; border: 1px solid rgba(255,255,255,0.1);">${data.category}</span></td>
                        <td style="font-weight: 600; color: #ff3b30;">- RM ${amaun.toFixed(2)}</td>
                        <td style="text-align: right;">
                            <button onclick="window.padamExpenseCloud('${id}')" class="btn-delete-row" style="color: #ff3b30; background: transparent; border: none; cursor: pointer;"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `;
                tBody.insertAdjacentHTML('beforeend', row);
            }
        });

        kemaskiniPaparanKunciKiraKira();
    });
}

/* =========================================================================
   5. KEMASKINI PAPARAN UTAMA KAD METRIK (LOGIK TEPAT JADUAL PERKESO/SIP)
   ========================================================================= */
function kemaskiniPaparanKunciKiraKira() {
    const potongEPF = basicSalary * 0.11; 
    let potongSOCSO = 0;
    let potongEIS = 0;

    if (basicSalary > 0) {
        let gajiCaruman = basicSalary > 6000 ? 6000 : basicSalary;
        let nilaiTengah = (Math.ceil(gajiCaruman / 100) * 100) - 50;
        if (gajiCaruman % 100 === 0) {
            nilaiTengah = gajiCaruman - 50;
        }

        potongSOCSO = nilaiTengah * 0.005; 
        potongEIS = nilaiTengah * 0.002;  
    }

    const jumlahPotonganWajib = potongEPF + potongSOCSO + potongEIS;
    const totalPendapatanKasar = (basicSalary + totalOTPayBulanIni) - jumlahPotonganWajib;
    const bakiBersihPocket = totalPendapatanKasar - totalPerbelanjaanBulanIni;

    const incomeEl = document.getElementById('total-income-val');
    const expensesEl = document.getElementById('total-expenses-val');
    const netBalanceEl = document.getElementById('net-balance-val');

    if (incomeEl) incomeEl.innerText = `RM ${totalPendapatanKasar.toFixed(2)}`;
    if (expensesEl) expensesEl.innerText = `RM ${totalPerbelanjaanBulanIni.toFixed(2)}`;
    
    if (netBalanceEl) {
        netBalanceEl.innerText = `RM ${bakiBersihPocket.toFixed(2)}`;
        if (bakiBersihPocket < 0) netBalanceEl.className = "summary-value text-red";
        else netBalanceEl.className = "summary-value text-blue";
    }

    const epfEl = document.getElementById('deduction-epf-val');
    const socsoEl = document.getElementById('deduction-socso-val');
    const eisEl = document.getElementById('deduction-eis-val');
    
    if (epfEl) epfEl.innerText = `- RM ${potongEPF.toFixed(2)}`;
    if (socsoEl) socsoEl.innerText = `- RM ${potongSOCSO.toFixed(2)}`;
    if (eisEl) eisEl.innerText = `- RM ${potongEIS.toFixed(2)}`;
}

/* =========================================================================
   6. OPERASI REKOD & PADAM PERBELANJAAN (CLOUD FIRESTORE)
   ========================================================================= */
window.tambahExpenseCloud = async function(event) {
    if (event) event.preventDefault();
    if (!currentUser) return;

    const datePaid = document.getElementById('exp-date').value;
    const description = document.getElementById('exp-reason').value.trim();
    const category = document.getElementById('exp-category').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);

    if (!datePaid || !description || isNaN(amount) || amount <= 0) {
        tampilkanNotifikasi("Sila isi maklumat perbelanjaan dengan betul.", "error");
        return;
    }

    try {
        const expensesRef = collection(db, "users_ot", currentUser.uid, "expenses_records");
        await addDoc(expensesRef, {
            datePaid,
            description,
            category,
            amount,
            createdAt: serverTimestamp()
        });

        document.getElementById('expense-input-form').reset();
        document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
        
        const expenseModal = document.getElementById('expense-modal');
        if (expenseModal) expenseModal.style.display = 'none';

        tampilkanNotifikasi("successfully recorded.", "success");
    } catch (error) {
        tampilkanNotifikasi("Failed to keep records: " + error.message, "error");
    }
};

window.padamExpenseCloud = async function(idDoc) {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    
    try {
        const docRef = doc(db, "users_ot", currentUser.uid, "expenses_records", idDoc);
        await deleteDoc(docRef);
        tampilkanNotifikasi("Expense record has been deleted.", "info");
    } catch (error) {
        tampilkanNotifikasi("Failed to delete: " + error.message, "error");
    }
};

/* =========================================================================
   7. NAVIGATION, THEME CONTROLS & IDLE TIMER
   ========================================================================= */
let idleTimer;
function setSemulaTimerIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
        if (currentUser) {
            tampilkanNotifikasi("The session ends after 30 minutes of inactivity.", "error");
            setTimeout(async () => {
                try { await signOut(auth); window.location.href = "index.html"; } catch (e) { console.error(e); }
            }, 1500);
        }
    }, 30 * 60 * 1000);
}

const senaraiAcaraAktiviti = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
senaraiAcaraAktiviti.forEach(evt => window.addEventListener(evt, setSemulaTimerIdle, { passive: true }));

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

window.logKeluarSistem = async function() {
    try { 
        if (unsubscribeExpenses) unsubscribeExpenses();
        await signOut(auth); 
        window.location.href = "index.html"; 
    } catch (e) { console.error(e); }
};

document.addEventListener('DOMContentLoaded', () => {
    setSemulaTimerIdle();
    
    // Set Nilai Default untuk input filter bulan (HTML)
    const inputBulan = document.getElementById('month-filter');
    if (inputBulan) {
        inputBulan.value = selectedMonthString;
    }

    const pilihanNamaBulan = { month: 'long', year: 'numeric' };
    const labelBulan = document.getElementById('budget-month-label');
    if (labelBulan) {
        labelBulan.innerText = `Financial ledger tracking for ${tarikhSekarang.toLocaleDateString('en-US', pilihanNamaBulan)}`;
    }
    
    const inputTarikh = document.getElementById('exp-date');
    if (inputTarikh) {
        inputTarikh.value = tarikhSekarang.toISOString().split('T')[0];
    }

    setInterval(() => {
        const timeDisplay = document.getElementById('current-time');
        if (timeDisplay) {
            timeDisplay.innerText = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
    }, 1000);
});

window.addEventListener('click', (e) => {
    const aboutModal = document.getElementById('about-modal');
    const expenseModal = document.getElementById('expense-modal');
    if (e.target === aboutModal) aboutModal.style.display = 'none';
    if (e.target === expenseModal) expenseModal.style.display = 'none';
});

function tampilkanNotifikasi(mesej, jenis = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.style.padding = "12px 20px"; toast.style.borderRadius = "8px"; toast.style.fontSize = "14px";
    toast.style.fontWeight = "500"; toast.style.color = "#ffffff"; toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    toast.style.display = "flex"; toast.style.alignItems = "center"; toast.style.gap = "10px";
    toast.classList.add('animate-popup');

    if (jenis === "success") { toast.style.background = "#34c759"; toast.innerHTML = `<i class="fas fa-check-circle"></i> ${mesej}`; }
    else if (jenis === "error") { toast.style.background = "#ff3b30"; toast.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${mesej}`; }
    else { toast.style.background = "#007aff"; toast.innerHTML = `<i class="fas fa-info-circle"></i> ${mesej}`; }

    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 4000);
}