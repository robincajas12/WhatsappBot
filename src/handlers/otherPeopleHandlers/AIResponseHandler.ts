import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler"; 
// ✅ Importación de la SDK oficial: @google/genai
import { GoogleGenAI } from "@google/genai"; 

// IMPORTANT: Replace "YOUR_GEMINI_API_KEY" with your actual Gemini API key
// 💡 NOTA: Se recomienda usar process.env.GEMINI_API_KEY
const API_KEY = process.env.API_KEY;

export class AIResponseHandler extends AbstractMessageHandler {
    private static ai: GoogleGenAI | null; 

    constructor() {
        super();
        
    }
    // singleton ai
    private static getAIInstance(): GoogleGenAI {
        if (!AIResponseHandler.ai) {
            AIResponseHandler.ai = new GoogleGenAI({apiKey: API_KEY});
        }
        return AIResponseHandler.ai;
    }

    public async handle(message: Message, client: Client): Promise<void> {
        if (!AIResponseHandler.getAIInstance()) {
            // Si la IA no está configurada, pasa al siguiente manejador
            await super.handle(message, client);
            return;
        }

        try {
            const systemInstruction = `You are a helpful assistant for a busy person. Someone sent them the following WhatsApp message. Write a short, friendly, and concise reply in the same language as the message. Keep it under 3 sentences. use plan text only, no markdown or special formatting.`;

            
            // 🛑 CORRECCIÓN CLAVE: El método generateContent se llama a través de this.ai.models
            const result = await AIResponseHandler.getAIInstance().models.generateContent({
                model: "gemini-2.5-flash", // Modelo para respuestas rápidas y concisas
                contents: message.body,
                config: {
                    // ✅ Usamos systemInstruction aquí
                    systemInstruction:  systemInstruction                }
            });
            
            // ✅ Uso de result.text para obtener la respuesta
            const text = result.text?.trim() || null;

            if (text) {
                await message.reply(text);
            }

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            // If AI fails, just pass to the next handler
            await super.handle(message, client);
        }    
    }
}