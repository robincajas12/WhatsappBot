import { ChatMessage } from "../../database.js";
import AI from "../interfaces/AI.js";
import { GoogleGenAI } from "@google/genai";
class Gemini extends AI  {
    private aiInstance: GoogleGenAI;
    constructor(apiKey: string) {
        super("gemini-2.5-flash", 0.7, 1024, apiKey);
        this.aiInstance = new GoogleGenAI({ apiKey: apiKey });
    }
    public async ask(chatMessage: ChatMessage[], systemInstructions: string): Promise<string | null> {
        const result = await this.aiInstance.models.generateContent({
                model: this.model,
                contents: chatMessage,
                config: {
                    systemInstruction: systemInstructions,
                },
            });
        return result.text?.trim() || null;
    }
}

export default Gemini;
