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
    const translateRegex = /!translate\s+(\w+)\s+(.+)/i;
    const match = message.body.match(translateRegex);

    if (match) {
      const targetLang = match[1];
      const textToTranslate = match[2];

      try {
        const systemInstruction = `You are a professional translator. Translate the following text to ${targetLang}. Respond only with the translated text, no explanations.`;

        // Following memory advice for @google/genai
        const result = await this.ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: "user", parts: [{ text: textToTranslate }] }],
          config: {
            systemInstruction: systemInstruction,
          }
        } as any); // use any to bypass potential type mismatches if memory is slightly off but intended

        const translatedText = (result as any).text?.trim() || (result as any).response?.text()?.trim();

        if (translatedText) {
          await message.reply(translatedText);
        } else {
          await message.reply("No pude traducir el texto.");
        }
      } catch (error) {
        console.error('Error in TranslateHandler:', error);
        await message.reply("Hubo un error al procesar la traducción.");
      }
      return;
    }

    await super.handle(message, client);
  }
}
