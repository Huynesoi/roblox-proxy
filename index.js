const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// API KEY mới bạn vừa gửi
const KEY = "AIzaSyCjE11tNs3HBmWdH3tm1WS6ZbeVr5LxoTM";

app.post('/ask', async (req, res) => {
    try {
        const prompt = req.body.text;
        // Dùng dấu cộng (+) để nối chuỗi cho an toàn trên điện thoại
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + KEY;

        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        // Trả kết quả về cho Roblox
        const answer = response.data.candidates[0].content.parts[0].text;
        res.json({ answer: answer });

    } catch (error) {
        // Lấy lỗi thật sự từ Google (ví dụ: bị chặn vùng miền, sai key...)
        const realError = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("LOG LOI:", realError);
        
        // Gửi cái lỗi thật này về cho Roblox xem
        res.status(500).json({ 
            error: "Loi Google Roi!", 
            details: realError 
        });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server Ready"));
