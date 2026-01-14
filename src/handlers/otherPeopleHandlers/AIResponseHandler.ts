import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import { GoogleGenAI } from "@google/genai";

export class AIResponseHandler extends AbstractMessageHandler {
    private readonly ai: GoogleGenAI;
    private readonly systemInstruction = `You are a helpful assistant for a busy person. Someone sent them the following WhatsApp message. Write a short, friendly, and concise reply in the same language as the message. Keep it under 3 sentences. use plain text only, no markdown or special formatting.`;

    constructor(apiKey: string) {
        super();
        if (!apiKey) {
            throw new Error("Google GenAI API key is required for AIResponseHandler.");
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    public async handle(message: Message, client: Client): Promise<void> {
        try {
            const result = await this.ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: message.body }] }],
                systemInstruction: this.systemInstruction,
            });

            const text = result.response.text()?.trim() || null;

            if (text) {
                await message.reply(text);
            } else {
                await super.handle(message, client);
            }

        } catch (error) {
            console.error("Error calling Gemini API:", error);
            await super.handle(message, client);
        }
    }
}
