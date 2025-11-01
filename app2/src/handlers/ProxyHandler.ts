import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from './AbstractMessageHandler.js';
import { MessageHandler } from './interfaces/MessageHandler.js';

class ProxyHandler extends AbstractMessageHandler {
    private forMeHandler: MessageHandler;
    private forOtherPeopleHandler: MessageHandler;
    private forGroupHandler: MessageHandler;

    public constructor(forMeHandler: MessageHandler, forOtherPeopleHandler: MessageHandler, forGroupHandler: MessageHandler) {
        super();
        this.forMeHandler = forMeHandler;
        this.forOtherPeopleHandler = forOtherPeopleHandler;
        this.forGroupHandler = forGroupHandler;
    }

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const fromMe = message.key.fromMe;
        const remoteJid = message.key.remoteJid;

        if (fromMe) {
            await this.forMeHandler.handle(message, sock);
        } else if (remoteJid && remoteJid.endsWith('@g.us')) {
            await this.forGroupHandler.handle(message, sock);
        } else {
            await this.forOtherPeopleHandler.handle(message, sock);
        }
        await super.handle(message, sock);
    }
}

export { ProxyHandler };
