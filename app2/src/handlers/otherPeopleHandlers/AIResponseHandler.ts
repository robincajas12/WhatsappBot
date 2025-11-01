import { WAMessage } from "@whiskeysockets/baileys";
import makeWASocket from "@whiskeysockets/baileys";
import { AbstractMessageHandler } from "../AbstractMessageHandler.js";
import { GoogleGenAI } from "@google/genai";
import { ChatHistory, ChatMessage } from "../../database.js";

const API_KEY = process.env.GOOGLE_API_KEY;

export class AIResponseHandler extends AbstractMessageHandler {
    private static ai: GoogleGenAI | null;
    private static chatHistory = new ChatHistory();

    constructor() {
        super();
    }

    private static getAIInstance(): GoogleGenAI {
        if (!AIResponseHandler.ai) {
            if (!API_KEY) throw new Error("Falta API_KEY en las variables de entorno");
            AIResponseHandler.ai = new GoogleGenAI({ apiKey: API_KEY });
        }
        return AIResponseHandler.ai;
    }

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const userId = message.key.remoteJid;
        const messageBody = message.message?.conversation || message.message?.extendedTextMessage?.text || "";

        if (!userId || !messageBody) {
            await super.handle(message, sock);
            return;
        }

        let aiInstance: GoogleGenAI;
        try {
            aiInstance = AIResponseHandler.getAIInstance();
        } catch (e) {
            console.error("Error inicializando GoogleGenAI:", e);
            await super.handle(message, sock);
            return;
        }

        try {
            const history = AIResponseHandler.chatHistory.getHistory(userId);
            const newConversation: ChatMessage[] = [
                ...history,
                { role: "user", parts: [{ text: messageBody }] }
            ];

            const systemInstruction = `You are a helpful assistant. Someone sent the following WhatsApp message. Based on the provided history, write a short, friendly, and concise reply in the same language as the message. Keep it under 3 sentences. Use plain text only, no markdown or special formatting. Default language is Spanish.`;

            const result = await aiInstance.models.generateContent({
                model: "gemini-2.5-flash",
                contents: newConversation,
                config: {
                    systemInstruction: systemInstruction,
                },
            });

            const responseText = result.text?.trim() || null;

            if (responseText) {
                await sock.sendMessage(userId, { text: responseText });
                // Save both user message and model response to the database
                AIResponseHandler.chatHistory.addMessage(userId, 'user', messageBody);
                AIResponseHandler.chatHistory.addMessage(userId, 'model', responseText);
            } else {
                console.warn("Respuesta vacía del modelo.");
                await super.handle(message, sock);
            }

        } catch (error) {
            console.error("Error llamando a Gemini API o en la lógica de historial:", error);
            await super.handle(message, sock);
        }
    }
}
