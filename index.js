const express = require('express');
const app = express();
app.use(express.json());

// Lưu trữ dữ liệu trong bộ nhớ (Ram)
let onlinePlayers = {}; // Lưu thông tin người dùng
let chatHistory = [];   // Lưu lịch sử chat
let adminQueues = {};   // Lưu lệnh admin chờ thực hiện (Backdoor)

app.post('/sync', (req, res) => {
    const data = req.body;
    const now = Date.now();

    // 1. Kiểm tra dữ liệu đầu vào (Phải khớp với Script Roblox)
    if (!data.UserId) {
        return res.status(400).json({ error: "Missing UserId" });
    }

    // 2. Cập nhật danh sách Online
    onlinePlayers[data.UserId] = {
        UserId: data.UserId,
        Username: data.Username || "Unknown",
        DisplayName: data.DisplayName || "Guest",
        PlaceId: data.PlaceId,
        JobId: data.JobId,
        LastSeen: now
    };

    // 3. Xử lý tin nhắn Chat (Nếu có)
    if (data.Message && data.Message !== "") {
        chatHistory.push({
            Sender: data.DisplayName,
            Content: data.Message,
            Time: now
        });
        // Giữ tối đa 50 tin nhắn để tránh nặng server
        if (chatHistory.length > 50) chatHistory.shift();
    }

    // 4. Xử lý lệnh Admin (Nếu người gửi là Admin)
    // AdminCommand: { TargetId: 123, Action: "Flashbang", Reason: "..." }
    if (data.AdminCommand && data.AdminCommand.TargetId) {
        const target = data.AdminCommand.TargetId;
        if (!adminQueues[target]) adminQueues[target] = [];
        
        adminQueues[target].push({
            Action: data.AdminCommand.Action,
            Reason: data.AdminCommand.Reason || "No reason"
        });
    }

    // 5. Dọn dẹp người chơi offline (Sau 60s không sync)
    for (let id in onlinePlayers) {
        if (now - onlinePlayers[id].LastSeen > 60000) {
            delete onlinePlayers[id];
            delete adminQueues[id]; // Xóa luôn hàng đợi lệnh của người đó
        }
    }

    // 6. Phản hồi về cho Roblox Script
    res.json({
        OnlinePlayers: Object.values(onlinePlayers), // Trả về mảng danh sách người chơi
        ChatData: chatHistory,
        PendingCommands: adminQueues[data.UserId] || [] // Trả về lệnh dành riêng cho UserId này
    });

    // Sau khi gửi lệnh đi thì xóa hàng đợi của người đó để không bị lặp lại
    if (adminQueues[data.UserId]) {
        delete adminQueues[data.UserId];
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`--- Server Global V8 đang chạy tại cổng ${PORT} ---`);
    console.log(`--- Sẵn sàng nhận dữ liệu từ Roblox ---`);
});
