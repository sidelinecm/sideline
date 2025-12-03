import { GoogleGenAI } from '@google/genai';

// Netlify Functions V2 ใช้ Standard Request/Response
export default async (req, context) => {
    // 1. ตรวจสอบ Method (ใช้ req.method ได้เลย)
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // 2. ตรวจสอบ API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is missing' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = 'gemini-1.5-flash';

    try {
        // 3. อ่าน Body: ใน V2 ใช้ req.json() ซึ่งเป็น Promise
        // ไม่ต้องใช้ JSON.parse(event.body) แล้ว
        const body = await req.json().catch(() => null);

        if (!body) {
             return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const { query, isSearch } = body;

        if (!query) {
             return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let responseText = '';
        let contents = [{ role: 'user', parts: [{ text: query }] }];
        let config = {};

        if (!isSearch) {
            config.systemInstruction = "You are a helpful and concise AI assistant. Respond in Thai and use markdown for formatting.";
        } else {
            config.tools = [{ googleSearch: {} }];
            config.systemInstruction = "You are an expert search assistant. Use Google Search to find up-to-date information. Cite sources. Summarize in Thai.";
        }
        
        // 4. เรียก Gemini API
        const result = await ai.models.generateContent({
            model: modelId,
            contents: contents,
            config: config
        });
            
        if (!result.response.candidates || result.response.candidates.length === 0) {
            responseText = "ไม่พบข้อมูล หรือถูกระงับด้วยนโยบายความปลอดภัย";
        } else {
            responseText = result.response.text();
        }

        // 5. ส่ง Response กลับแบบ V2 (new Response)
        return new Response(JSON.stringify({ text: responseText }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
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