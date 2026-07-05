import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { MessageHandler } from './interfaces/MessageHandler.js';

export abstract class AbstractMessageHandler implements MessageHandler {
    private nextHandler: MessageHandler | null = null;

    public setNext(handler: MessageHandler): MessageHandler {
        this.nextHandler = handler;
        return handler;
    }

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        if (this.nextHandler) {
            await this.nextHandler.handle(message, sock);
        }
    }
}
