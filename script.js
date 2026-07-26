import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyAYQ9UKq6teDdfleoCfG_-kjiIf6Gj0DNc", 
    authDomain: "ot-tracker-pro-64415.firebaseapp.com", 
    projectId: "ot-tracker-pro-64415" 
};
const app = initializeApp(firebaseConfig); 
const auth = getAuth(app); 
const db = getFirestore(app);

let currentUser = null;
let basicSalary = 0;
let draftOTList = [];

// =========================================================================
// CSS TAMBAHAN UNTUK MOBILE (HILANGKAN SCROLL & JADIKAN KAD)
// =========================================================================
const mobileStyle = document.createElement('style');
mobileStyle.innerHTML = `
@media (max-width: 768px) {
    .table-responsive { overflow-x: hidden !important; }
    .table-glass thead { display: none !important; }
    .table-glass tbody { border: none !important; }
    .table-glass tr.d-md-none td { display: block; width: 100%; border: none !important; padding: 0 !important; }
    .table-glass tr.empty-state-row td { display: block; width: 100%; border: none !important; text-align: center; }
}
`;
document.head.appendChild(mobileStyle);

// =========================================================================
// PREMIUM ENGLISH TOAST NOTIFICATION
// =========================================================================
function showPremiumToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-success' : (type === 'error' ? 'bg-danger' : 'bg-warning');
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle');
    
    toast.className = `p-3 rounded-3 text-white shadow-lg d-flex align-items-center gap-3 animate-popup ${bgColor} bg-opacity-90`;
    toast.style.backdropFilter = "blur(12px)";
    toast.style.border = "1px solid rgba(255,255,255,0.2)";
    toast.style.minWidth = "250px";
    
    toast.innerHTML = `<i class="fas ${icon} fs-4"></i><div class="fw-bold">${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transform = 'translateX(120%)'; 
        toast.style.transition = 'all 0.4s ease'; 
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
}

// =========================================================================
// AUTHENTICATION LOGIC
// =========================================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userDocRef = doc(db, "users_ot", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                basicSalary = parseFloat(data.basicSalaryProfile) || 0;
                const hourlyRate = (basicSalary / 26 / 8).toFixed(2);
                
                const greetingEl = document.getElementById('dashboard-greeting');
                const salaryEl = document.getElementById('salary-indicator');
                
                let dName = data.nicknameProfile || data.nickName || 'User';
                if(greetingEl) greetingEl.innerText = `Welcome back, ${dName}!`;
                if(salaryEl) salaryEl.innerText = `Hourly Rate: RM ${hourlyRate}/hour`;
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    } else {
        window.location.replace("login.html");
    }
});

// =========================================================================
// DRAFT MANAGEMENT LOGIC
// =========================================================================
window.tambahKeSenaraiTempatan = function(e, source) {
    e.preventDefault();
    
    const dateInput = document.getElementById(`${source}-date`).value;
    const reasonInput = document.getElementById(`${source}-reason`).value.trim();
    const rateInput = parseFloat(document.getElementById(`${source}-rate`).value);
    const hoursInput = parseFloat(document.getElementById(`${source}-hours`).value);

    draftOTList.push({ 
        otDate: dateInput, 
        taskDesc: reasonInput, 
        rateFactor: rateInput, 
        hoursCount: hoursInput 
    });

    e.target.reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById(`${source}-date`).value = today;
    
    if(source === 'mob') {
        const modalEl = document.getElementById('ot-modal');
        if(modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modalInstance.hide();
        }
    }
    
    renderDraftTable();
    showPremiumToast("Task added to draft successfully!", "success");
};

// =========================================================================
// RENDER JADUAL (GABUNGAN DESKTOP TABLE & MOBILE CARD)
// =========================================================================
function renderDraftTable() {
    const tbody = document.getElementById('ot-table-body');
    if (!tbody) return;

    if (draftOTList.length === 0) {
        tbody.innerHTML = `<tr class="empty-state-row"><td colspan="7" class="text-center text-secondary py-4">No drafts added yet.</td></tr>`;
        updateBreakdown();
        return;
    }

    tbody.innerHTML = "";
    let hourlyRate = basicSalary > 0 ? (basicSalary / 26 / 8) : 0;

    draftOTList.forEach((item, index) => {
        let r = item.rateFactor;
        let h = item.hoursCount;
        let totalPay = 0;
        let summaryRateText = `${r.toFixed(1)}x`;

        // Kiraan Gaji
        if (r === 2.0) {
            let jam1 = Math.min(h, 8);
            let jam2 = Math.max(0, h - 8);
            totalPay = (jam1 * 1.5 * hourlyRate) + (jam2 * 2.0 * hourlyRate);
            if (jam2 > 0) summaryRateText = `Mixed`;
        } else if (r === 3.0) {
            let jam1 = Math.min(h, 8);
            let jam2 = Math.max(0, h - 8);
            totalPay = (jam1 * 2.0 * hourlyRate) + (jam2 * 3.0 * hourlyRate);
            if (jam2 > 0) summaryRateText = `Mixed`;
        } else {
            totalPay = h * 1.5 * hourlyRate;
        }

        tbody.innerHTML += `
            <!-- [1] DESKTOP VIEW (Hanya keluar kat PC/Laptop - d-none d-md-table-row) -->
            <tr class="align-middle d-none d-md-table-row" style="cursor: pointer;" onclick="window.bukaDrawerDetails(${index})" title="Click to view detailed receipt">
                <td>${index + 1}</td>
                <td><span class="badge bg-secondary bg-opacity-50 px-2 py-1">${item.otDate}</span></td>
                <td class="fw-semibold text-white">
                    ${item.taskDesc} 
                    <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 ms-2 font-monospace" style="font-size: 0.7rem;">
                        <i class="fas fa-search-plus me-1"></i> Details
                    </span>
                </td>
                <td><span class="text-info">${summaryRateText}</span></td>
                <td>${h.toFixed(1)}h</td>
                <td class="text-success fw-bold">RM ${totalPay.toFixed(2)}</td>
                <td class="text-end" onclick="event.stopPropagation()">
                    <button onclick="window.padamDraft(${index})" class="btn btn-sm btn-outline-danger border-0"><i class="fas fa-trash"></i></button>
                </td>
            </tr>

            <!-- [2] MOBILE VIEW CARD (Hanya keluar kat Phone - d-md-none) -->
            <tr class="d-md-none bg-transparent" style="cursor: pointer;" onclick="window.bukaDrawerDetails(${index})">
                <td colspan="7" class="p-0 border-0">
                    <div class="glass-panel p-3 mb-3 position-relative" style="border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); background: rgba(20,20,20,0.6);">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <span class="badge bg-secondary bg-opacity-50 text-white mb-2 px-2 py-1">${item.otDate}</span>
                                <h6 class="fw-bold text-white mb-0" style="line-height: 1.4;">${item.taskDesc}</h6>
                            </div>
                            <button onclick="event.stopPropagation(); window.padamDraft(${index})" class="btn btn-sm text-danger p-2 border-0 shadow-none">
                                <i class="fas fa-trash fs-5"></i>
                            </button>
                        </div>
                        <div class="d-flex justify-content-between align-items-end mt-3 border-top border-secondary border-opacity-25 pt-3">
                            <div>
                                <div class="text-secondary small mb-1">Rate: <span class="text-info fw-bold">${summaryRateText}</span></div>
                                <div class="text-secondary small">Hours: <span class="text-white fw-bold">${h.toFixed(1)}h</span></div>
                            </div>
                            <div class="text-end">
                                <div class="text-success fw-bold fs-4 mb-1">RM ${totalPay.toFixed(2)}</div>
                                <div class="text-primary mt-1 fw-semibold" style="font-size: 0.75rem; letter-spacing: 0.5px;">
                                    <i class="fas fa-hand-pointer me-1"></i> Tap for details
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    updateBreakdown();
}

