// ================= 1. CONFIG (ตั้งค่าระบบ) =================
const CONFIG = {
    // Supabase
    supaUrl: 'https://pufddwdcpugilwlavban.supabase.co', 
    supaKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZmRkd2RjcHVnaWx3bGF2YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODY1MDUsImV4cCI6MjA3NDk2MjUwNX0.6dyYteDu6QSkTL9hIiaHw_2WeltSGSIoMSvx3OcEjN0', 
    
    // EmailJS
    emailPublicKey: 'rEly1Il6Xz0qZwaSc',   
    emailServiceId: 'service_tolm3pu',   
    emailTemplateId_Master: 'template_master', 

    // อีเมลผู้รับ
    bossEmail: 'bestworld.bwp328@gmail.com',          
    purchasingEmail: 'jakkidmarat@gmail.com',

    // รหัสผ่านเข้าหน้า Admin
    adminPassword: '1234' 
};

// ================= 2. SYSTEM INITIALIZATION =================
const db = supabase.createClient(CONFIG.supaUrl, CONFIG.supaKey);
if(typeof emailjs !== 'undefined') emailjs.init(CONFIG.emailPublicKey);

document.addEventListener("DOMContentLoaded", function() {
    // 1. โหลด Logo
    if (typeof LOGO_BASE64 !== 'undefined') {
        document.querySelectorAll('.app-logo').forEach(img => img.src = LOGO_BASE64);
    }

    // 2. เช็ค Login หน้า Admin (ตอนโหลดหน้า)
    if (window.location.href.includes('admin.html')) {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) {
            if (sessionStorage.getItem('isAdmin') === 'true') {
                overlay.style.display = 'none'; // ซ่อนถ้าล็อกอินแล้ว
            } else {
                overlay.style.display = 'flex'; // โชว์ถ้ายังไม่ล็อกอิน
            }
        }
    }
});

// [FIXED] เพิ่มฟังก์ชันนี้กลับมาครับ (สำหรับปุ่มกด Login)
window.checkAdminPassword = function() {
    const input = document.getElementById('adminPassInput').value;
    if (input === CONFIG.adminPassword) {
        sessionStorage.setItem('isAdmin', 'true');
        document.getElementById('loginOverlay').style.display = 'none';
        loadPRs(); // โหลดข้อมูลทันที
    } else {
        alert("❌ รหัสผ่านไม่ถูกต้อง!");
    }
}

// ================= PART 1: FORM (index.html) =================
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

