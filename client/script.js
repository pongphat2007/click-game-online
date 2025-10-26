// ตัวแปรเกม
let score = 0;
let timeLeft = 30;
let gameActive = false;
let timer;
let currentUser = null;
let socket = null;

// องค์ประกอบ DOM
const authContainer = document.getElementById('auth-container');
const gameContainer = document.getElementById('game-container');
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');
const highScoreElement = document.getElementById('high-score');
const targetElement = document.getElementById('target');
const startButton = document.getElementById('start-btn');
const resetButton = document.getElementById('reset-btn');
const currentUserElement = document.getElementById('current-user');
const userHighscoreElement = document.getElementById('user-highscore');
const leaderboardElement = document.getElementById('leaderboard');

// API Base URL
const API_BASE = 'https://your-backend.railway.app/api';

// เริ่มต้น Socket.io
function initSocket() {
    socket = io('https://your-backend.railway.app');
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('score-updated', (data) => {
        showNotification(data.message);
    });
    
    socket.on('player-joined', (data) => {
        showNotification(data.message);
    });
}

// ระบบการยืนยันตัวตน
async function register() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('auth-message');
    
    if (!username || !password) {
        messageElement.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            messageElement.textContent = 'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ';
            messageElement.style.color = '#27ae60';
        } else {
            messageElement.textContent = data.message;
            messageElement.style.color = '#e74c3c';
        }
    } catch (error) {
        messageElement.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
        messageElement.style.color = '#e74c3c';
    }
}

async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('auth-message');
    
    if (!username || !password) {
        messageElement.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            showGameInterface();
            initSocket();
            
            // แจ้ง server ว่าผู้เล่นเข้าร่วมเกม
            if (socket) {
                socket.emit('join-game', currentUser);
            }
        } else {
            messageElement.textContent = data.message;
            messageElement.style.color = '#e74c3c';
        }
    } catch (error) {
        messageElement.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
        messageElement.style.color = '#e74c3c';
    }
}

function logout() {
    currentUser = null;
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    showAuthInterface();
    resetGame();
}

function showAuthInterface() {
    authContainer.classList.remove('hidden');
    gameContainer.classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('auth-message').textContent = '';
}

function showGameInterface() {
    authContainer.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    currentUserElement.textContent = currentUser.username;
    userHighscoreElement.textContent = currentUser.highScore;
    highScoreElement.textContent = currentUser.highScore;
    
    // โหลดตารางคะแนน
    loadLeaderboard();
}

// ฟังก์ชันเกม
function startGame() {
    if (!currentUser) {
        alert('กรุณาเข้าสู่ระบบก่อนเริ่มเกม');
        return;
    }
    
    if (gameActive) return;
    
    gameActive = true;
    score = 0;
    timeLeft = 30;
    
    scoreElement.textContent = score;
    timeElement.textContent = timeLeft;
    
    startButton.disabled = true;
    
    // สุ่มตำแหน่งเป้าหมายแรก
    moveTarget();
    
    // เริ่มนับถอยหลัง
    timer = setInterval(() => {
        timeLeft--;
        timeElement.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameActive = false;
    clearInterval(timer);
    startButton.disabled = false;
    
    // บันทึกคะแนน
    saveScore(score);
    
    // แจ้งผู้เล่นอื่นๆ
    if (socket && currentUser) {
        socket.emit('player-score-update', {
            username: currentUser.username,
            score: score
        });
    }
    
    alert(`เกมจบ! คะแนนของคุณ: ${score}`);
}

function resetGame() {
    gameActive = false;
    clearInterval(timer);
    
    score = 0;
    timeLeft = 30;
    
    scoreElement.textContent = score;
    timeElement.textContent = timeLeft;
    
    startButton.disabled = false;
    targetElement.style.display = 'none';
}

function moveTarget() {
    if (!gameActive) return;
    
    const gameArea = document.querySelector('.game-area');
    const maxX = gameArea.offsetWidth - targetElement.offsetWidth;
    const maxY = gameArea.offsetHeight - targetElement.offsetHeight;
    
    const randomX = Math.floor(Math.random() * maxX);
    const randomY = Math.floor(Math.random() * maxY);
    
    targetElement.style.left = `${randomX}px`;
    targetElement.style.top = `${randomY}px`;
    targetElement.style.display = 'block';
}

function hitTarget() {
    if (!gameActive) return;
    
    score++;
    scoreElement.textContent = score;
    
    moveTarget();
    
    // เอฟเฟกต์เมื่อคลิก
    targetElement.style.transform = 'scale(0.9)';
    setTimeout(() => {
        targetElement.style.transform = 'scale(1)';
    }, 100);
}

// ระบบบันทึกคะแนน
async function saveScore(score) {
    try {
        const response = await fetch(`${API_BASE}/save-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                userId: currentUser.id, 
                score: score 
            }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            userHighscoreElement.textContent = data.highScore;
            highScoreElement.textContent = data.highScore;
            loadLeaderboard();
        }
    } catch (error) {
        console.error('Error saving score:', error);
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE}/leaderboard`);
        const data = await response.json();
        
        if (data.success) {
            displayLeaderboard(data.leaderboard);
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function displayLeaderboard(leaderboard) {
    leaderboardElement.innerHTML = '';
    
    if (leaderboard.length === 0) {
        leaderboardElement.innerHTML = '<div class="loading">ยังไม่มีคะแนน</div>';
        return;
    }
    
    leaderboard.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        item.innerHTML = `
            <div class="rank">${index + 1}</div>
            <div class="username">${player.username}</div>
            <div class="score">${player.highScore}</div>
        `;
        
        leaderboardElement.appendChild(item);
    });
}

// การแจ้งเตือน
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ecc71;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Event Listeners
document.getElementById('login-btn').addEventListener('click', login);
document.getElementById('register-btn').addEventListener('click', register);
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('reset-btn').addEventListener('click', resetGame);
targetElement.addEventListener('click', hitTarget);

// อนุญาตให้กด Enter เพื่อล็อกอิน
document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        login();
    }
});

// โหลดครั้งแรก
showAuthInterface();
