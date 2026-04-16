const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Lưu trữ dữ liệu trên RAM
let onlinePlayers = {}; // Key: UserId
let commandQueue = [];  // Hàng đợi lệnh từ Admin
let globalMessages = []; // Lịch sử chat

// Xóa người chơi offline (không ping sau 15s)
setInterval(() => {
    const now = Date.now();
    for (const userId in onlinePlayers) {
        if (now - onlinePlayers[userId].lastSeen > 15000) {
            delete onlinePlayers[userId];
        }
    }
}, 5000);

// Endpoint chính để nhận Payload đồng bộ từ Script
app.post('/sync', (req, res) => {
    const { UserId, Username, DisplayName, PlaceId, JobId, Message, AdminCommand } = req.body;

    if (!UserId) return res.status(400).json({ error: 'Missing UserId' });

    // 1. Cập nhật trạng thái người chơi
    onlinePlayers[UserId] = {
        UserId,
        Username,
        DisplayName,
        PlaceId,
        JobId,
        lastSeen: Date.now()
    };

    // 2. Xử lý tin nhắn Global Chat (nếu có)
    if (Message) {
        globalMessages.push({ Sender: Username, DisplayName, Text: Message, Time: Date.now() });
        // Giữ lại 50 tin nhắn gần nhất
        if (globalMessages.length > 50) globalMessages.shift();
    }

    // 3. Xử lý Lệnh Admin gửi lên Server
    if (AdminCommand) {
        commandQueue.push({
            TargetId: AdminCommand.TargetId,
            Action: AdminCommand.Action, // "Flashbang" hoặc "Kick"
            Reason: AdminCommand.Reason,
            Timestamp: Date.now()
        });
    }

    // 4. Lọc lệnh dành riêng cho nạn nhân này
    const pendingForUser = commandQueue.filter(cmd => cmd.TargetId === UserId);
    
    // Xóa lệnh đã được gửi đi để tránh lặp lại
    commandQueue = commandQueue.filter(cmd => cmd.TargetId !== UserId);

    // 5. Trả về dữ liệu
    res.json({
        Success: true,
        OnlinePlayers: Object.values(onlinePlayers),
        GlobalMessages: globalMessages,
        PendingCommands: pendingForUser
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Global Chat Server running on port ${PORT}`);
});
