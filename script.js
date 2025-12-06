// ================= 1. CONFIG (ตั้งค่าระบบ) =================
const CONFIG = {
    // Supabase
    supaUrl: 'https://pufddwdcpugilwlavban.supabase.co', 
    supaKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZmRkd2RjcHVnaWx3bGF2YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODY1MDUsImV4cCI6MjA3NDk2MjUwNX0.6dyYteDu6QSkTL9hIiaHw_2WeltSGSIoMSvx3OcEjN0', 
    
    // EmailJS
    emailPublicKey: 'rEly1Il6Xz0qZwaSc',   
    emailServiceId: 'service_tolm3pu',   
    emailTemplateId_Master: 'template_master', 

    // --------------------------------------------------------
    // [จุดที่ต้องเช็ค] ใส่อีเมลจริงๆ ของทุกคนตรงนี้ครับ
    // --------------------------------------------------------
    bossEmail: '่jakkidmarat@gmail.com',         // อีเมล คุณศุภรัตน์ (คนตรวจคนแรก)
    managerEmail: 'bestworld.bwp328@gmail.com',     // อีเมล คุณเบญจมาศ (คนอนุมัติคนที่สอง) *** เช็คบรรทัดนี้ ***
    purchasingEmail: 'hr.bpp2564@gmail.com',  // อีเมล จัดซื้อ

    // รหัสผ่าน
    passwords: {
        'head': '1111',    // รหัส คุณศุภรัตน์
        'manager': '9999'  // รหัส คุณเบญจมาศ
    }
};

// ================= 2. SYSTEM LOGIC =================
const db = supabase.createClient(CONFIG.supaUrl, CONFIG.supaKey);
if(typeof emailjs !== 'undefined') emailjs.init(CONFIG.emailPublicKey);

let currentUserRole = sessionStorage.getItem('userRole') || ''; 

document.addEventListener("DOMContentLoaded", function() {
    if (typeof LOGO_BASE64 !== 'undefined') {
        document.querySelectorAll('.app-logo').forEach(img => img.src = LOGO_BASE64);
    }

    if (window.location.href.includes('admin.html')) {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) {
            if (currentUserRole && sessionStorage.getItem('isAdmin') === 'true') {
                overlay.style.display = 'none';
                updateAdminUI();
                loadPRs(); 
            } else {
                overlay.style.display = 'flex';
            }
        }
    }
});

// Login
window.checkAdminPassword = function() {
    const input = document.getElementById('adminPassInput').value;
    if (input === CONFIG.passwords.head) {
        currentUserRole = 'head'; sessionStorage.setItem('userRole', 'head'); sessionStorage.setItem('isAdmin', 'true');
    } else if (input === CONFIG.passwords.manager) {
        currentUserRole = 'manager'; sessionStorage.setItem('userRole', 'manager'); sessionStorage.setItem('isAdmin', 'true');
    } else {
        alert("❌ รหัสผ่านไม่ถูกต้อง!"); return;
    }
    document.getElementById('loginOverlay').style.display = 'none';
    updateAdminUI();
    loadPRs();
}

function updateAdminUI() {
    const title = document.querySelector('h3');
    if (title) {
        if (currentUserRole === 'head') title.innerText = '👑 รายการรอผู้จัดการตรวจสอบ (คุณศุภรัตน์)';
        else if (currentUserRole === 'manager') title.innerText = '👑 รายการรออนุมัติ (คุณเบญจมาศ)';
    }
}

