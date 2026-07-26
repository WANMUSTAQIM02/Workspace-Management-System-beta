import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", authDomain: "ot-tracker-pro-64415.firebaseapp.com", projectId: "ot-tracker-pro-64415" };
const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app);

let currentUser = null; let basicSalary = 0; let totalOTPayBulanIni = 0; let totalPerbelanjaanBulanIni = 0; let unsubscribeExpenses = null; let globalActiveRecords = []; 
const tarikhSekarang = new Date(); let selectedMonthString = `${tarikhSekarang.getFullYear()}-${String(tarikhSekarang.getMonth() + 1).padStart(2, '0')}`;

function initPremiumUI() {
    const canvas = document.getElementById('bg-canvas');
    if(canvas) {
        const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight);
        const geom = new THREE.BufferGeometry(); const posArray = new Float32Array(500 * 3);
        for(let i=0; i<500*3; i++) posArray[i] = (Math.random() - 0.5) * 10;
        geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const mat = new THREE.PointsMaterial({ size: 0.005, color: 0x0d6efd }); const mesh = new THREE.Points(geom, mat); scene.add(mesh); camera.position.z = 3;
        function animate() { requestAnimationFrame(animate); mesh.rotation.y += 0.001; renderer.render(scene, camera); } animate();
        gsap.to(".gsap-element", { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out" });
    }
}

// LOGIK KIRAAN SOCSO, EPF, SKBBK
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userDoc = await getDoc(doc(db, "users_ot", user.uid));
            if (userDoc.exists()) { const cloudData = userDoc.data(); basicSalary = parseFloat(cloudData.basicSalaryProfile) || 0; globalActiveRecords = cloudData.activeRecords || []; kiraOTDariDatabase(); }
            dengarDataExpensesRealTime(user.uid);
        } catch (error) { console.error(error); }
    } else { window.location.href = "login.html"; }
});

