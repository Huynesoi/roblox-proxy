const express = require('express');
const app = express();
app.use(express.json());

// Nơi lưu trữ tin nhắn tạm thời
let chatHistory = [];

// API 1: Nhận tin nhắn từ người chơi và lưu lại
app.post('/send', (req, res) => {
    const { player, message } = req.body;
    
    if (player && message) {
        // Tạo tin nhắn mới kèm thời gian
        const newMsg = {
            player: player,
            message: message,
            time: Date.now()
        };
        
        chatHistory.push(newMsg);
        
        // Chỉ giữ lại 50 tin nhắn gần nhất để server không bị lag
        if (chatHistory.length > 50) {
            chatHistory.shift(); 
        }
        
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: "Thiếu nội dung" });
    }
});

// API 2: Trả về danh sách tin nhắn cho các người chơi khác xem
app.get('/chat', (req, res) => {
    res.json(chatHistory);
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Global Chat Server da san sang!");
});
