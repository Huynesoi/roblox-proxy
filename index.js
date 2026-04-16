const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// In-memory store
const players = new Map();   // userId -> player record
const messages = [];         // chat log

function now() {
  return Date.now();
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function pushLimited(arr, item, limit = 200) {
  arr.push(item);
  while (arr.length > limit) arr.shift();
}

app.get("/", (req, res) => {
  res.json({ ok: true, service: "roblox-global-chat-bridge" });
});

app.post("/register", (req, res) => {
  const {
    userId,
    name,
    displayName,
    avatarUrl,
    placeId,
    jobId,
    gameName,
    anonymous = false,
    hideInfo = false,
  } = req.body || {};

  if (!userId || !name) {
    return res.status(400).json({ ok: false, error: "missing userId/name" });
  }

  const record = {
    userId: Number(userId),
    name: String(name),
    displayName: String(displayName || name),
    avatarUrl: String(avatarUrl || ""),
    placeId: Number(placeId || 0),
    jobId: String(jobId || ""),
    gameName: String(gameName || ""),
    anonymous: !!anonymous,
    hideInfo: !!hideInfo,
    updatedAt: now(),
  };

  players.set(String(userId), record);
  return res.json({ ok: true, player: record });
});

app.post("/unregister", (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "missing userId" });
  players.delete(String(userId));
  return res.json({ ok: true });
});

app.get("/players", (req, res) => {
  const list = Array.from(players.values()).sort((a, b) => a.userId - b.userId);
  res.json({ ok: true, players: list });
});

app.post("/chat", (req, res) => {
  const {
    userId,
    name,
    displayName,
    avatarUrl,
    message,
    anonymous = false,
    hideInfo = false,
    placeId,
    jobId,
    gameName,
  } = req.body || {};

  const clean = String(message || "").trim();
  if (!clean) {
    return res.status(400).json({ ok: false, error: "empty message" });
  }

  const sender = anonymous ? "Anonymous" : String(displayName || name || "Unknown");

  const msg = {
    id: makeId(),
    timestamp: now(),
    userId: Number(userId || 0),
    name: String(name || ""),
    displayName: String(displayName || name || "Unknown"),
    avatarUrl: String(avatarUrl || ""),
    sender,
    message: clean,
    anonymous: !!anonymous,
    hideInfo: !!hideInfo,
    placeId: Number(placeId || 0),
    jobId: String(jobId || ""),
    gameName: String(gameName || ""),
  };

  pushLimited(messages, msg, 200);
  res.json({ ok: true, message: msg });
});

app.get("/messages", (req, res) => {
  const since = Number(req.query.since || 0);
  const list = messages.filter(m => m.timestamp > since);
  res.json({ ok: true, messages: list });
});

app.get("/snapshot", (req, res) => {
  res.json({
    ok: true,
    messages,
    players: Array.from(players.values()).sort((a, b) => a.userId - b.userId),
    serverTime: now(),
  });
});

app.listen(PORT, () => {
  console.log(`Bridge running on port ${PORT}`);
});
