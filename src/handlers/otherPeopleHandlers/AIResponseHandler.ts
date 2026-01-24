import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export class AIResponseHandler extends AbstractMessageHandler {
    private readonly genAI: GoogleGenerativeAI;
    private readonly safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
    ];
    private readonly systemInstruction = `You are a helpful assistant for a busy person. Someone sent them the following WhatsApp message. Write a short, friendly, and concise reply in the same language as the message. Keep it under 3 sentences. use plain text only, no markdown or special formatting.`;

    constructor(apiKey: string) {
        super();
        if (!apiKey) {
            throw new Error("Google GenAI API key is required for AIResponseHandler.");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    public async handle(message: Message, client: Client): Promise<void> {
        try {
            const model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                safetySettings: this.safetySettings,
                systemInstruction: this.systemInstruction,
            });

            const result = await model.generateContent(message.body);
            const text = result.response.text()?.trim();

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
