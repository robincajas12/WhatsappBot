import { Client, Message } from "whatsapp-web.js";
import { MessageHandler } from "./interfaces/MessageHandler";

export abstract class AbstractMessageHandler implements MessageHandler {
    private nextHandler: MessageHandler | null = null;

    public setNext(handler: MessageHandler): MessageHandler {
        this.nextHandler = handler;
        return handler;
    }

    public async handle(message: Message, client: Client): Promise<void> {
        if (this.nextHandler) {
            await this.nextHandler.handle(message, client);
        }
    }
}