window.tukarBulanKewangan = function() {
    selectedMonthString = document.getElementById('month-filter').value; 
    const [tahun, bulan] = selectedMonthString.split('-'); const dateObj = new Date(tahun, parseInt(bulan) - 1);
    document.getElementById('budget-month-label').innerText = `Ledger tracking for ${dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    if (currentUser) { kiraOTDariDatabase(); dengarDataExpensesRealTime(currentUser.uid); }
};

function kiraOTDariDatabase() {
    totalOTPayBulanIni = 0; const [selYearStr, selMonthStr] = selectedMonthString.split('-');
    const selYear = parseInt(selYearStr, 10); const selMonth = parseInt(selMonthStr, 10); const hourlyRate = basicSalary / 26 / 8;

    globalActiveRecords.forEach(row => {
        if (!row.otDate) return;
        const parts = row.otDate.includes('/') ? row.otDate.split('/') : row.otDate.split('-');
        let day = parseInt(parts[0], 10), month = parseInt(parts[1], 10), year = parseInt(parts[2], 10) || selYear;
        if(row.otDate.includes('-')) { year = parseInt(parts[0], 10); month = parseInt(parts[1], 10); day = parseInt(parts[2], 10); }
        let targetPayrollMonth = month; let targetPayrollYear = year;
        if (day > 15) { targetPayrollMonth = month + 1; if (targetPayrollMonth > 12) { targetPayrollMonth = 1; targetPayrollYear += 1; } }
        if (targetPayrollMonth === selMonth && targetPayrollYear === selYear) totalOTPayBulanIni += (hourlyRate * (parseFloat(row.hoursCount)||0) * (parseFloat(row.rateFactor)||0));
    });
    kemaskiniPaparanKunciKiraKira();
}

function dengarDataExpensesRealTime(uid) {
    if (unsubscribeExpenses) unsubscribeExpenses();
    unsubscribeExpenses = onSnapshot(query(collection(db, "users_ot", uid, "expenses_records"), orderBy("datePaid", "desc")), (snapshot) => {
        const tBody = document.getElementById('expense-table-body'); if (!tBody) return; tBody.innerHTML = "";
        totalPerbelanjaanBulanIni = 0; let indeks = 1;
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.datePaid && data.datePaid.startsWith(selectedMonthString)) {
                const amaun = parseFloat(data.amount) || 0; totalPerbelanjaanBulanIni += amaun;
                tBody.innerHTML += `<tr><td>${indeks++}</td><td class="text-secondary small">${data.datePaid}</td><td class="fw-semibold">${data.description}</td><td><span class="badge bg-secondary bg-opacity-50">${data.category}</span></td><td class="text-danger fw-bold">- RM ${amaun.toFixed(2)}</td><td class="text-end"><button onclick="window.padamExpenseCloud('${docSnap.id}')" class="btn btn-sm btn-outline-danger border-0"><i class="fas fa-trash"></i></button></td></tr>`;
            }
        });
        kemaskiniPaparanKunciKiraKira();
    });
}

function kemaskiniPaparanKunciKiraKira() {
    const potongEPF = basicSalary * 0.11; let potongSOCSO = 0, potongEIS = 0; const totalGajiKasar = basicSalary + totalOTPayBulanIni;
    if (totalGajiKasar > 0) {
        let gajiSiling = totalGajiKasar > 6000 ? 6000 : totalGajiKasar;
        let nilaiTengah = (Math.ceil(gajiSiling / 100) * 100) - 50; if (gajiSiling % 100 === 0) nilaiTengah = gajiSiling - 50;
        potongSOCSO = nilaiTengah * 0.005; potongEIS = nilaiTengah * 0.002;
    }
    const potonganSKBBK = 23.65; const jumlahPotonganWajib = potongEPF + potongSOCSO + potongEIS + potonganSKBBK;
    const nettWages = totalGajiKasar - jumlahPotonganWajib; const bakiBersihPocket = nettWages - totalPerbelanjaanBulanIni;

    document.getElementById('total-income-val').innerText = `RM ${nettWages.toFixed(2)}`;
    document.getElementById('total-expenses-val').innerText = `RM ${totalPerbelanjaanBulanIni.toFixed(2)}`;
    document.getElementById('net-balance-val').innerText = `RM ${bakiBersihPocket.toFixed(2)}`;
    document.getElementById('net-balance-val').className = bakiBersihPocket < 0 ? "fw-bold mb-0 text-danger" : "fw-bold mb-0 text-primary";
    
    document.getElementById('deduction-epf-val').innerText = `- RM ${potongEPF.toFixed(2)}`;
    document.getElementById('deduction-socso-val').innerText = `- RM ${potongSOCSO.toFixed(2)}`;
    document.getElementById('deduction-eis-val').innerText = `- RM ${potongEIS.toFixed(2)}`;
}

window.tambahExpenseCloud = async function(e) {
    e.preventDefault(); if (!currentUser) return;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    try {
        await addDoc(collection(db, "users_ot", currentUser.uid, "expenses_records"), { datePaid: document.getElementById('exp-date').value, description: document.getElementById('exp-reason').value.trim(), category: document.getElementById('exp-category').value, amount, createdAt: serverTimestamp() });
        document.getElementById('expense-input-form').reset(); document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
        bootstrap.Modal.getInstance(document.getElementById('expense-modal')).hide();
    } catch (error) { alert("Failed: " + error.message); }
};

// Variable untuk simpan ID sementara sebelum delete
let expenseToDeleteId = null;

window.padamExpenseCloud = function(idDoc) {
    // Simpan ID yang nak didelete
    expenseToDeleteId = idDoc;
    
    // Panggil Glass Modal kita
    const modalEl = document.getElementById('confirm-expense-modal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Bila butang "Delete Permanently" ditekan
    document.getElementById('confirm-expense-proceed-btn').onclick = async () => {
        modal.hide();
        if (!currentUser || !expenseToDeleteId) return;
        
        try {
            await deleteDoc(doc(db, "users_ot", currentUser.uid, "expenses_records", expenseToDeleteId));
            expenseToDeleteId = null; // Reset ID
        } catch (error) {
            alert("Failed to delete: " + error.message);
        }
    };
};

window.logKeluarSistem = async function() {
    try { 
        const { getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
        const authInstance = getAuth();
        await signOut(authInstance); 
        window.location.href = "login.html"; 
    } catch (e) { 
        console.error(e); 
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initPremiumUI();
    
    // 1. Initialize Dropdown Bulan
    const selectBulan = document.getElementById('month-filter');
    if (selectBulan) {
        const hariIni = new Date(); const options = [];
        for (let i = -6; i <= 6; i++) {
            const d = new Date(hariIni.getFullYear(), hariIni.getMonth() + i, 1);
            options.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), selected: i === 0 });
        }
        new Choices(selectBulan, { choices: options, searchEnabled: false, itemSelectText: '' });
    }

    // 2. Initialize Dropdown Category
    const expCategory = document.getElementById('exp-category');
    if (expCategory) {
        new Choices(expCategory, {
            searchEnabled: false,
            itemSelectText: '',
            shouldSort: false // Kekalkan susunan asal
        });
    }

    if (document.getElementById('exp-date')) {
        document.getElementById('exp-date').value = tarikhSekarang.toISOString().split('T')[0];
    }
});