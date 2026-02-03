import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

export class HelpHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!help') {
            const helpMessage = `*Comandos Disponibles:*
!ping - Responde con "pong".
!help - Muestra este mensaje de ayuda.
!hello - Saludo del bot.
!sticker - Convierte una imagen en sticker (envía con el comando en el pie de foto).
!pdf <texto> - Crea un PDF con el texto proporcionado.
!weather <ciudad> - Muestra el clima de una ciudad.
!todo <tarea> - Agrega una tarea a tu lista.
!news - Muestra noticias recientes.
!joke - Cuenta un chiste.
!quote - Muestra una frase inspiradora.
!crypto <id> - Muestra el precio de una criptomoneda (ej: bitcoin).
!define <palabra> - Define una palabra en inglés.
!wiki <consulta> - Busca información en Wikipedia.
!translate <idioma> <texto> - Traduce texto al idioma deseado.`;
            await message.reply(helpMessage);
        } else {
            await super.handle(message, client);
        }
    }
}
