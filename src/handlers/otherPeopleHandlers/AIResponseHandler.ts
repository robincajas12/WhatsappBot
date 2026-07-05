import { WAMessage } from "@whiskeysockets/baileys";
import makeWASocket from "@whiskeysockets/baileys";
import { AbstractMessageHandler } from "../AbstractMessageHandler.js";
import { GoogleGenAI } from "@google/genai";
import { DatabaseService, ChatMessage } from "../../database.js";
import Gemini from "../../ai/services/Gemini.js";
import AI from "../../ai/interfaces/AI.js";
import * as fs from "fs";
import * as path from "path";

const API_KEY = process.env.GOOGLE_API_KEY;

export class AIResponseHandler extends AbstractMessageHandler {
    private static ai: AI | null;
    private static dbService = DatabaseService.getInstance();

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

        // Limit the message length to prevent token-wasting spam or prompt injections
        if (messageBody.length > 600) {
            console.log(`[AI] Mensaje ignorado de ${userId} por longitud excesiva: ${messageBody.length} caracteres.`);
            return;
        }

        try {
            const aiInstance = AIResponseHandler.getAIInstance();
            const history = await AIResponseHandler.dbService.getHistory(userId);
            const newConversation: ChatMessage[] = [
                ...history,
                { role: "user", parts: [{ text: messageBody }] }
            ];

            let systemInstruction = `Actúa como una persona real en una conversación casual de WhatsApp en español. Responde de forma amigable, informal y muy natural. Evita sonar como un asistente formal o estructurado (no uses viñetas, ni listas, ni formatos rígidos). Puedes usar minúsculas informales, abreviaciones comunes y algún emoji de manera natural. Mantén las respuestas cortas (de 1 a 3 oraciones). Bajo ninguna circunstancia menciones que eres una IA, un bot o un asistente virtual.`;
            try {
                const templatePath = path.join(process.cwd(), 'templates', 'system_instruction.txt');
                if (fs.existsSync(templatePath)) {
                    systemInstruction = fs.readFileSync(templatePath, 'utf8').trim();
                }
            } catch (err) {
                console.error("Error al leer plantilla de system_instruction:", err);
            }

            // Enviar estado de "escribiendo..." (typing indicator)
            await sock.sendPresenceUpdate('composing', userId);
            
            const result = await aiInstance.ask(
                newConversation,
                systemInstruction
            );

            const responseText = result;

            if (responseText) {
                // Calcular un retraso realista de escritura basado en la longitud de la respuesta (ej. 50ms por carácter, mín 1.5s, máx 5s)
                const typingDelay = Math.min(Math.max(responseText.length * 40, 1500), 5000);
                await new Promise(resolve => setTimeout(resolve, typingDelay));

                await sock.sendMessage(userId, { text: responseText });
                
                // Detener estado de escribiendo
                await sock.sendPresenceUpdate('paused', userId);
                
                // Save interaction to the database
                await AIResponseHandler.dbService.addMessage(userId, 'user', messageBody);
                await AIResponseHandler.dbService.addMessage(userId, 'model', responseText);
            } else {
                console.warn("Respuesta vacía del modelo.");
                await sock.sendPresenceUpdate('paused', userId);
            }

        } catch (error) {
            console.error("Error en AIResponseHandler:", error);
        }
        // We don't call super.handle() here because this is the end of this specific chain.
    }
}
