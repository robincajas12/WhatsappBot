import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import { GoogleGenAI } from "@google/genai";

export class SummarizeHandler extends AbstractMessageHandler {
    private readonly ai: GoogleGenAI;
    private readonly systemInstruction = "You are an expert at summarizing long text. Provide a concise summary of the text provided, highlighting the main points.";

    constructor(apiKey: string) {
        super();
        if (!apiKey) {
            throw new Error("Google GenAI API key is required for SummarizeHandler.");
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase().startsWith('!summarize')) {
            const textToSummarize = message.body.slice(11).trim();

            if (!textToSummarize) {
                await message.reply("Please provide the text you want me to summarize after the !summarize command.");
                return;
            }

            try {
                // Following the memory instruction for @google/genai usage
                const result = await this.ai.models.generateContent({
                    model: "gemini-1.5-flash",
                    contents: [{ role: "user", parts: [{ text: textToSummarize }] }],
                    config: { systemInstruction: this.systemInstruction }
                });

                const summary = result.text?.trim();

                if (summary) {
                    await message.reply(`*Summary:*\n\n${summary}`);
                } else {
                    await message.reply("I couldn't generate a summary for that text.");
                }
            } catch (error) {
                console.error("Error calling Gemini API for summarization:", error);
                await message.reply("An error occurred while trying to summarize the text.");
            }
        } else {
            await super.handle(message, client);
        }
    }
}
