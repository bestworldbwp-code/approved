// ================= 1. CONFIG (ตั้งค่าระบบ) =================
const CONFIG = {
    supaUrl: 'https://pufddwdcpugilwlavban.supabase.co', 
    supaKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZmRkd2RjcHVnaWx3bGF2YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODY1MDUsImV4cCI6MjA3NDk2MjUwNX0.6dyYteDu6QSkTL9hIiaHw_2WeltSGSIoMSvx3OcEjN0', 
    
    emailPublicKey: 'rEly1Il6Xz0qZwaSc',   
    emailServiceId: 'YOUR_SERVICE_ID',   
    emailTemplateId_Master: 'service_tolm3pu', 

    bossEmail: 'bestworld.bwp328@gmail.com',          
    purchasingEmail: 'jakkidmarat@gmail.com',
    adminPassword: '1234' 
};

// ================= 2. LOGO CONFIG (ใส่รหัสที่นี่) =================
// วิธีวาง: ให้วางรหัสยาวๆ ระหว่างเครื่องหมาย ` (ปุ่มเปลี่ยนภาษา)
// ต้องขึ้นต้นด้วย data:image... เสมอ ห้ามมีเว้นวรรค
const LOGO_BASE64 = `data:image/png;base64,วางรหัสBase64ยาวๆของคุณทับข้อความนี้เลยครับ`;


// ================= 3. SYSTEM LOGIC =================

const db = supabase.createClient(CONFIG.supaUrl, CONFIG.supaKey);
if(typeof emailjs !== 'undefined') emailjs.init(CONFIG.emailPublicKey);

document.addEventListener("DOMContentLoaded", function() {
    console.log("System Started...");

    // --- ส่วนจัดการ LOGO ---
    const images = document.querySelectorAll('.app-logo');
    if (images.length > 0) {
        console.log("Found " + images.length + " logo placeholders.");
        images.forEach(img => {
            img.src = LOGO_BASE64;
            // ถ้าโหลดรูปไม่ขึ้น ให้แสดง Error ใน Console
            img.onerror = function() {
                console.error("❌ โหลดรูป Logo ไม่ได้! เช็คว่ารหัส Base64 ถูกต้องหรือไม่");
            };
        });
    } else {
        console.warn("⚠️ ไม่พบแท็กรูปภาพที่มี class='app-logo' ในหน้าเว็บนี้");
    }

    // --- ส่วนป้องกันหน้า ADMIN ---
    if (window.location.href.includes('admin.html')) {
        if (!sessionStorage.getItem('isAdmin')) {
            // ใช้ setTimeout เพื่อให้ Logo โหลดเสร็จก่อนค่อยถามรหัส
            setTimeout(() => {
                const input = prompt("🔒 กรุณาใส่รหัสผ่าน Admin:");
                if (input === CONFIG.adminPassword) {
                    sessionStorage.setItem('isAdmin', 'true');
                } else {
                    alert("รหัสผ่านไม่ถูกต้อง!");
                    window.location.href = "index.html"; 
                }
            }, 500);
        }
    }
});

