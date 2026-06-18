import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
let savedRecordsArchive = []; 
let userBasicSalary = 2500; 

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
   2. FILTER & SEARCH ENGINE (LOGIK CUT-OFF 15hb)
   ========================================================================= */
window.tapisSejarahOT = function() {
    const monthFilter = document.getElementById('filter-month').value; 
    const searchKeyword = document.getElementById('search-task').value.toLowerCase().trim();
    
    let filteredList = savedRecordsArchive;

    if (monthFilter !== 'all') {
        filteredList = filteredList.filter(row => {
            if (!row.otDate) return false;
            
            const parts = row.otDate.split('/'); 
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10); 
            
            let targetPayrollMonth = month;

            if (day > 15) {
                targetPayrollMonth = month + 1;
                if (targetPayrollMonth > 12) {
                    targetPayrollMonth = 1;
                }
            }

            const targetPayrollMonthStr = String(targetPayrollMonth).padStart(2, '0');
            return targetPayrollMonthStr === monthFilter;
        });
    }

    if (searchKeyword !== '') {
        filteredList = filteredList.filter(row => {
            return row.taskName && row.taskName.toLowerCase().includes(searchKeyword);
        });
    }

    window.renderHistoryTable(filteredList);
};

/* =========================================================================
   3. RENDER ENGINE DENGAN BUTTON DELETE KHUSUS
   ========================================================================= */
window.renderHistoryTable = function(dataToRender) {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    let totalHours = 0;
    let grandTotalPay = 0;
    const hourlyRate = userBasicSalary / 26 / 8;

    const indicatorEl = document.getElementById('salary-indicator');
    if (indicatorEl) {
        indicatorEl.innerText = `Hourly Rate: RM ${hourlyRate.toFixed(2)}/hour`;
    }

    if (!dataToRender || dataToRender.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px 0;">No matching history logs found in the archive for this selection.</td></tr>`;
        document.getElementById('report-total-hours').innerText = "0.0 hours";
        document.getElementById('report-total-tasks').innerText = "0 entries";
        document.getElementById('report-grand-total').innerText = "RM 0.00";
        return;
    }

    dataToRender.forEach((row, idx) => {
        const itemPay = hourlyRate * row.hoursCount * row.rateFactor;
        totalHours += row.hoursCount;
        grandTotalPay += itemPay;

        // FIXED: Dapatkan index sebenar dari array master (savedRecordsArchive)
        const originalIndex = savedRecordsArchive.indexOf(row);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--text-muted); font-variant-numeric: tabular-nums;">${idx + 1}</td>
            <td style="color: var(--text-muted); font-weight: 500;">${row.otDate || "-"}</td>
            <td style="font-weight: 500;">${row.taskName}</td>
            <td style="font-weight: 600; color: var(--brand-blue);">${row.rateFactor.toFixed(1)}x</td>
            <td style="font-variant-numeric: tabular-nums;">${row.hoursCount.toFixed(1)} hrs</td>
            <td style="font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums;">RM ${itemPay.toFixed(2)}</td>
            <td style="text-align: right;">
                <button onclick="window.padamRekodSahkan(${originalIndex})" class="row-delete-trigger" style="background: rgba(255,59,48,0.1); color: #ff3b30; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    document.getElementById('report-total-hours').innerText = `${totalHours.toFixed(1)} hours`;
    document.getElementById('report-total-tasks').innerText = `${dataToRender.length} entries`;
    document.getElementById('report-grand-total').innerText = `RM ${grandTotalPay.toFixed(2)}`;
};

/* =========================================================================
   4. PERMANENT DELETE LOGIC DENGAN CUSTOM MODAL
   ========================================================================= */
window.padamRekodSahkan = function(originalIndex) {
    if (originalIndex === -1 || originalIndex === undefined) return;
    
    const targetItem = savedRecordsArchive[originalIndex];
    
    // Panggil Modal UI
    const modal = document.getElementById('custom-confirm-modal');
    const modalBody = document.getElementById('confirm-modal-body');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const proceedBtn = document.getElementById('confirm-proceed-btn');

    modalBody.innerHTML = `Adakah anda pasti mahu memadam rekod OT ini secara kekal dari cloud?<br><br>Tarikh: <strong>${targetItem.otDate}</strong><br>Tugasan: <strong>${targetItem.taskName}</strong>`;
    modal.style.display = 'flex';

    // Batal Delete
    cancelBtn.onclick = function() {
        modal.style.display = 'none';
    };

    // Teruskan Delete (Tolak ke Firestore)
    proceedBtn.onclick = async function() {
        modal.style.display = 'none'; // Tutup modal
        
        try {
            // Buang data dari array master
            savedRecordsArchive.splice(originalIndex, 1);

            // Kemas kini ke cloud
            await setDoc(doc(db, "users_ot", currentUser.uid), {
                activeRecords: savedRecordsArchive,
                lastCommittedTime: new Date().toISOString()
            }, { merge: true });

            // PENTING: Refresh jadual selepas delete supaya UI update!
            window.tapisSejarahOT();

        } catch (error) {
            alert("Gagal memadam rekod dari cloud: " + error.message);
        }
    };
};

/* =========================================================================
   5. EXPORT REPORT SIMULATION
   ========================================================================= */
window.eksportLaporan = function() {
    if (savedRecordsArchive.length === 0) {
        alert("No data available to export.");
        return;
    }
    alert("Export Feature: Generating spreadsheet download link for active filter context...");
};

/* =========================================================================
   6. SYSTEM AUTH & UTILITIES
   ========================================================================= */
window.logKeluarSistem = async function() {
    try { 
        await signOut(auth); 
        window.location.href = "index.html"; 
    } catch (error) { console.error(error); }
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

/* =========================================================================
   7. REAL-TIME SECURITY WATCHER (HISTORY FORCE REDIRECT)
   ========================================================================= */
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const docRef = doc(db, "users_ot", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists() && docSnap.data().basicSalaryProfile) {
                const cloudData = docSnap.data();
                savedRecordsArchive = cloudData.activeRecords || [];
                userBasicSalary = parseFloat(cloudData.basicSalaryProfile) || 2500;
                
                const greetingEl = document.getElementById('history-greeting');
                if (greetingEl) {
                    greetingEl.innerText = `Archived session for: ${cloudData.nickName || cloudData.employeeName || "User"}`;
                }
            } else {
                alert("Akses Disekat: Sila lengkapkan setting profil anda dahulu!");
                window.location.href = "profile-settings.html";
                return;
            }
        } catch (error) { 
            console.error("Firestore retrieval failed:", error); 
        }
        
        // Render UI selepas data diload
        window.tapisSejarahOT();
    } else {
        currentUser = null;
        window.location.href = "index.html"; 
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setInterval(processSystemClock, 1000);
    processSystemClock();
});
onAuthStateChanged(auth, async (user) => {
    const pageLoader = document.getElementById('page-loader');
    const historyContainer = document.getElementById('history-container');

    if (user) {
        // ... logik tarik data dari Firestore ...
        
        // Selesai semua proses, sembunyikan loader & paparkan content
        if (pageLoader) pageLoader.style.display = 'none';
        if (historyContainer) historyContainer.style.display = 'block';

        // Tunjukkan butang logout dan menu hamburger
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('menu-trigger-btn').style.display = 'flex';
    } else {
        window.location.href = "login.html";
    }
});