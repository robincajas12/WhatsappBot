import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from './AbstractMessageHandler.js';

/**
 * A handler that blocks any message coming from a group chat.
 */
export class GroupMessageBlocker extends AbstractMessageHandler {
    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const chatId = message.key.remoteJid;

        // Check if the chat ID ends with '@g.us', which indicates a group chat.
        if (chatId?.endsWith('@g.us')) {
            console.log(`Ignoring message from group: ${chatId}`);
            return; // Stop the chain here.
        }

        // If it's not a group message, pass it to the next handler.
        await super.handle(message, sock);
    }
}
