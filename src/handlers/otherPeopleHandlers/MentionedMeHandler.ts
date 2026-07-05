import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from '../AbstractMessageHandler.js';

class MentionedMeHandler extends AbstractMessageHandler {
    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const remoteJid = message.key.remoteJid;
        if (remoteJid && remoteJid.endsWith('@g.us')) { // solo grupos
            const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const me = sock.user?.id;

            if (me && mentions.includes(me)) {
                // El mensaje me menciona
                console.log("Manejando mensaje donde me mencionan:", message);
                await super.handle(message, sock);
                return;
            }
        }
        await super.handle(message, sock);
    }
}
export default MentionedMeHandler;
