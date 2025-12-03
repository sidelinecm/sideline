// ✅ ใช้ require แทน import (V1/Legacy Mode)
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ✅ ใช้ exports.handler แทน export default async (req, context) (V1/Legacy Mode)
exports.handler = async (event, context) => {
    // 1. ตรวจสอบ Method
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        // 2. ตรวจสอบ API Key (สำคัญต่อ Error 500)
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Server Configuration Error: API Key is missing" })
            };
        }

        // 3. Parse Body (Legacy Mode: event.body เป็น String)
        // ใช้ try...catch เพื่อป้องกัน JSON.parse crash
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
        
        // 4. ตั้งค่า Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let systemInstruction = isSearch 
            ? "You are an expert search assistant. Use Google Search to find up-to-date information. Summarize in Thai."
            : "You are a helpful and concise AI assistant. Respond in Thai and use markdown for formatting.";

        // 5. เรียกใช้ Gemini API (จุดที่แก้ไข Error 400)
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: query }] }],
            // ✅ Fix: ย้าย systemInstruction และ tools ออกจาก Object 'config'
            systemInstruction: systemInstruction, 
            tools: isSearch ? [{ googleSearch: {} }] : [] 
        });
        
        let responseText = result.response.text;

        // 6. ส่งกลับแบบ Legacy Object (V1 Format)
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" 
            },
            body: JSON.stringify({ text: responseText })
        };

    } catch (error) {
        // 7. ดักจับ Error ที่เหลือทั้งหมด (รวมถึงปัญหา API Key/Quota)
        console.error("Critical API Error (Check Key/Quota):", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal API Call Failed", message: error.message, hint: "Check GEMINI_API_KEY or usage quota." })
        };
    }
};