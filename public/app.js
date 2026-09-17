let currentUser = null;
// ==========================================
// CHUYỂN ĐỔI FORM ĐĂNG NHẬP / ĐĂNG KÝ
// ==========================================
function toggleForm(type) {
    if(type === 'register') {
        document.getElementById('form-login').style.display = 'none';
        document.getElementById('form-register').style.display = 'block';
    } else {
        document.getElementById('form-register').style.display = 'none';
        document.getElementById('form-login').style.display = 'block';
    }
}

// ==========================================
// XỬ LÝ ĐĂNG KÝ TÀI KHOẢN
// ==========================================
async function submitRegister() {
    const fullname = document.getElementById('reg-fullname').value;
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;

    if(!fullname || !username || !password) { alert("Vui lòng nhập đủ thông tin!"); return; }

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname, username, password })
    });
    const data = await res.json();

    if(data.success) {
        alert("Đăng ký thành công! Hãy đăng nhập để tiếp tục.");
        toggleForm('login');
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = password;
    } else {
        alert(data.message);
    }
}
// Xóa localStorage cũ để test form đăng nhập mới
localStorage.removeItem('Username');

// 1. XỬ LÝ ĐĂNG NHẬP
async function submitLogin() {
    const userVal = document.getElementById('login-username').value;
    const passVal = document.getElementById('login-password').value;

    if(!userVal || !passVal) { alert("Vui lòng nhập đủ thông tin!"); return; }

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userVal, password: passVal })
    });
    const data = await res.json();

    if(data.success) {
        currentUser = data.user;
        setupWorkspace();
    } else {
        alert(data.message); // Báo sai mật khẩu
    }
}

// 2. VÀO VỚI TƯ CÁCH KHÁCH
function loginAsGuest() {
    currentUser = { username: 'Khách Vãng Lai', role: 'guest', wallet: 0 };
    setupWorkspace();
}

// 3. THIẾT LẬP GIAO DIỆN SAU ĐĂNG NHẬP
function setupWorkspace() {
    document.getElementById('login-overlay').style.display = 'none';
    
    // Khách thì ẩn số dư, đổi tên
    if(currentUser.role === 'guest') {
        document.querySelector('.user-info').innerHTML = `<p>Xin chào, <strong>Khách</strong></p><p style="font-size:12px; color:orange;">Bạn chỉ có quyền xem, không thể nhận việc.</p>`;
    } else {
        document.getElementById('wallet-balance').innerText = currentUser.wallet.toLocaleString() + 'đ';
        // Nút nạp tiền
        document.querySelector('.user-info').innerHTML += `<br><button class="btn btn-primary" style="margin-top:10px; width:100%;" onclick="alert('Đã nạp 100k qua VNPay!')">+ Nạp VNPay</button>`;
        
        // Link admin
        if(currentUser.role === 'admin') {
            document.querySelector('.menu').innerHTML += `<a href="admin.html" class="menu-item text-danger" style="color: red;"><i class="fas fa-lock"></i> VÀO TRANG ADMIN</a>`;
        }
    }
    loadJobs();
}

// Menu điều hướng
document.querySelector('.menu').addEventListener('click', function(e) {
    const item = e.target.closest('.menu-item'); 
    if (!item) return;
    if(item.href && item.href.includes('admin.html')) return; 
    e.preventDefault();
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const target = item.getAttribute('data-target');
    if(target) {
        document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
    }
});

// TẢI CÔNG VIỆC
async function loadJobs() {
    const category = document.getElementById('filter-category')?.value || '';
    const res = await fetch(`/api/jobs?category=${category}`);
    const jobs = await res.json();
    const container = document.getElementById('job-list-container');
    if(!container) return;

    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <select id="filter-category" onchange="loadJobs()" style="padding: 8px; border-radius: 5px;">
                <option value="">-- Lọc theo tất cả --</option>
                <option value="Sự kiện">Sự kiện</option>
                <option value="Gia sư">Gia sư</option>
                <option value="IT">IT & Nhập liệu</option>
            </select>
        </div>
    ` + jobs.map(job => {
        if (job.status === 'taken' && job.takenBy === currentUser?.username) {
            return `<div class="job-item" style="border-left: 4px solid var(--success);">
                <div><h3>${job.title} (Đang làm)</h3></div>
                <button class="btn btn-danger" onclick="reportDispute('${job.id}')">Báo cáo sự cố</button>
            </div>`;
        }
        if (job.status === 'disputed') return `<div class="job-item" style="opacity: 0.6"><h3>${job.title}</h3><p class="text-danger">Đang tranh chấp</p></div>`;
        if (job.status !== 'open') return ''; 
        
        return `
            <div class="job-item">
                <div>
                    <h3>${job.title} <span style="font-size:12px; background:#e2e8f0; padding:2px 5px; border-radius:4px;">${job.category}</span></h3>
                    <p>Thù lao: <strong>${job.price}</strong></p>
                    <p>Ký quỹ: <strong class="text-danger">${job.escrow.toLocaleString()}đ</strong></p>
                </div>
                <button class="btn btn-warning" onclick="openEscrow('${job.id}', ${job.escrow})">Nhận & Ký quỹ</button>
            </div>
        `;
    }).join('');
}

// KÝ QUỸ 
let currentEscrowJob = null;
function openEscrow(jobId, amount) {
    if(currentUser.role === 'guest') {
        alert("Vui lòng Đăng nhập tài khoản chính thức để nhận việc!"); return;
    }
    currentEscrowJob = { jobId, amount };
    document.getElementById('escrow-amount').innerText = amount.toLocaleString() + 'đ';
    document.getElementById('escrow-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('escrow-modal').style.display = 'none'; }

document.getElementById('btn-confirm-escrow')?.addEventListener('click', async () => {
    const res = await fetch('/api/escrow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, jobId: currentEscrowJob.jobId, amount: currentEscrowJob.amount })
    });
    const data = await res.json();
    if (data.success) { alert("Ký quỹ thành công!"); closeModal(); loadJobs(); }
    else { alert(data.message); closeModal(); }
});

async function reportDispute(jobId) {
    const reason = prompt("Lý do báo cáo:");
    if(!reason) return;
    await fetch('/api/dispute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId, reason }) });
    alert("Đã báo cáo Admin!"); loadJobs();
}

const verifyForm = document.getElementById('verify-form');
if(verifyForm) {
    verifyForm.addEventListener('submit', function(e) {
        e.preventDefault(); 
        if(currentUser.role === 'guest') { alert("Khách không thể xác thực!"); return; }
        alert('Hồ sơ CCCD đã được gửi! Đang chờ Admin duyệt (Cấp tích xanh).');
    });
}