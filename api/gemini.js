// /api/gemini.js
// Netlify/Vercel Serverless Function (Proxy) - สำหรับเรียก Gemini API อย่างปลอดภัย

import { GoogleGenAI } from '@google/genai';

// 🔑 ดึง API Key จาก Environment Variable ที่ตั้งค่าไว้ใน Netlify/Vercel
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    // ต้องมี Key นี้ใน Environment Variable เท่านั้น
    throw new Error('GEMINI_API_KEY environment variable not set.');
}
const ai = new GoogleGenAI({ apiKey });
const model = 'gemini-2.5-flash';

// This is the Netlify function entry point (using the Vercel/Node.js style)
export default async function handler(req, res) {
    // ตรวจสอบว่าเป็น Method POST เท่านั้น
    if (req.method !== 'POST') {
        // ใน Netlify Function, req/res จะมีรูปแบบคล้าย Express แต่เราต้อง return ในรูปแบบของ Netlify Function
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // Netlify Function Event/Context handling
        // ต้องปรับให้เข้ากับรูปแบบของ Netlify/Node.js Functions โดยใช้ event.body
        const body = JSON.parse(req.body); 
        const { query, isSearch } = body;

        if (!query) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing query parameter in request body.' })
            };
        }

        let responseText = '';
        
        // 1. Logic สำหรับ General Chat (ไม่ใช้ Google Search)
        if (!isSearch) {
            const result = await ai.models.generateContent({
                model,
                contents: [{ role: 'user', parts: [{ text: query }] }],
                config: {
                    systemInstruction: "You are a helpful and concise AI assistant. Respond in Thai and use markdown for formatting."
                }
            });
            responseText = result.text;
        
        // 2. Logic สำหรับ Google Search (RAG/Overview)
        } else {
            const result = await ai.models.generateContent({
                model,
                contents: [{ role: 'user', parts: [{ text: query }] }],
                config: {
                    // เปิดใช้งาน Google Search Tool
                    tools: [{ googleSearch: {} }], 
                    systemInstruction: "You are an expert search assistant. Use Google Search to find up-to-date and relevant information, cite your sources, and summarize the findings clearly in Thai. If no search results are found, state that."
                }
            });

            // ตรวจสอบความปลอดภัย
            if (result.candidates && result.candidates[0] && result.candidates[0].finishReason === 'SAFETY') {
                return {
                    statusCode: 403,
                    body: JSON.stringify({ 
                        error: 'Safety Blocked', 
                        details: 'The query was blocked by content safety filters.' 
                    })
                };
            }

            responseText = result.text;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ text: responseText })
        };

    } catch (error) {
        console.error('Gemini API Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal Server Error',
                details: error.message
            })
        };
    }
}