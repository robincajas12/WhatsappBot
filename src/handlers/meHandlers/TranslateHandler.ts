import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import { GoogleGenAI } from "@google/genai";

export class TranslateHandler extends AbstractMessageHandler {
    private ai: GoogleGenAI;
    private readonly systemInstruction = "Traduce el siguiente texto al español. Solo devuelve la traducción, sin explicaciones ni texto adicional.";

    constructor(apiKey: string) {
        super();
        this.ai = new GoogleGenAI({ apiKey });
    }

    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase().startsWith('!traducir ')) {
            const text = message.body.slice(10).trim();
            if (!text) {
                await message.reply("Por favor, proporciona el texto a traducir. Ejemplo: !traducir Hello world");
                return;
            }

            try {
                const result = await this.ai.models.generateContent({
                    model: "gemini-1.5-flash",
                    contents: [{ role: "user", parts: [{ text: text }] }],
                    config: {
                        systemInstruction: this.systemInstruction,
                    }
                });
                const translation = result.text;
                if (translation) {
                    await message.reply(translation.trim());
                } else {
                    await message.reply("No se pudo obtener una traducción.");
                }
            } catch (error) {
                console.error("Error in TranslateHandler:", error);
                await message.reply("Lo siento, hubo un error al traducir el texto.");
            }
        } else {
            await super.handle(message, client);
        }
    }
}
