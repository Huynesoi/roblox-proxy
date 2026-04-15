const express = require('express');
const app = express();
app.use(express.json());

let chatHistory = [];

app.post('/send', (req, res) => {
    const { player, message } = req.body;
    if (!player || !message) return res.status(400).json({ error: "No data" });

    let msgType = "text";
    let content = message;

    // Kiểm tra lệnh /copy hoặc /Copy
    if (message.toLowerCase().startsWith("/copy ")) {
        msgType = "file";
        content = message.substring(6); // Lấy phần nội dung sau lệnh
    }

    const newMsg = {
        player: player,
        message: content,
        type: msgType,
        time: Date.now()
    };

    chatHistory.push(newMsg);
    res.json({ success: true });
});

app.get('/chat', (req, res) => {
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    // Tự động lọc bỏ các tin nhắn cũ hơn 10 phút
    chatHistory = chatHistory.filter(msg => msg.time > tenMinutesAgo);
    res.json(chatHistory);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server Global Chat V2 Live!"));
