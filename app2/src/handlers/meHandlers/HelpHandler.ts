import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from '../AbstractMessageHandler.js';

export class HelpHandler extends AbstractMessageHandler {
    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const messageBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        if (messageBody.toLowerCase() === '!help') {
            const helpMessage = `*Comandos Disponibles:*
!ping - Responde con "pong".
!help - Muestra este mensaje de ayuda.`;
            await sock.sendMessage(message.key.remoteJid!, { text: helpMessage });
        } else {
            await super.handle(message, sock);
        }
    }
}
