const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const GEMINI_KEY = "AIzaSyAYhEzTQYNxLKZanRsvssHlBnweb5Sy-n0";

app.post('/ask', async (req, res) => {
    try {
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
            contents: [{ parts: [{ text: req.body.text }] }]
        });
        const reply = response.data.candidates[0].content.parts[0].text;
        res.json({ answer: reply });
    } catch (error) {
        res.status(500).json({ error: "Lỗi Gemini" });
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Server is running!'));
