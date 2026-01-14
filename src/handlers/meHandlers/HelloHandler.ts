import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

export class HelloHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === 'hello') {
            await client.sendMessage(message.from, 'Hello! How can I help you?');
            return;
        }
        await super.handle(message, client);
    }
}