// --- PART 1: FORM FUNCTIONS ---
window.addItemRow = function() {
    const container = document.getElementById('itemsContainer');
    if (!container) return; 
    const rowId = Date.now(); 
    const html = `
    <div class="item-row border p-3 mb-3 rounded bg-light shadow-sm" id="row-${rowId}">
        <div class="row g-3">
            <div class="col-md-3"><label class="small text-muted">รหัสสินค้า</label><input type="text" class="form-control item-code"></div>
            <div class="col-md-5"><label class="small text-muted">รายละเอียด</label><input type="text" class="form-control item-desc" required></div>
            <div class="col-md-2"><label class="small text-muted">จำนวน</label><input type="number" class="form-control item-qty" required></div>
            <div class="col-md-2"><label class="small text-muted">หน่วย</label><input type="text" class="form-control item-unit"></div>
        </div>
        <div class="text-end mt-2"><button type="button" class="btn btn-outline-danger btn-sm" onclick="removeRow('${rowId}')">🗑️ ลบรายการนี้</button></div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
}
window.removeRow = function(id) { document.getElementById(`row-${id}`)?.remove(); }
if (document.getElementById('itemsContainer')) window.addItemRow();

// --- SUBMIT FORM ---
const prForm = document.getElementById('prForm');
if (prForm) {
    prForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmit');
        const originalText = btn.innerText;
        btn.disabled = true; 

        try {
            let publicUrl = null;
            const fileInput = document.getElementById('attachment');
            if (fileInput.files.length > 0) {
                btn.innerText = '⏳ กำลังอัปโหลดไฟล์...';
                const file = fileInput.files[0];
                const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
                const { error: upErr } = await db.storage.from('pr-files').upload(fileName, file);
                if (upErr) throw upErr;
                const { data: urlData } = db.storage.from('pr-files').getPublicUrl(fileName);
                publicUrl = urlData.publicUrl;
            }

            btn.innerText = '⏳ กำลังบันทึก...';
            const items = [];
            document.querySelectorAll('.item-row').forEach(row => {
                items.push({
                    code: row.querySelector('.item-code').value,
                    description: row.querySelector('.item-desc').value,
                    quantity: row.querySelector('.item-qty').value,
                    unit: row.querySelector('.item-unit').value,
                    status: 'pending',
                    remark: ''
                });
            });

            const payload = {
                department: document.getElementById('department').value,
                pr_number: document.getElementById('pr_number').value,
                requester: document.getElementById('requester').value,
                email: document.getElementById('email').value,
                required_date: document.getElementById('required_date').value,
                header_remark: document.getElementById('header_remark').value,
                items: items,
                attachment_url: publicUrl,
                status: 'pending'
            };

            const { error } = await db.from('purchase_requests').insert([payload]);
            if (error) throw error;

            btn.innerText = '⏳ กำลังส่งอีเมล...';
            const adminLink = window.location.origin + '/admin.html';
            const bossHtml = `
                <h3>เรียน หัวหน้างาน,</h3>
                <p>มีรายการขอซื้อใหม่เข้ามา รอการอนุมัติครับ</p>
                <ul>
                    <li><b>เลขที่ PR:</b> ${payload.pr_number}</li>
                    <li><b>ผู้ขอ:</b> ${payload.requester}</li>
                    <li><b>จำนวนรายการ:</b> ${items.length} รายการ</li>
                </ul>
                <p>กรุณาตรวจสอบและอนุมัติที่ลิงก์นี้: <a href="${adminLink}">คลิกเพื่ออนุมัติ</a></p>
            `;

            await emailjs.send(CONFIG.emailServiceId, CONFIG.emailTemplateId_Master, {
                to_email: CONFIG.bossEmail,
                subject: `[New Request] มีรายการขอซื้อใหม่ ${payload.pr_number}`,
                html_content: bossHtml
            });

            alert('✅ ส่งใบขอซื้อเรียบร้อยแล้ว!');
            window.location.reload();

        } catch (err) {
            console.error(err);
            alert('❌ Error: ' + err.message);
        } finally {
            btn.disabled = false; btn.innerText = originalText;
        }
    });
}

// --- PART 2: ADMIN ---
let allPRs = []; let currentPR = {}; let currentMode = 'pending'; 

window.switchTab = function(mode) {
    currentMode = mode;
    if (mode === 'pending') {
        document.getElementById('btnPending').classList.add('active', 'btn-primary');
        document.getElementById('btnPending').classList.remove('btn-outline-primary');
        document.getElementById('btnHistory').classList.remove('active', 'btn-secondary');
        document.getElementById('btnHistory').classList.add('btn-outline-secondary');
    } else {
        document.getElementById('btnHistory').classList.add('active', 'btn-secondary');
        document.getElementById('btnHistory').classList.remove('btn-outline-secondary');
        document.getElementById('btnPending').classList.remove('active', 'btn-primary');
        document.getElementById('btnPending').classList.add('btn-outline-primary');
    }
    loadPRs();
}

async function loadPRs() {
    const tableBody = document.getElementById('prTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">⏳ กำลังโหลดข้อมูล...</td></tr>';

    try {
        let query = db.from('purchase_requests').select('*').order('created_at', { ascending: false });
        if (currentMode === 'pending') query = query.eq('status', 'pending');
        else query = query.neq('status', 'pending'); 

        const { data, error } = await query;
        if (error) throw error;
        
        allPRs = data;
        tableBody.innerHTML = '';
        
        if (data.length === 0) {
            const msg = currentMode === 'pending' ? '🎉 ไม่มีรายการรออนุมัติ' : '📭 ยังไม่มีประวัติรายการ';
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-5 text-muted">${msg}</td></tr>`;
            return;
        }

        data.forEach(pr => {
            const createdDate = new Date(pr.created_at).toLocaleDateString('th-TH');
            let statusBadge = '';
            if (currentMode === 'pending') {
                const pendingCount = pr.items ? pr.items.filter(i => i.status === 'pending').length : 0;
                statusBadge = pendingCount > 0 ? `<span class="badge bg-warning text-dark">รอตรวจ ${pendingCount} รายการ</span>` : `<span class="badge bg-success">ตรวจครบแล้ว</span>`;
            } else {
                statusBadge = `<span class="badge bg-secondary">${pr.status === 'processed' ? 'ดำเนินการแล้ว' : pr.status}</span>`;
            }
            
            let attachBtn = pr.attachment_url ? `<a href="${pr.attachment_url}" target="_blank" class="btn btn-sm btn-outline-secondary">📎 ไฟล์</a>` : '-';
            let actionBtn = currentMode === 'pending' 
                ? `<button onclick="openDetailModal(${pr.id})" class="btn btn-primary btn-sm rounded-pill px-3">🔍 ตรวจสอบ</button>`
                : `<button onclick="openDetailModal(${pr.id})" class="btn btn-outline-info btn-sm rounded-pill px-3">📄 ดูรายละเอียด</button>`;

            const row = `<tr><td><span class="fw-bold text-primary">${pr.pr_number}</span></td><td>${createdDate}</td><td><div class="fw-bold">${pr.requester}</div><div class="small text-muted">${pr.department}</div></td><td>${statusBadge}</td><td class="text-center">${attachBtn}</td><td class="text-center">${actionBtn}</td></tr>`;
            tableBody.innerHTML += row;
        });
    } catch (err) { tableBody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error: ${err.message}</td></tr>`; }
}

window.openDetailModal = function(id) {
    currentPR = allPRs.find(p => p.id === id);
    if (!currentPR) return;
    document.getElementById('m_pr_number').innerText = currentPR.pr_number;
    document.getElementById('m_required_date').innerText = new Date(currentPR.required_date).toLocaleDateString('th-TH');
    document.getElementById('m_requester').innerText = currentPR.requester;
    document.getElementById('m_department').innerText = currentPR.department;
    document.getElementById('m_remark').innerText = currentPR.header_remark || '-';
    document.getElementById('m_attachment').innerHTML = currentPR.attachment_url ? `<a href="${currentPR.attachment_url}" target="_blank" class="btn btn-sm btn-outline-primary">📎 ดูไฟล์แนบ</a>` : '-';
    renderItemsTable();
    const saveBtn = document.querySelector('.modal-footer .btn-success');
    if (currentMode === 'history') saveBtn.style.display = 'none';
    else { saveBtn.style.display = 'block'; saveBtn.disabled = false; saveBtn.innerText = '💾 บันทึกผลและส่งเมลแจ้งเตือน'; }
    new bootstrap.Modal(document.getElementById('detailModal')).show();
}

function renderItemsTable() {
    const itemsTable = document.getElementById('m_itemsTable');
    itemsTable.innerHTML = '';
    if (currentPR.items) {
        currentPR.items.forEach((item, index) => {
            let statusBadge = '<span class="badge bg-secondary">รอพิจารณา</span>';
            let actionButtons = '';
            if (currentMode === 'pending') {
                actionButtons = `<button onclick="updateItemStatus(${index}, 'approved')" class="btn btn-success btn-sm">✅</button> <button onclick="rejectItemPrompt(${index})" class="btn btn-outline-danger btn-sm">❌</button>`;
            }
            if (item.status === 'approved') { statusBadge = '<span class="badge bg-success">✅ อนุมัติ</span>'; if(currentMode === 'pending') actionButtons = '<small class="text-success">เรียบร้อย</small>'; } 
            else if (item.status === 'rejected') { statusBadge = `<span class="badge bg-danger" title="${item.remark}">❌ ไม่อนุมัติ</span>`; if(currentMode === 'pending') actionButtons = '<small class="text-danger">เรียบร้อย</small>'; }
            const row = `<tr><td>${item.code || '-'}</td><td>${item.description} ${item.status === 'rejected' ? `<div class="text-danger small">เหตุผล: ${item.remark}</div>` : ''}</td><td class="text-center">${item.quantity} ${item.unit || ''}</td><td class="text-center">${statusBadge}</td><td class="text-center">${actionButtons}</td></tr>`;
            itemsTable.innerHTML += row;
        });
    }
}

window.updateItemStatus = async function(index, status, reason = '') {
    currentPR.items[index].status = status;
    currentPR.items[index].remark = reason;
    const { error } = await db.from('purchase_requests').update({ items: currentPR.items }).eq('id', currentPR.id);
    if (error) { alert('Error: ' + error.message); return; }
    renderItemsTable();
}

window.rejectItemPrompt = function(index) {
    const reason = prompt("ระบุเหตุผลที่ไม่อนุมัติ:");
    if (reason === null) return;
    if (reason.trim() === "") { alert("ต้องระบุเหตุผลครับ"); return; }
    updateItemStatus(index, 'rejected', reason);
}

window.finalizeApproval = async function() {
    const pendingItems = currentPR.items.filter(i => i.status === 'pending' || !i.status);
    if (pendingItems.length > 0) {
        if(!confirm(`ยังมี ${pendingItems.length} รายการที่ไม่ได้ตรวจ\nระบบจะถือว่า "ไม่อนุมัติ" ทั้งหมด ยืนยันหรือไม่?`)) return;
        currentPR.items.forEach(i => { if(i.status === 'pending' || !i.status) { i.status = 'rejected'; i.remark = 'Auto-rejected'; } });
    }

    const btn = document.querySelector('.modal-footer .btn-success');
    if(btn) { btn.disabled = true; btn.innerText = '⏳ กำลังส่งเมล...'; }

    try {
        await db.from('purchase_requests').update({ status: 'processed', items: currentPR.items }).eq('id', currentPR.id);
        const printLink = window.location.origin + `/view_pr.html?id=${currentPR.id}`;

        let staffTable = `<table style="width:100%; border-collapse: collapse; border: 1px solid #ddd;"><tr style="background-color: #f8f9fa;"><th style="border: 1px solid #ddd; padding: 8px;">รายการ</th><th style="border: 1px solid #ddd; padding: 8px;">จำนวน</th><th style="border: 1px solid #ddd; padding: 8px;">ผลการพิจารณา</th></tr>`;
        let purchasingTable = `<table style="width:100%; border-collapse: collapse; border: 1px solid #ddd;"><tr style="background-color: #d4edda;"><th style="border: 1px solid #ddd; padding: 8px;">รหัส</th><th style="border: 1px solid #ddd; padding: 8px;">รายการ (อนุมัติแล้ว)</th><th style="border: 1px solid #ddd; padding: 8px;">จำนวน</th></tr>`;
        let hasApprovedItems = false;

        currentPR.items.forEach(i => {
            const color = i.status === 'approved' ? 'green' : 'red';
            const statusText = i.status === 'approved' ? '✅ อนุมัติ' : `❌ ไม่ผ่าน (${i.remark})`;
            staffTable += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${i.description}</td><td style="border: 1px solid #ddd; padding: 8px;">${i.quantity} ${i.unit}</td><td style="border: 1px solid #ddd; padding: 8px; color:${color};"><b>${statusText}</b></td></tr>`;
            if(i.status === 'approved') {
                hasApprovedItems = true;
                purchasingTable += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${i.code||'-'}</td><td style="border: 1px solid #ddd; padding: 8px;">${i.description}</td><td style="border: 1px solid #ddd; padding: 8px;">${i.quantity} ${i.unit}</td></tr>`;
            }
        });
        staffTable += `</table>`;
        purchasingTable += `</table>`;

        let requesterEmail = currentPR.email ? currentPR.email.trim() : '';
        if (requesterEmail && requesterEmail.includes('@')) {
            const staffHtml = `<h3>เรียน คุณ ${currentPR.requester}</h3><p>ผลการอนุมัติใบขอซื้อเลขที่ <b>${currentPR.pr_number}</b>:</p>${staffTable}<br><p>ดูเอกสารฉบับเต็มและพิมพ์ PDF: <a href="${printLink}">คลิกที่นี่</a></p>`;
            await emailjs.send(CONFIG.emailServiceId, CONFIG.emailTemplateId_Master, { to_email: requesterEmail, subject: `[Result] ผลการอนุมัติ PR ${currentPR.pr_number}`, html_content: staffHtml });
        }

        if(hasApprovedItems) {
            let purchaseEmail = CONFIG.purchasingEmail ? CONFIG.purchasingEmail.trim() : '';
            if (purchaseEmail && purchaseEmail.includes('@')) {
                const purchasingHtml = `<h3>เรียน ฝ่ายจัดซื้อ</h3><p>ใบขอซื้อเลขที่ <b>${currentPR.pr_number}</b> ได้รับการอนุมัติแล้ว</p><p>ผู้ขอ: ${currentPR.requester} | แผนก: ${currentPR.department}</p>${purchasingTable}<br><p>ลิงก์เอกสาร: <a href="${printLink}">คลิกที่นี่</a></p>`;
                await emailjs.send(CONFIG.emailServiceId, CONFIG.emailTemplateId_Master, { to_email: purchaseEmail, subject: `[Approved] สั่งซื้อ PR ${currentPR.pr_number}`, html_content: purchasingHtml });
            }
        }

        alert('✅ บันทึกผลและแจ้งเตือนทางเมลเรียบร้อย!');
        bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();
        loadPRs();

    } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
        if(btn) btn.disabled = false;
    }
}

// --- PART 3: VIEW ---
async function loadPRForPrint() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    try {
        const { data: pr, error } = await db.from('purchase_requests').select('*').eq('id', id).single();
        if (error) throw error;
        document.getElementById('v_pr_number').innerText = pr.pr_number;
        document.getElementById('v_created_at').innerText = new Date(pr.created_at).toLocaleDateString('th-TH');
        document.getElementById('v_requester').innerText = pr.requester;
        document.getElementById('v_department').innerText = pr.department;
        document.getElementById('v_doc_status').innerText = pr.status === 'processed' ? 'ดำเนินการแล้ว' : 'รออนุมัติ';
        document.getElementById('v_remark').innerText = pr.header_remark || '-';
        document.getElementById('v_sign_requester').innerText = `(${pr.requester})`;
        const tbody = document.getElementById('v_tableBody');
        tbody.innerHTML = '';
        if (pr.items) {
            pr.items.forEach((item, index) => {
                let statusText = '⏳ รอพิจารณา';
                if (item.status === 'approved') statusText = '<span class="text-success fw-bold">✅ อนุมัติ</span>';
                else if (item.status === 'rejected') statusText = `<span class="text-danger text-decoration-line-through">❌ ไม่อนุมัติ</span> <small>(${item.remark})</small>`;
                tbody.innerHTML += `<tr><td class="text-center">${index + 1}</td><td>${item.code || '-'}</td><td>${item.description}</td><td class="text-center">${item.quantity}</td><td class="text-center">${item.unit}</td><td class="text-center">${statusText}</td></tr>`;
            });
        }
    } catch (err) { alert('Error: ' + err.message); }
}

if(document.getElementById('v_tableBody')) window.onload = loadPRForPrint;
if(document.getElementById('prTableBody')) window.onload = loadPRs;