// ================= PART 1: FORM =================
window.addItemRow = function() {
    const container = document.getElementById('itemsContainer');
    if (!container) return; 
    const rowId = Date.now(); 
    const html = `<div class="item-row border p-3 mb-3 rounded bg-light shadow-sm" id="row-${rowId}"><div class="row g-3"><div class="col-md-3"><label class="small text-muted">รหัสสินค้า</label><input type="text" class="form-control item-code"></div><div class="col-md-5"><label class="small text-muted">รายละเอียด</label><input type="text" class="form-control item-desc" required></div><div class="col-md-2"><label class="small text-muted">จำนวน</label><input type="number" class="form-control item-qty" required></div><div class="col-md-2"><label class="small text-muted">หน่วย</label><input type="text" class="form-control item-unit"></div></div><div class="text-end mt-2"><button type="button" class="btn btn-outline-danger btn-sm" onclick="removeRow('${rowId}')">🗑️ ลบรายการนี้</button></div></div>`;
    container.insertAdjacentHTML('beforeend', html);
}
window.removeRow = function(id) { document.getElementById(`row-${id}`)?.remove(); }
if (document.getElementById('itemsContainer')) window.addItemRow();

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
                const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
                const { error: upErr } = await db.storage.from('pr-files').upload(fileName, file);
                if (upErr) throw upErr;
                const { data: urlData } = db.storage.from('pr-files').getPublicUrl(fileName);
                publicUrl = urlData.publicUrl;
            }
            btn.innerText = '⏳ กำลังบันทึก...';
            const items = [];
            document.querySelectorAll('.item-row').forEach(row => {
                items.push({code: row.querySelector('.item-code').value, description: row.querySelector('.item-desc').value, quantity: row.querySelector('.item-qty').value, unit: row.querySelector('.item-unit').value, status: 'pending', remark: ''});
            });
            const payload = { department: document.getElementById('department').value, pr_number: document.getElementById('pr_number').value, requester: document.getElementById('requester').value, email: document.getElementById('email').value, required_date: document.getElementById('required_date').value, header_remark: document.getElementById('header_remark').value, items: items, attachment_url: publicUrl, status: 'pending_head' };
            const { error } = await db.from('purchase_requests').insert([payload]);
            if (error) throw error;
            
            btn.innerText = '⏳ กำลังส่งอีเมล...';
            const adminLink = window.location.origin + '/admin.html';
            
            // [DEBUG] แจ้งเตือนก่อนส่ง
            alert(`กำลังส่งเมลหาหัวหน้า (คุณศุภรัตน์) ที่: ${CONFIG.bossEmail}`);
            
            await emailjs.send(CONFIG.emailServiceId, CONFIG.emailTemplateId_Master, { to_email: CONFIG.bossEmail, subject: `[New Request] ขอตรวจสอบ PR ${payload.pr_number}`, html_content: `<h3>เรียน ผู้จัดการ (คุณศุภรัตน์),</h3><p>มีรายการขอซื้อใหม่จาก <b>${payload.requester}</b> รอการตรวจสอบครับ</p><p>เลขที่ PR: ${payload.pr_number}</p><p><a href="${adminLink}">คลิกเพื่อเข้าสู่ระบบ</a></p>` });
            alert('✅ ส่งเรื่องเรียบร้อยแล้ว!'); window.location.reload();
        } catch (err) { console.error(err); alert('Error: ' + err.message); } finally { btn.disabled = false; btn.innerText = originalText; }
    });
}

// ================= PART 2: ADMIN LOGIC =================
let allPRs = []; let currentPR = {}; let currentMode = 'pending'; 

window.switchTab = function(mode) {
    currentMode = mode;
    if (mode === 'pending') { document.getElementById('btnPending').className = 'btn btn-primary active btn-sm'; document.getElementById('btnHistory').className = 'btn btn-outline-secondary btn-sm'; } 
    else { document.getElementById('btnHistory').className = 'btn btn-secondary active btn-sm'; document.getElementById('btnPending').className = 'btn btn-outline-primary btn-sm'; }
    loadPRs();
}

