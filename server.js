const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// ใช้ Connection String ของคุณ
const MONGODB_URI = 'mongodb+srv://gameuser:HbxoRXZTb2bjCK3v@click-game-online.yg2aa6r.mongodb.net/?appName=click-game-online';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('🎉 เชื่อมต่อ MongoDB Atlas สำเร็จแล้ว!'))
  .catch(err => {
    console.log('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ MongoDB:');
    console.log(err.message);
  });

// User Model
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  highScore: { type: Number, default: 0 },
  totalGames: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// API Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Click Game Server ทำงานแล้ว! 🎯',
    status: 'ใช้ MongoDB Atlas ฟรี',
    database: 'เชื่อมต่อสำเร็จ'
  });
});

// สมัครสมาชิก
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' 
      });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' 
      });
    }
    
    const newUser = new User({ username, password });
    await newUser.save();
    
    res.json({ 
      success: true, 
      message: 'สมัครสมาชิกสำเร็จ!',
      user: { 
        id: newUser._id, 
        username: newUser.username,
        highScore: newUser.highScore 
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' 
    });
  }
});

// เข้าสู่ระบบ
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'เข้าสู่ระบบสำเร็จ',
      user: { 
        id: user._id, 
        username: user.username, 
        highScore: user.highScore 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' 
    });
  }
});

// บันทึกคะแนน
app.post('/api/save-score', async (req, res) => {
  try {
    const { userId, score } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบผู้ใช้' 
      });
    }
    
    // อัปเดตคะแนนสูงสุด
    let isNewHighScore = false;
    if (score > user.highScore) {
      user.highScore = score;
      isNewHighScore = true;
    }
    
    user.totalGames += 1;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'บันทึกคะแนนสำเร็จ',
      highScore: user.highScore,
      isNewHighScore: isNewHighScore
    });
  } catch (error) {
    console.error('Save score error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการบันทึกคะแนน' 
    });
  }
});

// ดึงตารางคะแนน
app.get('/api/leaderboard', async (req, res) => {
  try {
    const topPlayers = await User.find({ highScore: { $gt: 0 } })
      .sort({ highScore: -1 })
      .limit(10)
      .select('username highScore totalGames');
    
    res.json({ 
      success: true, 
      leaderboard: topPlayers 
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคะแนน' 
    });
  }
});

// Real-time ด้วย Socket.io
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-game', (userData) => {
    socket.join('game-room');
    console.log(`User ${userData.username} joined game`);
    
    socket.to('game-room').emit('player-joined', {
      username: userData.username,
      message: `🎮 ${userData.username} เข้าร่วมเกม`
    });
  });
  
  socket.on('player-score-update', (data) => {
    socket.to('game-room').emit('score-updated', {
      username: data.username,
      score: data.score,
      message: `🏆 ${data.username} ได้ ${data.score} คะแนน!`
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 Click Game Server Started!');
  console.log(`📍 Port: ${PORT}`);
  console.log('💾 Using: MongoDB Atlas (FREE)');
  console.log('=================================');
});