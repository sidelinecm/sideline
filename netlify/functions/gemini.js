// ใช้ require แทน import (V1/Legacy Mode)
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ใช้ exports.handler แทน export default async (req, context) (V1/Legacy Mode)
exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Server Configuration Error: API Key is missing" })
            };
        }

        // Parse Body (Legacy Mode: event.body เป็น String)
        let body;
        try {
             body = JSON.parse(event.body); 
        } catch (e) {
            return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
        }
        
        const { query, isSearch } = body;
        if (!query) {
             return { statusCode: 400, body: JSON.stringify({ error: "Missing query" }) };
        }
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let systemInstruction = isSearch 
            ? "You are an expert search assistant. Use Google Search to find up-to-date information. Summarize in Thai."
            : "You are a helpful and concise AI assistant. Respond in Thai and use markdown for formatting.";

        // 🟢 จุดที่แก้ไข: ลบ 'config' ออก และใส่พารามิเตอร์ใน Object หลัก
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: query }] }],
            systemInstruction: systemInstruction, // ✅ ถูกต้อง
            tools: isSearch ? [{ googleSearch: {} }] : [] // ✅ ถูกต้อง
        });
        
        let responseText = result.response.text;

        // ส่งกลับแบบ Legacy Object (V1 Format)
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" 
            },
            body: JSON.stringify({ text: responseText })
        };

    } catch (error) {
        console.error("Critical API Error (Check Key/Quota):", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal API Call Failed", message: error.message, hint: "Check GEMINI_API_KEY or usage quota." })
        };
    }
};