// =========================================================================
// FUNGSI BUKA SIDE DRAWER (OFFCANVAS) & PENGIRAAN TERPERINCI
// =========================================================================
window.bukaDrawerDetails = function(index) {
    const item = draftOTList[index];
    const drawerBody = document.getElementById('drawer-content-body');
    if (!drawerBody) return;

    let hourlyRate = basicSalary > 0 ? (basicSalary / 26 / 8) : 0;
    let r = item.rateFactor;
    let h = item.hoursCount;
    let breakdownHtml = "";
    let totalPay = 0;

    const makeRow = (title, hours, rateMultiplier, pay) => {
        return `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="text-secondary small" style="width: 45%; line-height: 1.2;">${title}</div>
                <div class="text-end" style="width: 55%;">
                    <div class="text-secondary mb-1" style="font-size: 0.75rem;">${hours.toFixed(1)}h &times; RM ${(hourlyRate * rateMultiplier).toFixed(2)}</div>
                    <div class="text-white fw-bold" style="font-size: 1rem;">RM ${pay.toFixed(2)}</div>
                </div>
            </div>
        `;
    };

    if (r === 2.0) {
        let jam1 = Math.min(h, 8);
        let jam2 = Math.max(0, h - 8);
        let p1 = jam1 * 1.5 * hourlyRate;
        let p2 = jam2 * 2.0 * hourlyRate;
        totalPay = p1 + p2;

        breakdownHtml += makeRow("First 8.0 Hours (1.5x)", jam1, 1.5, p1);
        if (jam2 > 0) breakdownHtml += makeRow("Remaining Hours (2.0x)", jam2, 2.0, p2);
        
    } else if (r === 3.0) {
        let jam1 = Math.min(h, 8);
        let jam2 = Math.max(0, h - 8);
        let p1 = jam1 * 2.0 * hourlyRate;
        let p2 = jam2 * 3.0 * hourlyRate;
        totalPay = p1 + p2;

        breakdownHtml += makeRow("First 8.0 Hours (2.0x)", jam1, 2.0, p1);
        if (jam2 > 0) breakdownHtml += makeRow("<span style='color: var(--brand-purple);'>Remaining Hours (3.0x)</span>", jam2, 3.0, p2);
        
    } else {
        totalPay = h * 1.5 * hourlyRate;
        breakdownHtml += makeRow("Standard Overtime (1.5x)", h, 1.5, totalPay);
    }

    drawerBody.innerHTML = `
        <div class="mb-4">
            <div class="d-inline-block px-3 py-1 mb-3 rounded-pill" style="background: rgba(13, 110, 253, 0.15); border: 1px solid rgba(13, 110, 253, 0.3); color: #6ea8fe; font-size: 0.8rem; font-weight: 600;">
                <i class="fas fa-calendar-alt me-1"></i> ${item.otDate}
            </div>
            <h4 class="fw-bold text-white mb-1" style="line-height: 1.3;">${item.taskDesc}</h4>
            <p class="text-secondary small">Record Index #${index + 1}</p>
        </div>

        <div class="p-4 mb-4 rounded-4" style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05);">
            <h6 class="text-uppercase text-secondary fw-bold mb-3 border-bottom border-secondary border-opacity-25 pb-3" style="font-size: 0.75rem; letter-spacing: 1px;">Calculation Breakdown</h6>
            
            ${breakdownHtml}
            
            <div class="d-flex justify-content-between align-items-center pt-3 mt-2 border-top border-secondary border-opacity-25">
                <span class="fw-bold text-white">Total Payout</span>
                <span class="fs-3 fw-bold text-success">RM ${totalPay.toFixed(2)}</span>
            </div>
        </div>

        <div class="p-3 rounded-3 d-flex gap-3 align-items-start" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
            <i class="fas fa-info-circle text-primary fs-5 mt-1"></i>
            <div class="text-secondary" style="font-size: 0.8rem; line-height: 1.5;">
                This calculation strictly follows the Malaysian Employment Act guidelines regarding split-rate thresholds for Rest Days and Public Holidays.
            </div>
        </div>
    `;

    const drawerEl = document.getElementById('taskDetailDrawer');
    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(drawerEl);
    offcanvas.show();
};