const prForm = document.getElementById('prForm');
if (prForm) {
    prForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmit');
        const originalText = btn.innerText;
        btn.disabled = true; 

        try {
            // Upload
            let publicUrl = null;
            const fileInput = document.getElementById('attachment');
            if (fileInput.files.length > 0) {
                btn.innerText = '⏳ กำลังอัปโหลดไฟล์...';
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { error: upErr } = await db.storage.from('pr-files').upload(fileName, file);
                if (upErr) throw upErr;
                const { data: urlData } = db.storage.from('pr-files').getPublicUrl(fileName);
                publicUrl = urlData.publicUrl;
            }

            // Gather Data
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

            // Send Mail
            btn.innerText = '⏳ กำลังส่งอีเมล...';
            const adminLink = window.location.origin + '/admin.html';
            const bossHtml = `
                <h3>เรียน ผู้ช่วยกรรมการผู้จัดการ,</h3>
                <p>มีรายการขอซื้อใหม่เข้ามา รอการอนุมัติครับ</p>
                <ul>
                    <li><b>เลขที่ PR:</b> ${payload.pr_number}</li>
                    <li><b>ผู้ขอ:</b> ${payload.requester}</li>
                    <li><b>แผนก:</b> ${payload.department}</li>
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

// ================= PART 2: ADMIN (admin.html) =================
let allPRs = []; let currentPR = {}; let currentMode = 'pending'; 

window.switchTab = function(mode) {
    currentMode = mode;
    if (mode === 'pending') {
        document.getElementById('btnPending').className = 'btn btn-primary active';
        document.getElementById('btnHistory').className = 'btn btn-outline-secondary';
    } else {
        document.getElementById('btnHistory').className = 'btn btn-secondary active';
        document.getElementById('btnPending').className = 'btn btn-outline-primary';
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
                ? `<button onclick="openDetailModal('${pr.id}')" class="btn btn-primary btn-sm rounded-pill px-3">🔍 ตรวจสอบ</button>`
                : `<button onclick="openDetailModal('${pr.id}')" class="btn btn-outline-info btn-sm rounded-pill px-3">📄 ดูรายละเอียด</button>`;

            const row = `
                <tr>
                    <td><span class="fw-bold text-primary">${pr.pr_number}</span></td>
                    <td>${createdDate}</td>
                    <td><div class="fw-bold">${pr.requester}</div><div class="small text-muted">${pr.department}</div></td>
                    <td>${statusBadge}</td>
                    <td class="text-center">${attachBtn}</td>
                    <td class="text-center">${actionBtn}</td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    } catch (err) { tableBody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error: ${err.message}</td></tr>`; }
}

window.openDetailModal = function(id) {
    // แปลง id เป็น string เพื่อความชัวร์
    currentPR = allPRs.find(p => String(p.id) === String(id));
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
    
    // Header พร้อม Checkbox Select All
    const headerRow = document.querySelector('#m_itemsTable').previousElementSibling.querySelector('tr');
    if (headerRow) {
        headerRow.innerHTML = `
            <th class="text-center" width="5%"><input type="checkbox" id="selectAll" class="form-check-input" onclick="toggleSelectAll(this)" checked></th>
            <th width="15%">รหัส</th><th>รายละเอียด</th><th class="text-center" width="10%">จำนวน</th><th class="text-center" width="10%">หน่วย</th><th width="25%">เหตุผล (ถ้าไม่อนุมัติ)</th>`;
    }

    let htmlRows = '';
    if (currentPR.items) {
        currentPR.items.forEach((item, index) => {
            const isChecked = (item.status === 'approved' || item.status === 'pending');
            const reasonStyle = isChecked ? 'display:none;' : 'display:block;';
            const statusStyle = isChecked ? 'display:inline;' : 'display:none;';
            const reasonVal = item.remark || '';
            const rowClass = isChecked ? '' : 'table-danger';

            htmlRows += `
                <tr id="tr-item-${index}" class="${rowClass}">
                    <td class="text-center">
                        <input type="checkbox" class="form-check-input item-checkbox" data-index="${index}" onchange="toggleItem(this, ${index})" ${isChecked ? 'checked' : ''}>
                    </td>
                    <td>${item.code || '-'}</td>
                    <td>${item.description}</td>
                    <td class="text-center">${item.quantity} ${item.unit || ''}</td>
                    <td class="text-center">${item.unit}</td>
                    <td>
                        <input type="text" class="form-control form-control-sm item-reason" id="reason-${index}" placeholder="ระบุเหตุผล..." value="${reasonVal}" style="${reasonStyle}">
                        <span id="status-text-${index}" class="text-success small fw-bold" style="${statusStyle}">✅ อนุมัติ</span>
                    </td>
                </tr>`;
        });
    }
    itemsTable.innerHTML = htmlRows;
    
    if(currentMode === 'history') {
        document.querySelectorAll('input[type="checkbox"], .item-reason').forEach(el => el.disabled = true);
        const selectAll = document.getElementById('selectAll');
        if(selectAll) selectAll.style.display = 'none';
    }
}

window.toggleSelectAll = function(source) {
    document.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.checked = source.checked;
        toggleItem(cb, cb.dataset.index);
    });
}

window.toggleItem = function(checkbox, index) {
    const reasonInput = document.getElementById(`reason-${index}`);
    const statusText = document.getElementById(`status-text-${index}`);
    const row = document.getElementById(`tr-item-${index}`);

    if (checkbox.checked) {
        reasonInput.style.display = 'none';
        statusText.style.display = 'inline';
        row.classList.remove('table-danger');
    } else {
        reasonInput.style.display = 'block';
        reasonInput.focus();
        statusText.style.display = 'none';
        row.classList.add('table-danger');
    }
}

window.finalizeApproval = async function() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    let hasRejectedWithoutReason = false;

    checkboxes.forEach(cb => {
        const idx = cb.dataset.index;
        const reasonInput = document.getElementById(`reason-${idx}`);
        if (cb.checked) {
            currentPR.items[idx].status = 'approved';
            currentPR.items[idx].remark = '';
        } else {
            currentPR.items[idx].status = 'rejected';
            currentPR.items[idx].remark = reasonInput.value.trim();
            if (!currentPR.items[idx].remark) {
                hasRejectedWithoutReason = true;
                reasonInput.classList.add('is-invalid');
            } else {
                reasonInput.classList.remove('is-invalid');
            }
        }
    });

    if (hasRejectedWithoutReason) { alert('กรุณาระบุเหตุผลสำหรับรายการที่ไม่อนุมัติ'); return; }
    if (!confirm("ยืนยันผลการพิจารณา?")) return;

    const btn = document.querySelector('.modal-footer .btn-success');
    if(btn) { btn.disabled = true; btn.innerText = '⏳ กำลังประมวลผล...'; }

    try {
        await db.from('purchase_requests').update({ status: 'processed', items: currentPR.items }).eq('id', currentPR.id);
        
        // สร้าง 2 ลิงก์
        const baseUrl = window.location.origin + `/view_pr.html?id=${currentPR.id}`;
        const linkAll = baseUrl; 
        const linkApproved = baseUrl + "&filter=approved";

        // ตาราง HTML
        let staffTable = `<table style="width:100%;border-collapse:collapse;border:1px solid #ddd;"><tr style="background:#f8f9fa;"><th style="padding:8px;border:1px solid #ddd;">รายการ</th><th style="padding:8px;border:1px solid #ddd;">จำนวน</th><th style="padding:8px;border:1px solid #ddd;">ผล</th></tr>`;
        let purchasingTable = `<table style="width:100%;border-collapse:collapse;border:1px solid #ddd;"><tr style="background:#d4edda;"><th style="padding:8px;border:1px solid #ddd;">รหัส</th><th style="padding:8px;border:1px solid #ddd;">รายการ (อนุมัติแล้ว)</th><th style="padding:8px;border:1px solid #ddd;">จำนวน</th></tr>`;
        let hasApprovedItems = false;

        currentPR.items.forEach(i => {
            const color = i.status === 'approved' ? 'green' : 'red';
            const statusText = i.status === 'approved' ? '✅ อนุมัติ' : `❌ ไม่ผ่าน (${i.remark})`;
            staffTable += `<tr><td style="padding:8px;border:1px solid #ddd;">${i.description}</td><td style="padding:8px;border:1px solid #ddd;">${i.quantity} ${i.unit}</td><td style="padding:8px;border:1px solid #ddd;color:${color};font-weight:bold;">${statusText}</td></tr>`;
            if(i.status === 'approved') {
                hasApprovedItems = true;
                purchasingTable += `<tr><td style="padding:8px;border:1px solid #ddd;">${i.code||'-'}</td><td style="padding:8px;border:1px solid #ddd;">${i.description}</td><td style="padding:8px;border:1px solid #ddd;">${i.quantity} ${i.unit}</td></tr>`;
            }
        });
        staffTable += `</table>`; purchasingTable += `</table>`;

        // 1. ส่งเมลหา Staff
        let reqEmail = currentPR.email ? currentPR.email.trim() : '';
        if (reqEmail && reqEmail.includes('@')) {
            await emailjs.send(CONFIG.emailServiceId, CONFIG.emailTemplateId_Master, {
                to_email: reqEmail, 
                subject: `[Result] ผลอนุมัติ PR ${currentPR.pr_number}`,
                html_content: `
                    <h3>เรียน คุณ ${currentPR.requester}</h3>
                    <p>ผลการพิจารณาใบขอซื้อเลขที่ <b>${currentPR.pr_number}</b>:</p>
                    ${staffTable}
                    <br>
                    <a href="${linkAll}" style="background-color:#6c757d;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;">
                        📄 ดูรายละเอียด/พิมพ์ PDF
                    </a>
                `
            });
        }

        // 2. ส่งเมลหา จัดซื้อ
        if(hasApprovedItems) {
            let buyEmail = CONFIG.purchasingEmail ? CONFIG.purchasingEmail.trim() : '';
            if (buyEmail && buyEmail.includes('@')) {
                const purchasingHtml = `
                    <h3>เรียน ฝ่ายจัดซื้อ</h3>
                    <p>ใบขอซื้อเลขที่ <b>${currentPR.pr_number}</b> ได้รับการอนุมัติแล้ว</p>
                    <p>ผู้ขอ: ${currentPR.requester} | แผนก: ${currentPR.department}</p>
                    <hr>
                    <p><b>กรุณาเลือกรูปแบบเอกสารที่ต้องการ:</b></p>
                    
                    <p style="margin-bottom:5px;"><b>1. แบบแสดงรายการที่อนุมัติแล้ว (สำหรับสั่งซื้อ)</b></p>
                    <a href="${linkApproved}" style="background-color:#198754;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;margin-bottom:15px;">
                        🛒 พิมพ์ใบสั่งซื้อ (เฉพาะอนุมัติ)
                    </a>
                    
                    <p style="margin-bottom:5px;"><b>2. แบบแสดงรายการทั้งหมด (รวมที่ไม่อนุมัติ)</b></p>
                    <a href="${linkAll}" style="background-color:#6c757d;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;">
                        📄 ดูประวัติรายการทั้งหมด
                    </a>
                `;
                
                await emailjs.send(CONFIG.emailServiceId, CONFIG.emailTemplateId_Master, {
                    to_email: buyEmail, 
                    subject: `[Approved] สั่งซื้อสินค้า PR ${currentPR.pr_number}`,
                    html_content: purchasingHtml
                });
            }
        }

        alert('✅ บันทึกผลเรียบร้อย!');
        bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();
        loadPRs();

    } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
        if(btn) { btn.disabled = false; btn.innerText = '💾 บันทึกผลและส่งเมลแจ้งเตือน'; }
    }
}

// ================= PART 3: VIEW =================
async function loadPRForPrint() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const filter = params.get('filter'); // [NEW]

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
        
        const tbody = document.getElementById('v_tableBody');
        tbody.innerHTML = '';
        
        // [Logic ใหม่] กรองข้อมูลถ้ามี filter
        let displayItems = pr.items;
        if (filter === 'approved') {
            displayItems = pr.items.filter(item => item.status === 'approved');
        }

        if (displayItems) {
            displayItems.forEach((item, index) => {
                let statusText = '⏳ รอพิจารณา';
                if (item.status === 'approved') statusText = '<span class="fw-bold" style="color:green;">✅ อนุมัติ</span>';
                else if (item.status === 'rejected') statusText = `<span class="text-decoration-line-through" style="color:red;">❌ ไม่อนุมัติ</span>`;
                tbody.innerHTML += `<tr><td class="text-center">${index + 1}</td><td>${item.code || '-'}</td><td>${item.description}</td><td class="text-center">${item.quantity}</td><td class="text-center">${item.unit}</td><td class="text-center">${statusText}</td></tr>`;
            });
        }
    } catch (err) { alert('Error: ' + err.message); }
}

if(document.getElementById('v_tableBody')) window.onload = loadPRForPrint;
if(document.getElementById('prTableBody')) window.onload = loadPRs;

// Prevent Enter Key Submit
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        if (event.target.tagName === 'INPUT') {
            event.preventDefault();
            return false;
        }
    }
});
