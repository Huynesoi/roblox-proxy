const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// API KEY của bạn
const MY_KEY = "AIzaSyCjE11tNs3HBmWdH3tm1WS6ZbeVr5LxoTM";

app.post('/ask', async (req, res) => {
    try {
        const userText = req.body.text;
        // ĐÃ SỬA: Thay v1beta bằng v1 để khớp với model 1.5-flash
        const googleUrl = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + MY_KEY;

        const response = await axios.post(googleUrl, {
            contents: [{ parts: [{ text: userText }] }]
        });

        const aiAnswer = response.data.candidates[0].content.parts[0].text;
        res.json({ answer: aiAnswer });

    } catch (err) {
        const errorDetail = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error("LOI_CUA_GOOGLE:", errorDetail);
        res.status(500).json({ error: "Loi Google Roi!", details: errorDetail });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server Live"));