window.padamDraft = function(index) {
    draftOTList.splice(index, 1);
    renderDraftTable();
    showPremiumToast("Draft task removed.", "warning");
};

function updateBreakdown() {
    let total1_5 = 0, total2_0 = 0, total3_0 = 0;
    let grandTotalPay = 0;
    let hourlyRate = basicSalary > 0 ? (basicSalary / 26 / 8) : 0;

    draftOTList.forEach(item => {
        let h = item.hoursCount;
        let r = item.rateFactor;

        if (r === 1.5) {
            total1_5 += h;
            grandTotalPay += (h * 1.5 * hourlyRate);
        } else if (r === 2.0) {
            let jamPertama = Math.min(h, 8);
            let jamBaki = Math.max(0, h - 8);
            total1_5 += jamPertama;
            total2_0 += jamBaki;
            grandTotalPay += (jamPertama * 1.5 * hourlyRate) + (jamBaki * 2.0 * hourlyRate);
        } else if (r === 3.0) {
            let jamPertama = Math.min(h, 8);
            let jamBaki = Math.max(0, h - 8);
            total2_0 += jamPertama;
            total3_0 += jamBaki;
            grandTotalPay += (jamPertama * 2.0 * hourlyRate) + (jamBaki * 3.0 * hourlyRate);
        }
    });

    const el15 = document.getElementById('breakdown-1-5');
    const el20 = document.getElementById('breakdown-2-0');
    const el30 = document.getElementById('breakdown-3-0');
    const elGrand = document.getElementById('grand-total-val');
    
    if(el15) el15.innerText = `${total1_5.toFixed(1)}h`;
    if(el20) el20.innerText = `${total2_0.toFixed(1)}h`;
    if(el30) el30.innerText = `${total3_0.toFixed(1)}h`;
    if(elGrand) elGrand.innerText = `RM ${grandTotalPay.toFixed(2)}`;
}

