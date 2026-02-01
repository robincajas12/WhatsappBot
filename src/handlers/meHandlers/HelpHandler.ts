import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

export class HelpHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!help') {
            const helpMessage = `*Comandos Disponibles:*
!ping - Responde con "pong".
!help - Muestra este mensaje de ayuda.
hello - Saludo del bot.
!sticker - Envía una imagen con este comando para convertirla en sticker.
!pdf <texto> - Crea un PDF con el texto proporcionado.
!weather <ubicación> - Obtiene el pronóstico del tiempo.
!todo <add/list/remove/clear> - Gestiona tu lista de tareas.
!news - Obtiene las noticias principales.
!joke - Cuenta un chiste.
!summarize <texto> - Resume un texto largo.
!translate <idioma> <texto> - Traduce texto al idioma especificado.
!quote - Obtiene una frase inspiradora aleatoria.
!crypto <moneda> - Obtiene el precio de una criptomoneda (ej. bitcoin).`;
            await message.reply(helpMessage);
        } else {
            await super.handle(message, client);
        }
    }
}
