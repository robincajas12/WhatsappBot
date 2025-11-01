import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from '../AbstractMessageHandler.js';

export class PingHandler extends AbstractMessageHandler {
    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const messageBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        if (messageBody.toLowerCase() === '!ping') {
            await sock.sendMessage(message.key.remoteJid!, { text: 'pong' });
        } else {
            await super.handle(message, sock);
        }
    }
}
