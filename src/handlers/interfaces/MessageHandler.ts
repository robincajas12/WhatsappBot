import { Client, Message } from "whatsapp-web.js";

export interface MessageHandler {
    setNext(handler: MessageHandler): MessageHandler;
    handle(message: Message, client: Client): Promise<void>;
}
