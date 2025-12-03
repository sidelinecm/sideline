import { GoogleGenerativeAI } from "@google/generative-ai";

// โค้ดนี้ใช้รูปแบบ Netlify Functions V2 (Standard Web API) ที่ return เป็น new Response()
export default async (req, context) => {
    // 1. ตรวจสอบ Method
    if (req.method !== 'POST') {
        return new Response("Method Not Allowed", { status: 405 });
    }

    // 2. ตรวจสอบ API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'GEMINI_API_KEY environment variable is missing' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 3. อ่าน Body: V2 ใช้ req.json()
        const body = await req.json().catch(() => null);

        if (!body || !body.query) {
             return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const { query, isSearch } = body;

        // 4. ตั้งค่า Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelId = "gemini-1.5-flash";
        
        let config = {};

        if (!isSearch) {
            config.systemInstruction = "You are a helpful and concise AI assistant. Respond in Thai and use markdown for formatting.";
        } else {
            // โหมดค้นหา (Grounding)
            config.tools = [{ googleSearch: {} }];
            config.systemInstruction = "You are an expert search assistant. Use Google Search to find up-to-date information. Cite sources. Summarize in Thai.";
        }

        // 5. เรียกใช้ Gemini API
        const result = await genAI.models.generateContent({
            model: modelId,
            contents: [{ role: 'user', parts: [{ text: query }] }],
            config: config
        });
            
        let responseText = result.response.text;
        
        // 6. ส่ง Response กลับแบบ V2 (new Response)
        return new Response(JSON.stringify({ text: responseText }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        // 7. Handle Error ทั่วไป
        console.error('API Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal Server Error', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};