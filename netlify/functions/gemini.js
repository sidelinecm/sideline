// ใช้ require แทน import (V1/Legacy Mode)
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ใช้ exports.handler แทน export default async (req, context) (V1/Legacy Mode)
exports.handler = async (event, context) => {
    // ตรวจสอบ Method
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        // ตรวจสอบ Key ก่อนเรียก API
        if (!apiKey) {
            console.error("Setup Error: GEMINI_API_KEY is missing");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Server Configuration Error: API Key missing" })
            };
        }

        // Parse Body
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
        
        // เรียก Gemini API
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let systemInstruction = isSearch 
            ? "You are an expert search assistant. Use Google Search to find up-to-date information. Summarize in Thai."
            : "You are a helpful and concise AI assistant. Respond in Thai and use markdown for formatting.";

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: query }] }],
            config: {
                systemInstruction: systemInstruction,
                tools: isSearch ? [{ googleSearch: {} }] : [] 
            }
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
        // ดักจับ Error 500 ที่เกิดจาก API Call ล้มเหลว
        console.error("Critical API Error (Check Key/Quota):", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal API Call Failed", message: error.message, hint: "Please re-check your GEMINI_API_KEY status and quota." })
        };
    }
};