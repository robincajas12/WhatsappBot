import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

export class HelpHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!help') {
            const helpMessage = `*Comandos Disponibles:*
!ping - Responde con "pong".
!help - Muestra este mensaje de ayuda.
!sticker - Convierte una imagen en sticker (envía con la imagen).
!pdf <texto> - Convierte texto a un archivo PDF.
!weather <ubicación> - Muestra el clima de una ubicación.
!todo [add|list|remove|clear] - Gestiona tu lista de tareas.
!news - Muestra las noticias principales.
!joke - Cuenta un chiste al azar.
!quote - Muestra una frase inspiradora.
!crypto <moneda> - Muestra el precio de una criptomoneda.
!define <palabra> - Muestra la definición de una palabra en inglés.`;
            await message.reply(helpMessage);
        } else {
            await super.handle(message, client);
        }
    }
}