async function loadPRs() {
    const tableBody = document.getElementById('prTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">⏳ กำลังโหลด...</td></tr>';
    try {
        let query = db.from('purchase_requests').select('*').order('created_at', { ascending: false });
        if (currentMode === 'pending') {
            if (!currentUserRole) { tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">กรุณาเข้าสู่ระบบใหม่</td></tr>'; return; }
            if (currentUserRole === 'head') query = query.eq('status', 'pending_head');
            else if (currentUserRole === 'manager') query = query.eq('status', 'pending_manager');
        } else {
            if (currentUserRole === 'head') query = query.neq('status', 'pending_head');
            else query = query.in('status', ['processed', 'approved', 'rejected']);
        }
        const { data, error } = await query;
        if (error) throw error;
        allPRs = data;
        tableBody.innerHTML = '';
        if (data.length === 0) { tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-5 text-muted">ไม่มีรายการ</td></tr>`; return; }

        data.forEach(pr => {
            const createdDate = new Date(pr.created_at).toLocaleDateString('th-TH');
            let attachBtn = pr.attachment_url ? `<a href="${pr.attachment_url}" target="_blank" class="btn btn-sm btn-outline-secondary">📎</a>` : '-';
            let actionBtn = currentMode === 'pending' ? `<button onclick="openDetailModal('${pr.id}')" class="btn btn-primary btn-sm rounded-pill px-3">🔍 ตรวจสอบ</button>` : `<button onclick="openDetailModal('${pr.id}')" class="btn btn-outline-info btn-sm rounded-pill px-3">📄 ดู</button>`;
            let statusText = pr.status;
            if (pr.status === 'pending_head') statusText = 'รอ ผจก. ตรวจสอบ';
            if (pr.status === 'pending_manager') statusText = 'รอ ผช.กก. อนุมัติ';
            if (pr.status === 'processed') statusText = 'อนุมัติเรียบร้อย';
            const row = `<tr><td><span class="fw-bold text-primary">${pr.pr_number}</span></td><td>${createdDate}</td><td><div class="fw-bold">${pr.requester}</div><small class="text-muted">${pr.department}</small></td><td><span class="badge bg-secondary">${statusText}</span></td><td class="text-center">${attachBtn}</td><td class="text-center">${actionBtn}</td></tr>`;
            tableBody.innerHTML += row;
        });
    } catch (err) { console.error(err); tableBody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error: ${err.message}</td></tr>`; }
}

window.openDetailModal = function(id) {
    currentPR = allPRs.find(p => String(p.id) === String(id));
    if (!currentPR) return;
    document.getElementById('m_pr_number').innerText = currentPR.pr_number;
    document.getElementById('m_required_date').innerText = new Date(currentPR.required_date).toLocaleDateString('th-TH');
    document.getElementById('m_requester').innerText = currentPR.requester;
    document.getElementById('m_department').innerText = currentPR.department;
    document.getElementById('m_remark').innerText = currentPR.header_remark || '-';
    document.getElementById('m_attachment').innerHTML = currentPR.attachment_url ? `<a href="${currentPR.attachment_url}" target="_blank" class="btn btn-sm btn-outline-primary">📎 ดูไฟล์</a>` : '-';
    renderItemsTable();
    const saveBtn = document.querySelector('.modal-footer .btn-success');
    if (currentMode === 'history') { saveBtn.style.display = 'none'; } 
    else {
        saveBtn.style.display = 'block'; saveBtn.disabled = false;
        saveBtn.innerText = (currentUserRole === 'head') ? 'ส่งต่อให้ผู้ช่วย กก. ➡️' : '✅ อนุมัติและส่งเมล';
    }
    new bootstrap.Modal(document.getElementById('detailModal')).show();
}

function renderItemsTable() {
    const itemsTable = document.getElementById('m_itemsTable');
    if (!itemsTable) return;
    const tableContainer = itemsTable.parentElement; 
    let thead = tableContainer.querySelector('thead');
    if(!thead) { thead = document.createElement('thead'); thead.className = 'table-secondary'; tableContainer.prepend(thead); }
    thead.innerHTML = `<tr><th class="text-center" width="5%"><input type="checkbox" id="selectAll" class="form-check-input" onclick="toggleSelectAll(this)" checked></th><th width="15%">รหัส</th><th>รายละเอียด</th><th class="text-center" width="10%">จำนวน</th><th class="text-center" width="10%">หน่วย</th><th width="25%">เหตุผล (ถ้าไม่อนุมัติ)</th></tr>`;

    let htmlRows = '';
    if (currentPR.items) {
        currentPR.items.forEach((item, index) => {
            const isChecked = (item.status === 'approved' || item.status === 'pending');
            const reasonStyle = isChecked ? 'display:none;' : 'display:block;';
            const statusStyle = isChecked ? 'display:inline;' : 'display:none;';
            const reasonVal = item.remark || '';
            const rowClass = isChecked ? '' : 'table-danger';

            htmlRows += `<tr id="tr-item-${index}" class="${rowClass}"><td class="text-center"><input type="checkbox" class="form-check-input item-checkbox" data-index="${index}" onchange="toggleItem(this, ${index})" ${isChecked ? 'checked' : ''}></td><td>${item.code || '-'}</td><td>${item.description}</td><td class="text-center">${item.quantity} ${item.unit || ''}</td><td class="text-center">${item.unit}</td><td><input type="text" class="form-control form-control-sm item-reason" id="reason-${index}" placeholder="เหตุผล..." value="${reasonVal}" style="${reasonStyle}"><span id="status-text-${index}" class="text-success small fw-bold" style="${statusStyle}">✅ อนุมัติ</span></td></tr>`;
        });
    }
    itemsTable.innerHTML = htmlRows;
    if(currentMode === 'history') { itemsTable.querySelectorAll('input, select').forEach(el => el.disabled = true); if(document.getElementById('selectAll')) document.getElementById('selectAll').disabled = true; }
}

window.toggleSelectAll = function(source) { document.querySelectorAll('.item-checkbox').forEach(cb => { cb.checked = source.checked; toggleItem(cb, cb.dataset.index); }); }
window.toggleItem = function(checkbox, index) { const reasonInput = document.getElementById(`reason-${index}`); const statusText = document.getElementById(`status-text-${index}`); const row = document.getElementById(`tr-item-${index}`); if (checkbox.checked) { reasonInput.style.display = 'none'; statusText.style.display = 'inline'; row.classList.remove('table-danger'); } else { reasonInput.style.display = 'block'; reasonInput.focus(); statusText.style.display = 'none'; row.classList.add('table-danger'); } }

// ================= 3. FINAL APPROVAL LOGIC =================
window.finalizeApproval = async function() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    let hasRejectedWithoutReason = false;
    checkboxes.forEach(cb => {
        const idx = cb.dataset.index;
        const reasonInput = document.getElementById(`reason-${idx}`);
        if (cb.checked) { currentPR.items[idx].status = 'approved'; currentPR.items[idx].remark = ''; } 
        else { currentPR.items[idx].status = 'rejected'; currentPR.items[idx].remark = reasonInput.value.trim(); if (!currentPR.items[idx].remark) { hasRejectedWithoutReason = true; reasonInput.classList.add('is-invalid'); } }
    });
    if (hasRejectedWithoutReason) { alert('กรุณาระบุเหตุผลรายการที่ไม่อนุมัติ'); return; }
    if (!confirm("ยืนยันผลการพิจารณา?")) return;

    const btn = document.querySelector('.modal-footer .btn-success');
    if(btn) { btn.disabled = true; btn.innerText = '⏳ กำลังประมวลผล...'; }

    try {
        let nextStatus = '';
        const adminLink = window.location.origin + '/admin.html';
        
        // --- CASE 1: คุณศุภรัตน์ (Head) กด ---
        if (currentUserRole === 'head') {
            nextStatus = 'pending_manager'; 
            await db.from('purchase_requests').update({ status: nextStatus, items: currentPR.items }).eq('id', currentPR.id);
            
            // [DEBUG] เช็คว่าส่งหาใคร
            alert(`กำลังส่งเมลหาผู้ช่วย กก. (คุณเบญจมาศ) ที่: ${CONFIG.managerEmail}`);
            
            await emailjs.send(CONFIG.emailServiceId, CONFIG.emailTemplateId_Master, {
                to_email: CONFIG.managerEmail,
                subject: `[Step 2] ผ่านการตรวจสอบแล้ว รออนุมัติ PR ${currentPR.pr_number}`,
                html_content: `<h3>เรียน ผู้ช่วยกรรมการผู้จัดการ (คุณเบญจมาศ),</h3><p>คุณศุภรัตน์ (ผู้จัดการ) ได้ตรวจสอบ PR เลขที่ <b>${currentPR.pr_number}</b> เรียบร้อยแล้ว</p><p>กรุณาพิจารณาอนุมัติขั้นตอนสุดท้าย: <a href="${adminLink}">คลิกที่นี่</a></p>`
            });
            alert('✅ บันทึกผลแล้ว ส่งต่อให้คุณเบญจมาศเรียบร้อย!');
        } 
        
        // --- CASE 2: คุณเบญจมาศ (Manager) กด ---
        else if (currentUserRole === 'manager') {
            nextStatus = 'processed'; 
            await db.from('purchase_requests').update({ status: nextStatus, items: currentPR.items }).eq('id', currentPR.id);
            const printLink = window.location.origin + `/view_pr.html?id=${currentPR.id}`;
            const printApprovedLink = printLink + "&filter=approved";

            // (ส่วนสร้างตาราง...)
            let fullTable = `<table style="width:100%;border-collapse:collapse;border:1px solid #ddd;"><tr style="background:#f8f9fa;"><th>รายการ</th><th>จำนวน</th><th>ผล</th></tr>`;
            let approvedTable = `<table style="width:100%;border-collapse:collapse;border:1px solid #ddd;"><tr style="background:#d1fae5;"><th>รหัส</th><th>รายการ</th><th>จำนวน</th></tr>`;
            let hasApprovedItems = false;
            currentPR.items.forEach(i => {
                const color = i.status === 'approved' ? 'green' : 'red';
                const txt = i.status === 'approved' ? '✅' : `❌ (${i.remark})`;
                fullTable += `<tr><td style="border:1px solid #ddd;padding:5px;">${i.description}</td><td style="border:1px solid #ddd;padding:5px;">${i.quantity}</td><td style="border:1px solid #ddd;padding:5px;color:${color}">${txt}</td></tr>`;
                if (i.status === 'approved') { hasApprovedItems = true; approvedTable += `<tr><td style="border:1px solid #ddd;padding:5px;">${i.code||'-'}</td><td style="border:1px solid #ddd;padding:5px;">${i.description}</td><td style="border:1px solid #ddd;padding:5px;">${i.quantity}</td></tr>`; }
            });
            fullTable += `</table>`; approvedTable += `</table>`;

            // ส่งเมลหา Staff
            if (currentPR.email) {
                await emailjs.send(CONFIG.emailServiceId, CONFIG.emailTemplateId_Master, {
                    to_email: currentPR.email,
                    subject: `[Final Result] ผลการอนุมัติ PR ${currentPR.pr_number}`,
                    html_content: `<h3>เรียนคุณ ${currentPR.requester}</h3><p>ใบขอซื้อเลขที่ <b>${currentPR.pr_number}</b> ได้รับการอนุมัติโดย คุณเบญจมาศ ถิ่นจันทร์ แล้ว</p>${fullTable}<br><a href="${printLink}">ดูรายละเอียด</a>`
                });
            }

            // ส่งเมลหา จัดซื้อ
            if (hasApprovedItems && CONFIG.purchasingEmail) {
                alert(`กำลังส่งเมลหาจัดซื้อ ที่: ${CONFIG.purchasingEmail}`);
                await emailjs.send(CONFIG.emailServiceId, CONFIG.emailTemplateId_Master, {
                    to_email: CONFIG.purchasingEmail,
                    subject: `[Approved] สั่งซื้อสินค้า PR ${currentPR.pr_number}`,
                    html_content: `<h3>เรียน ฝ่ายจัดซื้อ</h3><p>รายการ PR ${currentPR.pr_number} อนุมัติโดย คุณเบญจมาศ แล้ว</p><hr><p><b>1. รายการที่อนุมัติ (สำหรับสั่งซื้อ):</b></p>${approvedTable}<br><a href="${printApprovedLink}" style="background:green;color:white;padding:10px;text-decoration:none;border-radius:5px;">🛒 พิมพ์ใบสั่งซื้อ (เฉพาะอนุมัติ)</a><br><br><p><b>2. รายการทั้งหมด (รวมไม่อนุมัติ):</b></p><a href="${printLink}" style="background:gray;color:white;padding:10px;text-decoration:none;border-radius:5px;">📄 ดูประวัติทั้งหมด</a>`
                });
            }
            alert('✅ อนุมัติจบงานและส่งเรื่องให้จัดซื้อเรียบร้อย!');
        }

        bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();
        loadPRs();
    } catch (err) { console.error(err); alert('Error: ' + err.message); if(btn) btn.disabled = false; }
}

// ================= PART 3: VIEW =================
async function loadPRForPrint() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const filter = params.get('filter');
    if (!id) return;
    try {
        const { data: pr, error } = await db.from('purchase_requests').select('*').eq('id', id).single();
        if (error) throw error;
        document.getElementById('v_pr_number').innerText = pr.pr_number;
        document.getElementById('v_created_at').innerText = new Date(pr.created_at).toLocaleDateString('th-TH');
        document.getElementById('v_requester').innerText = pr.requester;
        document.getElementById('v_department').innerText = pr.department;
        document.getElementById('v_doc_status').innerText = pr.status === 'processed' ? 'อนุมัติเรียบร้อย' : 'รออนุมัติ';
        document.getElementById('v_remark').innerText = pr.header_remark || '-';
        document.getElementById('v_sign_requester').innerText = `${pr.requester}`;
        document.getElementById('v_required_date').innerText = new Date(pr.required_date).toLocaleDateString('th-TH');

        if (pr.status === 'pending_manager' || pr.status === 'processed') {
            document.getElementById('v_sign_head').innerHTML = '( ศุภรัตน์ ขยันการ )<br><span class="text-success small" style="font-size:10px;">อนุมัติออนไลน์</span>';
        }
        if (pr.status === 'processed') {
            document.getElementById('v_sign_manager').innerHTML = '( เบญจมาศ ถิ่นจันทร์ )<br><span class="text-success small" style="font-size:10px;">อนุมัติออนไลน์</span>';
        }

        const tbody = document.getElementById('v_tableBody');
        tbody.innerHTML = '';
        let displayItems = pr.items;
        if (filter === 'approved') displayItems = pr.items.filter(item => item.status === 'approved');
        if (displayItems) {
            displayItems.forEach((item, index) => {
                let statusText = '⏳ รอ';
                if (item.status === 'approved') statusText = '<span class="fw-bold" style="color:#000;">✅ อนุมัติ</span>';
                else if (item.status === 'rejected') statusText = `<span style="text-decoration:line-through;color:#000;">❌ ไม่อนุมัติ</span>`;
                tbody.innerHTML += `<tr><td class="text-center">${index + 1}</td><td>${item.code || '-'}</td><td>${item.description}</td><td class="text-center">${item.quantity}</td><td class="text-center">${item.unit}</td><td class="text-center">${statusText}</td></tr>`;
            });
        }
    } catch (err) { alert('Error: ' + err.message); }
}

if(document.getElementById('v_tableBody')) window.onload = loadPRForPrint;
// if(document.getElementById('prTableBody')) window.onload = loadPRs; // ไม่ต้องใส่

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') { event.preventDefault(); return false; }
});


