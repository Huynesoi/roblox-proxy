const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

let messages = [];
let activePlayers = {}; // Lưu trữ player theo userId

// Tự động xóa player nếu không có tín hiệu (heartbeat) sau 15 giây
setInterval(() => {
    const now = Date.now();
    for (const id in activePlayers) {
        if (now - activePlayers[id].lastSeen > 15000) {
            delete activePlayers[id];
        }
    }
}, 5000);

// Endpoint nhận nhịp đập (heartbeat) để cập nhật danh sách player & trả về data
app.post('/heartbeat', (req, res) => {
    const data = req.body;
    if (data && data.userId && !data.isHidden) {
        activePlayers[data.userId] = {
            ...data,
            lastSeen: Date.now()
        };
    } else if (data && data.isHidden && activePlayers[data.userId]) {
        delete activePlayers[data.userId]; // Ẩn info thì xóa khỏi map
    }
    
    // Trả về tin nhắn và danh sách player hiện tại
    res.json({ 
        success: true, 
        messages: messages, 
        players: Object.values(activePlayers) 
    });
});

// Endpoint gửi tin nhắn
app.post('/send', (req, res) => {
    const { sender, message, avatar } = req.body;
    if (message) {
        messages.push({ 
            sender: sender || 'Ẩn danh', 
            message: message, 
            avatar: avatar, 
            time: Date.now() 
        });
        
        // Chỉ giữ lại 50 tin nhắn gần nhất cho mượt
        if (messages.length > 50) messages.shift(); 
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
