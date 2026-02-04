import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import { GoogleGenAI } from "@google/genai";

export class TranslateHandler extends AbstractMessageHandler {
    private ai: GoogleGenAI;

    constructor(apiKey: string) {
        super();
        if (!apiKey) {
            throw new Error("Google GenAI API key is required for TranslateHandler.");
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    public async handle(message: Message, client: Client): Promise<void> {
        const translateRegex = /^!translate\s+([a-zA-Z-]+)\s+(.+)$/i;
        const match = message.body.match(translateRegex);

        if (match) {
            const targetLang = match[1];
            const textToTranslate = match[2];

            try {
                // Updated to follow memory instructions and fix compilation errors
                const result = await (this.ai as any).models.generateContent({
                    model: "gemini-1.5-flash",
                    contents: [{ role: "user", parts: [{ text: `Translate the following text to ${targetLang}: ${textToTranslate}` }] }],
                    config: {
                        systemInstruction: "You are a professional translator. Translate the text accurately and only provide the translated text as output."
                    },
                });

                const translatedText = result.text?.trim();

                if (translatedText) {
                    await message.reply(translatedText);
                } else {
                    await message.reply("No pude traducir el texto.");
                }
            } catch (error) {
                console.error("Error in TranslateHandler:", error);
                await message.reply("Ocurrió un error al intentar traducir el texto.");
            }
        } else {
            await super.handle(message, client);
        }
    }
}
