import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from '../AbstractMessageHandler.js';

class FromMeHandler extends AbstractMessageHandler {
    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        // Lógica específica para manejar mensajes enviados por mí
        console.log("Manejando mensaje enviado por mí:", message);
        await super.handle(message, sock);
    }
}
export default FromMeHandler;
