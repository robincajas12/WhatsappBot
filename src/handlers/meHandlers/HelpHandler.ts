import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

export class HelpHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!help') {
            const helpMessage = `*Comandos Disponibles:*
!ping - Responde con "pong".
!help - Muestra este mensaje de ayuda.
!joke - Cuenta un chiste aleatorio.
!quote - Muestra una frase inspiradora aleatoria.
!weather [ubicación] - Muestra el clima para una ubicación.
!news - Muestra las noticias principales.
!crypto [id] - Muestra el precio de una criptomoneda (ej: !crypto bitcoin).
!pdf [texto] - Crea un archivo PDF con el texto proporcionado.
!sticker - Convierte una imagen en sticker (envía o responde a una imagen).
!todo [list|add|remove] [tarea] - Gestiona tu lista de tareas.
hello - Saluda al bot.`;
            await message.reply(helpMessage);
        } else {
            await super.handle(message, client);
        }
    }
}
