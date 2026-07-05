import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';
import { jules as julesClient } from '@google/jules-sdk';
import { sendBotMessage } from '../utils/botMessage.js';

export class AskCommand implements Command {
    private db = DatabaseService.getInstance();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;
        const target = sender;

        if (!args || args.length === 0) {
            await sock.sendMessage(target, { text: '⚠️ Uso: `!ask <texto>` (usa alias corto o sessionId en su lugar: `!ask <alias> <texto>`).' });
            return;
        }

        let sessionIdentifier: string | undefined;
        let text: string;

        // If first arg looks like a 4-digit alias, resolve to sessionId
        if (/^\d{4}$/.test(args[0]) && args.length >= 2) {
            const rec = await this.db.getJulesSessionByShortId(args[0]);
            if (!rec) {
                await sock.sendMessage(target, { text: `❌ Alias corto ${args[0]} no encontrado.` });
                return;
            }
            sessionIdentifier = rec.sessionId;
            text = args.slice(1).join(' ');
        } else {
            // Use active session for this user if present
            const active = await this.db.getActiveSession(sender);
            if (active) {
                sessionIdentifier = active;
                text = args.join(' ');
            } else {
                // If user provided explicit sessionId as first arg and more text
                if (args.length >= 2) {
                    sessionIdentifier = args[0];
                    text = args.slice(1).join(' ');
                } else {
                    await sock.sendMessage(target, { text: '❌ No hay sesión activa. Usa `!jarvis-session-start <id>` o proporciona `!ask <id> <texto>`.' });
                    return;
                }
            }
        }

        // Send to Jules
        const apiKey = process.env.JULES_API_KEY;
        const client = apiKey ? julesClient.with({ apiKey }) : julesClient;

        try {
            const session = (client as any).session?.(sessionIdentifier) || (client as any).session(sessionIdentifier);
            if (!session) {
                await sock.sendMessage(target, { text: `❌ Sesión ${sessionIdentifier} no encontrada.` });
                return;
            }

            await sendBotMessage(sock, target, '⏳ Enviando a la sesión...');
            const reply = await session.ask(text);
            const msg = reply?.message || reply?.text || JSON.stringify(reply);
            await sendBotMessage(sock, target, `💬 Respuesta:\n\n${msg}`);
        } catch (e) {
            console.error('Error en AskCommand:', e);
            await sendBotMessage(sock, target, '❌ Error al comunicarse con la sesión Jules.');
        }
    }
}
