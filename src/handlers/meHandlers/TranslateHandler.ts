import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import { GoogleGenAI } from "@google/genai";

export class TranslateHandler extends AbstractMessageHandler {
    private readonly ai: GoogleGenAI;

    constructor(apiKey: string) {
        super();
        if (!apiKey) {
            throw new Error("Google GenAI API key is required for TranslateHandler.");
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase().startsWith('!translate')) {
            const parts = message.body.split(' ');
            if (parts.length < 3) {
                await message.reply("Invalid format. Use !translate <language> <text>");
                return;
            }

            const targetLanguage = parts[1];
            const textToTranslate = parts.slice(2).join(' ');

            try {
                const systemInstruction = `You are a professional translator. Translate the following text to ${targetLanguage}. Provide only the translated text.`;

                const result = await this.ai.models.generateContent({
                    model: "gemini-1.5-flash",
                    contents: [{ role: "user", parts: [{ text: textToTranslate }] }],
                    config: { systemInstruction: systemInstruction }
                });

                const translation = result.text?.trim();

                if (translation) {
                    await message.reply(`*Translation (${targetLanguage}):*\n\n${translation}`);
                } else {
                    await message.reply("I couldn't translate the text.");
                }
            } catch (error) {
                console.error("Error calling Gemini API for translation:", error);
                await message.reply("An error occurred while trying to translate the text.");
            }
        } else {
            await super.handle(message, client);
        }
    }
}