window.simpanKeCloud = async function() {
    if (!currentUser) {
        showPremiumToast("Authentication error. Please login again.", "error");
        return;
    }
    
    if (draftOTList.length === 0) {
        showPremiumToast("Draft is empty! Please add tasks first.", "warning");
        return;
    }

    const btn = document.querySelector('button[onclick="window.simpanKeCloud()"]');
    if(!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>Committing...`;
    btn.disabled = true;

    try {
        const userDocRef = doc(db, "users_ot", currentUser.uid);
        
        const recordsToSave = draftOTList.map(item => ({
            ...item,
            recordId: `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString()
        }));

        await updateDoc(userDocRef, {
            activeRecords: arrayUnion(...recordsToSave)
        });

        draftOTList = [];
        renderDraftTable();
        showPremiumToast("Data successfully committed to Cloud!", "success");

    } catch (error) {
        console.error("Cloud Commit Error: ", error);
        showPremiumToast(`Failed to commit: ${error.message}`, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.logKeluarSistem = async function() {
    try { 
        await signOut(auth); 
        window.location.replace("login.html"); 
    } catch (error) { 
        console.error(error); 
        showPremiumToast("Logout failed.", "error");
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

// =========================================================================
// LOGIK NATIVE BACK BUTTON (TUTUP DRAWER BILA SWIPE BACK)
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initPremiumUI(); 
    
    const mobRateSelect = document.getElementById('mob-rate');
    const deskRateSelect = document.getElementById('desk-rate');
    const choicesOptions = { searchEnabled: false, itemSelectText: '', shouldSort: false };
    
    if (mobRateSelect && typeof Choices !== 'undefined') new Choices(mobRateSelect, choicesOptions);
    if (deskRateSelect && typeof Choices !== 'undefined') new Choices(deskRateSelect, choicesOptions);
    
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('mob-date')) document.getElementById('mob-date').value = today;
    if(document.getElementById('desk-date')) document.getElementById('desk-date').value = today;

    // Event Listener untuk Drawer (Offcanvas)
    const drawerEl = document.getElementById('taskDetailDrawer');
    if(drawerEl) {
        drawerEl.addEventListener('show.bs.offcanvas', () => {
            // Push state ke browser history bila drawer dibuka
            window.history.pushState({ offcanvasOpen: true }, "");
        });
        
        drawerEl.addEventListener('hidden.bs.offcanvas', () => {
            // Pastikan state dibuang dari history bila ditutup melalui butang 'X'
            if (history.state && history.state.offcanvasOpen) {
                window.history.back();
            }
        });
    }

    // Tangkap bila user swipe back kat phone
    window.addEventListener('popstate', (e) => {
        const drawerEl = document.getElementById('taskDetailDrawer');
        if (drawerEl && drawerEl.classList.contains('show')) {
            const offcanvas = bootstrap.Offcanvas.getInstance(drawerEl);
            if(offcanvas) {
                offcanvas.hide(); // Tutup drawer bila tekan back fizikal/swipe
            }
        }
    });
});