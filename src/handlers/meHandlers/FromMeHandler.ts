import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

class FromMeHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        // Lógica específica para manejar mensajes enviados por mí
        console.log("Manejando mensaje enviado por mí:", message);
        await super.handle(message,client);
    }
}
export default FromMeHandler ;