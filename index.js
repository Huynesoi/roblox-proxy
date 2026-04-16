const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(bodyParser.json());
app.use(cors());

let messages = [];
let activePlayers = {};
let adminCommands = []; // Lưu lệnh troll từ admin

// Xử lý dọn dẹp mỗi 5 giây
setInterval(() => {
    const now = Date.now();
    // 1. Xóa tin nhắn quá 15 phút (900,000 ms)
    messages = messages.filter(msg => now - msg.time < 900000);
    
    // 2. Xóa player offline (quá 15s không heartbeat)
    for (const id in activePlayers) {
        if (now - activePlayers[id].lastSeen > 15000) {
            delete activePlayers[id];
        }
    }
    
    // 3. Xóa lệnh admin cũ (quá 10s)
    adminCommands = adminCommands.filter(cmd => now - cmd.time < 10000);
}, 5000);

app.post('/heartbeat', (req, res) => {
    const data = req.body;
    if (data && data.userId) {
        activePlayers[data.userId] = { ...data, lastSeen: Date.now() };
    }
    
    // Tìm xem có lệnh nào gửi riêng cho player này không
    const myCommands = adminCommands.filter(cmd => cmd.targetId == data.userId);
    
    res.json({ 
        success: true, 
        messages: messages, 
        players: Object.values(activePlayers),
        commands: myCommands 
    });
});

app.post('/send', (req, res) => {
    const { sender, message, avatar, type, content } = req.body;
    messages.push({ 
        sender, message, avatar, type: type || 'text', 
        content: content || '', time: Date.now() 
    });
    res.json({ success: true });
});

// Endpoint dành riêng cho Admin gửi lệnh troll
app.post('/admin/troll', (req, res) => {
    const { targetId, action, value } = req.body;
    adminCommands.push({ targetId, action, value, time: Date.now() });
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
