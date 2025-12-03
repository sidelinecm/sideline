import { GoogleGenAI } from '@google/genai';

// ใช้ 'event' แทน 'req, context' สำหรับ Netlify Functions/AWS Lambda
// ไฟล์นี้ควรถูกตั้งชื่อว่า gemini.js หรือ gemini.mjs และอยู่ในโฟลเดอร์ netlify/functions/
export default async (event) => {
    // 1. ตรวจสอบ Method
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    // 2. ตรวจสอบ API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // ควรตั้งค่า GEMINI_API_KEY ใน Netlify Environment Variables
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'GEMINI_API_KEY environment variable is missing' }),
        };
    }
    
    // สร้าง Instance ของ GoogleGenAI
    const ai = new GoogleGenAI({ apiKey });
    
    // เลือก Model ที่ต้องการ
    const modelId = 'gemini-1.5-flash'; 

    try {
        // 3. อ่าน Body: ต้องตรวจสอบและ Parse event.body ซึ่ง Netlify/Lambda ส่งมาเป็น String
        let body;
        if (!event.body) {
             return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing request body' }),
            };
        }
        
        try {
            // ใช้ JSON.parse() เพื่อแปลง String Body เป็น Object
            body = JSON.parse(event.body); 
        } catch (parseError) {
            console.error('Body Parse Error:', parseError);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid JSON body format' }),
            };
        }
        
        const { query, isSearch } = body;

        // 4. ตรวจสอบ Query
        if (!query) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing query parameter' }),
            };
        }

        let responseText = '';
        let contents = [{ role: 'user', parts: [{ text: query }] }];
        let config = {};

        if (!isSearch) {
            // โหมดคุยปกติ (Chat/Q&A)
            config.systemInstruction = "You are a helpful and concise AI assistant. Respond in Thai and use markdown for formatting.";
        } else {
            // โหมดค้นหา (Grounding with Google Search)
            config.tools = [{ googleSearch: {} }];
            config.systemInstruction = "You are an expert search assistant. Use Google Search to find up-to-date information. Cite sources. Summarize in Thai.";
        }
        
        // 5. เรียกใช้ Gemini API
        const result = await ai.models.generateContent({
            model: modelId,
            contents: contents,
            config: config
        });
            
        // 6. Handle Safety หรือ Empty Response
        if (!result.response.candidates || result.response.candidates.length === 0) {
            responseText = "ไม่พบข้อมูล หรือถูกระงับด้วยนโยบายความปลอดภัย";
        } else {
            responseText = result.response.text();
        }

        // 7. ส่ง Response ที่ถูกต้องตามมาตรฐาน Netlify Functions
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: responseText }),
        };

    } catch (error) {
        // 8. Handle Error ทั่วไป
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: 'Internal Server Error', 
                details: error.message 
            }),
        };
    }
};