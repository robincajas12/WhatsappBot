import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

class MentionedMeHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
         if (message.from.endsWith('@g.us')) { // solo grupos
        const mentions = message.mentionedIds || [];
        const me = client.info.me._serialized; // aquí se obtiene correctamente

        if (mentions.includes(me)) {
            // El mensaje me menciona
            console.log("Manejando mensaje donde me mencionan:", message);
            await super.handle(message, client);
            return;
        }
    }
        await super.handle(message, client);
    }
}
export default MentionedMeHandler;