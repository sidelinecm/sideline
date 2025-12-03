// **สำคัญ: ใช้ require แทน import**
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ใช้รูปแบบ Legacy (V1): exports.handler = async (event, context) => {...}
exports.handler = async (event, context) => {
    // 1. ตรวจสอบ Method
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Setup Error: GEMINI_API_KEY is missing");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Server Configuration Error: API Key missing" })
            };
        }

        // 2. Parse Body (Legacy Mode)
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
        
        // 3. เรียก Gemini
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

        // 4. ส่งกลับแบบ Legacy Object (V1 Format)
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" 
            },
            body: JSON.stringify({ text: responseText })
        };

    } catch (error) {
        // ถ้าเกิด Error ระหว่างเรียก API มันจะถูกจับที่นี่
        console.error("Critical Error in API Call:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Error", message: error.message, debug: "Check Netlify Logs for Critical Error in API Call" })
        };
    }
};