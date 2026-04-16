const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let onlinePlayers = {}; 
let commandQueue = [];  
let globalMessages = []; 

setInterval(() => {
    const now = Date.now();
    for (const userId in onlinePlayers) {
        if (now - onlinePlayers[userId].lastSeen > 15000) {
            delete onlinePlayers[userId];
        }
    }
}, 5000);

app.post('/sync', (req, res) => {
    const { UserId, Username, DisplayName, PlaceId, JobId, Message, AdminCommand } = req.body;

    if (!UserId) return res.status(400).json({ error: 'Missing UserId' });

    onlinePlayers[UserId] = {
        UserId,
        Username,
        DisplayName,
        PlaceId,
        JobId,
        lastSeen: Date.now()
    };

    if (Message) {
        globalMessages.push({ Sender: Username, DisplayName, Text: Message, Time: Date.now() });
        if (globalMessages.length > 50) globalMessages.shift();
    }

    if (AdminCommand) {
        commandQueue.push({
            TargetId: AdminCommand.TargetId,
            Action: AdminCommand.Action,
            Reason: AdminCommand.Reason,
            Timestamp: Date.now()
        });
    }

    const pendingForUser = commandQueue.filter(cmd => cmd.TargetId === UserId);
    commandQueue = commandQueue.filter(cmd => cmd.TargetId !== UserId);

    res.json({
        Success: true,
        OnlinePlayers: Object.values(onlinePlayers),
        GlobalMessages: globalMessages,
        PendingCommands: pendingForUser
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
