import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from '../AbstractMessageHandler.js';
import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.API_KEY;

export class AIResponseHandler extends AbstractMessageHandler {
    private static ai: GoogleGenAI | null;

    constructor() {
        super();
    }

    private static getAIInstance(): GoogleGenAI | null {
        if (!AIResponseHandler.ai && API_KEY) {
            AIResponseHandler.ai = new GoogleGenAI({apiKey:API_KEY});
        }
        return AIResponseHandler.ai;
    }

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const aiInstance = AIResponseHandler.getAIInstance();
        if (!aiInstance) {
            await super.handle(message, sock);
            return;
        }

        try {
            const messageBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
            if (!messageBody) {
                await super.handle(message, sock);
                return;
            }

            const systemInstruction = `You are a helpful assistant for a busy person. Someone sent them the following WhatsApp message. Write a short, friendly, and concise reply in the same language as the message. Keep it under 3 sentences. use plan text only, no markdown or special formatting.`;

            const result = await aiInstance.models.generateContent({
                model: "gemini-2.5-flash", // Using gemini-1.5-flash as per app2's original attempt
                contents: [{ role: "user", parts: [{ text: messageBody }] }],
                config: {
                    systemInstruction: systemInstruction
                }
            });

            const text = result.text?.trim() || null;

            if (text) {
                await sock.sendMessage(message.key.remoteJid!, { text });
            }

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            await super.handle(message, sock);
        }
    }
}