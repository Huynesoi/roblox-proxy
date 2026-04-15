const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// API Key của bạn
const GEMINI_KEY = "AIzaSyAYhEzTQYNxLKZanRsvssHlBnweb5Sy-n0";
// Chuyển sang v1 thay vì v1beta để ổn định hơn
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_KEY}`;

app.post('/ask', async (req, res) => {
    try {
        const userInput = req.body.text;
        if (!userInput) return res.status(400).json({ error: "Không có câu hỏi" });

        const response = await axios.post(API_URL, {
            contents: [{
                role: "user",
                parts: [{ text: userInput }]
            }]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.candidates && response.data.candidates[0].content) {
            const answer = response.data.candidates[0].content.parts[0].text;
            res.json({ answer: answer });
        } else {
            res.status(500).json({ error: "Google không trả về nội dung" });
        }
    } catch (error) {
        // Log này sẽ hiện trong mục LOGS trên Render để bạn kiểm tra
        console.error("LỖI TỪ GOOGLE:", error.response ? JSON.stringify(error.response.data) : error.message);
        
        res.status(500).json({ 
            error: "Lỗi kết nối Gemini", 
            debug: error.response ? error.response.data : error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server trung gian dang chay...");
});
