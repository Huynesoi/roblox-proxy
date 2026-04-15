const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// API KEY MỚI CỦA BẠN ĐÂY NHÉ HEHEHEHEHEHEHEHEHH
const GEMINI_KEY = "AIzaSyCjE11tNs3HBmWdH3tm1WS6ZbeVr5LxoTM";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

app.post('/ask', async (req, res) => {
    try {
        const userInput = req.body.text;
        if (!userInput) return res.status(400).json({ error: "No text provided" });

        const response = await axios.post(API_URL, {
            contents: [{
                parts: [{ text: userInput }]
            }]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        // Kiểm tra dữ liệu trả về từ Google
        if (response.data && response.data.candidates && response.data.candidates[0].content) {
            const answer = response.data.candidates[0].content.parts[0].text;
            res.json({ answer: answer });
        } else {
            res.status(500).json({ error: "Google returned empty response" });
        }
    } catch (error) {
        // Log lỗi chi tiết ra console của Render để bạn xem
        console.error("LỖI GOOGLE:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
