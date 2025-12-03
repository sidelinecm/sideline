import { GoogleGenerativeAI } from "@google/generative-ai";

export default async (req, context) => {
    // 1. ตรวจสอบ Method
    if (req.method !== 'POST') {
        return new Response("Method Not Allowed", { status: 405 });
    }

    // 2. ตรวจสอบ API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is missing' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 3. อ่าน Body (รองรับทั้งแบบ Stream และ JSON ปกติ)
        const body = await req.json().catch(() => null);

        if (!body || !body.query) {
             return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { query, isSearch } = body;

        // 4. ตั้งค่า Gemini (ใช้ Library มาตรฐาน @google/generative-ai)
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // เลือก Model
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            // ถ้าเป็นโหมด Search ต้องใช้ tools (ถ้าไม่ใช้ search ลบ tools ออกได้)
            tools: isSearch ? [{ googleSearch: {} }] : [] 
        });

        // ตั้งค่า Prompt System
        const systemInstruction = isSearch 
            ? "You are an expert search assistant. Use Google Search to find up-to-date information. Summarize in Thai."
            : "You are a helpful AI assistant. Respond in Thai.";

        // 5. เริ่ม Chat
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemInstruction }],
                },
                {
                    role: "model",
                    parts: [{ text: "เข้าใจแล้ว ฉันพร้อมช่วยเหลือคุณเป็นภาษาไทยครับ" }],
                }
            ],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        // ส่งข้อความ
        const result = await chat.sendMessage(query);
        const responseText = result.response.text();

        // 6. ส่งผลลัพธ์กลับ (Format ถูกต้อง 100%)
        return new Response(JSON.stringify({ text: responseText }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' // เผื่อเรียกจากหน้าเว็บอื่น
            }
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