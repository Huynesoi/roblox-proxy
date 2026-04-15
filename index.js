const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// API KEY của bạn
const KEY = "AIzaSyCjE11tNs3HBmWdH3tm1WS6ZbeVr5LxoTM";

app.post('/ask', async (req, res) => {
    try {
        const prompt = req.body.text;
        // Gọi thẳng link full để tránh lỗi dấu nháy trên điện thoại
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + KEY;

        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        const answer = response.data.candidates[0].content.parts[0].text;
        res.json({ answer: answer });
    } catch (error) {
        // In lỗi ra Log Render để kiểm tra
        console.error("LOI GOOGLE:", error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.response ? error.response.statusText : error.message 
        });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server Live!"));
