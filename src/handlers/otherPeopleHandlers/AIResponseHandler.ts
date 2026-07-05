import { WAMessage } from "@whiskeysockets/baileys";
import makeWASocket from "@whiskeysockets/baileys";
import { AbstractMessageHandler } from "../AbstractMessageHandler.js";
import { GoogleGenAI } from "@google/genai";
import { DatabaseService, ChatMessage } from "../../database.js";
import Gemini from "../../ai/services/Gemini.js";
import AI from "../../ai/interfaces/AI.js";

const API_KEY = process.env.GOOGLE_API_KEY;

export class AIResponseHandler extends AbstractMessageHandler {
    private static ai: AI | null;
    private static dbService = new DatabaseService();

    constructor() {
        super();
    }

    private static getAIInstance(): AI {
        if (!AIResponseHandler.ai) {
            if (!API_KEY) throw new Error("Falta API_KEY en las variables de entorno");
            AIResponseHandler.ai = new Gemini(API_KEY);
        }
        return AIResponseHandler.ai;
    }

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        // This handler is now only called if AIPermissionHandler allows it.
        const userId = message.key.remoteJid;
        const messageBody = message.message?.conversation || message.message?.extendedTextMessage?.text || "";

        if (!userId || !messageBody) {
            return; // Stop if no user or message body
        }

        try {
            const aiInstance = AIResponseHandler.getAIInstance();
            const history = await AIResponseHandler.dbService.getHistory(userId);
            const newConversation: ChatMessage[] = [
                ...history,
                { role: "user", parts: [{ text: messageBody }] }
            ];

            const systemInstruction = `You are a helpful assistant. Someone sent the following WhatsApp message. Based on the provided history, write a short, friendly, and concise reply in the same language as the message. Keep it under 3 sentences. Use plain text only, no markdown or special formatting. Default language is Spanish.`;

            const result = await aiInstance.ask(
                newConversation,
                systemInstruction
            );

            const responseText = result;

            if (responseText) {
                const footer = "\n\n---\nEsta respuesta fue generada por IA. Para más opciones, escribe !menu.";
                const fullResponse = responseText + footer;
                await sock.sendMessage(userId, { text: fullResponse });
                
                // Save interaction to the database (original response without footer)
                await AIResponseHandler.dbService.addMessage(userId, 'user', messageBody);
                await AIResponseHandler.dbService.addMessage(userId, 'model', responseText);
            } else {
                console.warn("Respuesta vacía del modelo.");
            }

        } catch (error) {
            console.error("Error en AIResponseHandler:", error);
        }
        // We don't call super.handle() here because this is the end of this specific chain.
    }
}
