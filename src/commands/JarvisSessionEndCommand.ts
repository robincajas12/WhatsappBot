import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';
import { jules as julesClient } from '@google/jules-sdk';
import { sendBotMessage } from '../utils/botMessage.js';

export class JarvisSessionEndCommand implements Command {
    private db = DatabaseService.getInstance();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;
        const target = sender;

        if (args[0] && /^\d{4}$/.test(args[0])) {
            // If a shortId is provided, remove that mapping and clear only if it matches current active session
            const rec = await this.db.getJulesSessionByShortId(args[0]);
            if (!rec) {
                await sock.sendMessage(target, { text: `❌ Alias corto ${args[0]} no encontrado.` });
                return;
            }
            // Attempt to terminate the remote Jules session if possible
            const apiKey = process.env.JULES_API_KEY;
            const client = apiKey ? julesClient.with({ apiKey }) : julesClient;
            let remoteEnded = false;
            try {
                const session = (client as any).session?.(rec.sessionId) || (client as any).session(rec.sessionId);
                if (session) {
                    const endMethods = ['end','close','abort','cancel','stop','terminate','kill'];
                    for (const m of endMethods) {
                        if (typeof session[m] === 'function') {
                            try {
                                await session[m]();
                                remoteEnded = true;
                                break;
                            } catch (e) {
                                // try next
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Error intentando terminar sesión remota:', e);
            }

            // If current active session for user matches this sessionId, clear it
            const active = await this.db.getActiveSession(sender);
            if (active === rec.sessionId) {
                await this.db.clearActiveSession(sender);
            }
            await this.db.removeJulesSessionByShortId(args[0]);
            await sendBotMessage(sock, target, `✅ Alias corto ${args[0]} eliminado.${remoteEnded ? ' Sesión Jules terminada.' : ' No se pudo confirmar cierre remoto (API del SDK puede no soportarlo).'}`);
            return;
        }

        // No alias provided: clear active session for this user and try to end it remotely
        const activeSession = await this.db.getActiveSession(sender);
        if (!activeSession) {
            await sendBotMessage(sock, target, 'ℹ️ No tienes sesión activa.');
            return;
        }

        const apiKey2 = process.env.JULES_API_KEY;
        const client2 = apiKey2 ? julesClient.with({ apiKey: apiKey2 }) : julesClient;
        let remoteEnded2 = false;
        try {
            const session = (client2 as any).session?.(activeSession) || (client2 as any).session(activeSession);
            if (session) {
                const endMethods = ['end','close','abort','cancel','stop','terminate','kill'];
                for (const m of endMethods) {
                    if (typeof session[m] === 'function') {
                        try {
                            await session[m]();
                            remoteEnded2 = true;
                            break;
                        } catch (e) {
                            // try next
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error intentando terminar sesión remota:', e);
        }

        await this.db.clearActiveSession(sender);
        await sendBotMessage(sock, target, `✅ Sesión activa finalizada.${remoteEnded2 ? ' Sesión Jules terminada.' : ' No se pudo confirmar cierre remoto (SDK puede no soportarlo).'}`);
    }
}
