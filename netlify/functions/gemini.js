import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

// เลือก Model ที่ต้องการ
// หมายเหตุ: gemini-2.0-flash-exp อาจจะยังไม่เสถียรในบาง region แนะนำใช้ gemini-1.5-flash หรือ gemini-1.5-pro ถ้ามีปัญหา
const modelId = 'gemini-1.5-flash'; 

export default async (req, context) => {
    // ตรวจสอบ Method
    if (req.method !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is missing');
        }

        // อ่าน Body (Netlify ส่งมาเป็น String ต้อง Parse ก่อน)
        const body = req.body ? JSON.parse(req.body) : {};
        const { query, isSearch } = body;

        if (!query) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing query parameter' }),
            };
        }

        let responseText = '';

        if (!isSearch) {
            // โหมดคุยปกติ
            const result = await ai.models.generateContent({
                model: modelId,
                contents: [{ role: 'user', parts: [{ text: query }] }],
                config: {
                    systemInstruction: "You are a helpful and concise AI assistant. Respond in Thai and use markdown for formatting."
                }
            });
            responseText = result.response.text();
        } else {
            // โหมดค้นหา (Grounding with Google Search)
            // ต้องมั่นใจว่า Model รองรับ Tools นี้
             const result = await ai.models.generateContent({
                model: modelId,
                contents: [{ role: 'user', parts: [{ text: query }] }],
                config: {
                    tools: [{ googleSearch: {} }],
                    systemInstruction: "You are an expert search assistant. Use Google Search to find up-to-date information. Cite sources. Summarize in Thai."
                }
            });
            
            // Handle Safety or Empty
            if (!result.response.candidates || result.response.candidates.length === 0) {
                 return { statusCode: 200, body: JSON.stringify({ text: "ไม่พบข้อมูล หรือถูกระงับด้วยนโยบายความปลอดภัย" }) };
            }
            
            responseText = result.response.text();
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: responseText }),
        };

    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal Server Error', 
                details: error.message 
            }),
        };
    }
};
