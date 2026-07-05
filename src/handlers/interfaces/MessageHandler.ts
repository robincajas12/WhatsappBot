import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';

export interface MessageHandler {
    setNext(handler: MessageHandler): MessageHandler;
    handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void>;
}
