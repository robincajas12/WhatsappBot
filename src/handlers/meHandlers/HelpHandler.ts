import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

export class HelpHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!help') {
            const helpMessage = `*Comandos Disponibles:*
!ping - Responde con "pong".
!help - Muestra este mensaje de ayuda.`;
            await message.reply(helpMessage);
        } else {
            await super.handle(message, client);
        }
    }
}
