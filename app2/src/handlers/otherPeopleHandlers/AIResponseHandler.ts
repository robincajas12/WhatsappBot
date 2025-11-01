import { WAMessage } from "@whiskeysockets/baileys";
import makeWASocket from "@whiskeysockets/baileys";
import { AbstractMessageHandler } from "../AbstractMessageHandler.js";
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GOOGLE_API_KEY ;

export class AIResponseHandler extends AbstractMessageHandler {
    private static ai: GoogleGenAI | null;

    constructor() {
        super();
    }

    // Singleton de la instancia de IA
    private static getAIInstance(): GoogleGenAI {
        if (!AIResponseHandler.ai) {
            if (!API_KEY) throw new Error("Falta API_KEY en las variables de entorno");
            AIResponseHandler.ai = new GoogleGenAI({ apiKey: API_KEY });
        }
        return AIResponseHandler.ai;
    }

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        let aiInstance: GoogleGenAI;
        try {
            aiInstance = AIResponseHandler.getAIInstance();
        } catch (e) {
            console.error("Error inicializando GoogleGenAI:", e);
            await super.handle(message, sock);
            return;
        }

        try {
            const messageBody =
                message.message?.conversation ||
                message.message?.extendedTextMessage?.text ||
                "";

            if (!messageBody) {
                await super.handle(message, sock);
                return;
            }

            const systemInstruction = `You are a helpful assistant for a busy person. Someone sent them the following WhatsApp message. Write a short, friendly, and concise reply in the same language as the message. Keep it under 3 sentences. Use plain text only, no markdown or special formatting. Default language is Spanish.`;

            // 🧠 Llamada al modelo Gemini vía aiInstance.models.generateContent
            const result = await aiInstance.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: messageBody }] }],
                config: {
                    systemInstruction: systemInstruction,
                },
            });

            const text = result.text?.trim() || null;

            if (text) {
                await sock.sendMessage(message.key.remoteJid!, { text });
            } else {
                console.warn("Respuesta vacía del modelo.");
                await super.handle(message, sock);
            }

        } catch (error) {
            console.error("Error llamando a Gemini API:", error);
            await super.handle(message, sock);
        }
    }
}
