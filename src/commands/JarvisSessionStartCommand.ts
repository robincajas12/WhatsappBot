import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { jules as julesClient } from '@google/jules-sdk';
import { DatabaseService } from '../database.js';
import { sendBotMessage } from '../utils/botMessage.js';

export class JarvisSessionStartCommand implements Command {
    private db = DatabaseService.getInstance();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;
        const target = sender;

        if (!args || args.length === 0) {
            await sock.sendMessage(target, { text: '⚠️ Uso: `!jarvis-session-start <sessionId>`' });
            return;
        }

        let sessionId = args[0].trim();
        // Allow shortId lookup
        if (/^\d{4}$/.test(sessionId)) {
            const rec = await this.db.getJulesSessionByShortId(sessionId);
            if (rec) sessionId = rec.sessionId;
            else {
                await sock.sendMessage(target, { text: `❌ Alias corto ${args[0]} no encontrado.` });
                return;
            }
        }
        await this.db.setActiveSession(sender, sessionId);
        await sendBotMessage(sock, target, `✅ Sesión activa establecida: ${sessionId}\nA partir de ahora, tus mensajes serán enviados a esta sesión. Para detener: \`!jarvis-session-end\``);

        // Start a listener so plan messages from an already-existing session are forwarded here.
        (async () => {
            try {
                const apiKey = process.env.JULES_API_KEY;
                const client = apiKey ? julesClient.with({ apiKey }) : julesClient;
                const session = (client as any).session?.(sessionId) || (client as any).session(sessionId);
                if (!session) return;

                const stream = (session as any).stream?.();
                if (!stream) return;

                for await (const activity of stream) {
                    try {
                        const t = activity?.type;
                        if (t === 'planGenerated' || t === 'awaitingPlanApproval') {
                            const plan = activity.plan;
                            const steps = plan?.steps?.map((s: any) => `- ${s.title}`).join('\n') || JSON.stringify(plan);
                            await sendBotMessage(sock, target, `🧭 Plan generado para sesión ${sessionId}:\n${steps}\n\nAprobar con: !jarvis approve ${sessionId}`);
                        } else if (t === 'agentMessaged') {
                            const msg = activity.message || activity.summary || JSON.stringify(activity);
                            await sendBotMessage(sock, target, `🤖 Mensaje del agente:\n${msg}`);
                        }
                    } catch (inner) {
                        console.error('Error handling activity for active session:', inner);
                    }
                }
            } catch (streamErr) {
                console.error('Error listening to active session stream:', streamErr);
            }
        })();
    }
}
