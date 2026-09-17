const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readDB() { return JSON.parse(fs.readFileSync('./database.json', 'utf8')); }
function writeDB(data) { fs.writeFileSync('./database.json', JSON.stringify(data, null, 2), 'utf8'); }

// 1. API Đăng nhập (Có Mật khẩu)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    let db = readDB();

    if (!username || !password) return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin!' });

    // Quy định Admin
    if (username === 'admin') {
        if (password !== '123456') return res.status(401).json({ success: false, message: 'Sai mật khẩu Quản trị viên!' });
        if (!db.users['admin']) db.users['admin'] = { username: 'admin', role: 'admin', wallet: 500000, kyc: 'approved' };
    } else {
        // Người dùng thường
        if (db.users[username]) {
            if (db.users[username].password !== password) return res.status(401).json({ success: false, message: 'Sai mật khẩu!' });
        } else {
            // Tự động tạo tài khoản mới nếu chưa có
            db.users[username] = { username, password, wallet: 500000, role: "user", kyc: "pending" };
        }
    }
    
    writeDB(db);
    res.json({ success: true, user: db.users[username] });
});

// 2. Các API Công việc & Ký quỹ (Như cũ)
app.get('/api/jobs', (req, res) => {
    const { category } = req.query;
    let jobs = readDB().jobs;
    if (category) jobs = jobs.filter(j => j.category === category);
    res.json(jobs);
});

app.post('/api/escrow', (req, res) => {
    const { username, jobId, amount } = req.body;
    let db = readDB();
    const user = db.users[username];
    if (!user || user.wallet < amount) return res.status(400).json({ success: false, message: 'Số dư không đủ!' });

    user.wallet -= amount;
    const job = db.jobs.find(j => j.id === jobId);
    if (job) { job.status = 'taken'; job.takenBy = username; }
    writeDB(db);
    res.json({ success: true, newBalance: user.wallet });
});

app.post('/api/dispute', (req, res) => {
    const { jobId, reason } = req.body;
    let db = readDB();
    const job = db.jobs.find(j => j.id === jobId);
    if (job) { job.status = 'disputed'; job.disputeReason = reason; writeDB(db); res.json({ success: true }); }
});

// ==========================================
// TÍNH NĂNG ĐỘC QUYỀN CHO ADMIN
// ==========================================
app.get('/api/admin/dashboard', (req, res) => {
    let db = readDB();
    let users = Object.values(db.users);
    
    // Thống kê
    let totalUsers = users.length;
    let totalJobs = db.jobs.length;
    let totalEscrowHold = db.jobs.filter(j => j.status === 'taken' || j.status === 'disputed').reduce((sum, j) => sum + j.escrow, 0);
    
    // Danh sách chờ duyệt eKYC
    let kycPending = users.filter(u => u.kyc === 'pending');
    
    res.json({ totalUsers, totalJobs, totalEscrowHold, kycPending });
});

app.post('/api/admin/approve-kyc', (req, res) => {
    const { username } = req.body;
    let db = readDB();
    if(db.users[username]) {
        db.users[username].kyc = 'approved';
        writeDB(db);
        res.json({ success: true });
    }
});

app.post('/api/admin/resolve', (req, res) => {
    const { jobId } = req.body; 
    let db = readDB();
    const job = db.jobs.find(j => j.id === jobId);
    if (job) { job.status = 'resolved'; writeDB(db); res.json({ success: true }); }
});

app.listen(PORT, () => console.log(`🚀 Server chạy tại: http://localhost:${PORT}`));