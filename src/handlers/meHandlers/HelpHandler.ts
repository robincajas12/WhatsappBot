import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

export class HelpHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!help') {
            const helpMessage = `*Comandos Disponibles:*

*General:*
!ping - Responde con "pong".
!help - Muestra este mensaje de ayuda.
hello - Saludo inicial del bot.

*Utilidades:*
!sticker - Convierte una imagen enviada en sticker.
!pdf <texto> - Crea un documento PDF con el texto proporcionado.
!weather <ciudad> - Muestra el pronóstico del tiempo para una ubicación.
!translate <idioma> <texto> - Traduce el texto al idioma especificado (ej. !translate ingles hola).

*Información y Entretenimiento:*
!wiki <término> - Busca un resumen en Wikipedia.
!quote - Obtiene una frase inspiradora aleatoria.
!joke - Cuenta un chiste (en inglés).
!news - Muestra las noticias más importantes.

*Gestión de Tareas:*
!todo list - Lista tus tareas.
!todo add <tarea> - Añade una tarea.
!todo remove <número> - Elimina una tarea por su número.
!todo clear - Limpia tu lista de tareas.`;
            await message.reply(helpMessage);
        } else {
            await super.handle(message, client);
        }
    }
}
