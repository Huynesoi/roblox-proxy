const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const GEMINI_KEY = "AIzaSyAYhEzTQYNxLKZanRsvssHlBnweb5Sy-n0";
// Chú ý: Dùng bản v1beta vì nó hỗ trợ tốt nhất cho API Key đơn giản
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

app.post('/ask', async (req, res) => {
    try {
        const userInput = req.body.text;
        
        const response = await axios.post(API_URL, {
            contents: [{
                parts: [{ text: userInput }]
            }]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.candidates) {
            const answer = response.data.candidates[0].content.parts[0].text;
            res.json({ answer: answer });
        } else {
            res.status(500).json({ error: "Gemini không trả về dữ liệu" });
        }
    } catch (error) {
        console.error("LỖI CHI TIẾT:", error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: "Lỗi kết nối Gemini", 
            details: error.response ? error.response.data : error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});
