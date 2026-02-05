import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

export class HelpHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!help') {
            const helpMessage = `*Comandos Disponibles:*
!ping - Responde con "pong".
!help - Muestra este mensaje de ayuda.
!sticker - Convierte una imagen enviada en sticker.
!pdf [texto] - Crea un archivo PDF con el texto proporcionado.
!weather [ciudad] - Muestra el clima de una ciudad (EE.UU.).
!todo [add|list|remove|clear] - Gestiona tu lista de tareas.
!news - Muestra las noticias principales (EE.UU.).
!joke - Cuenta un chiste aleatorio.
!frase - Muestra una frase inspiradora.
!crypto [moneda] - Muestra el precio de una criptomoneda.
!wiki [termino] - Busca un resumen en Wikipedia.
!traducir [texto] - Traduce un texto al español usando IA.
!github [usuario/repo] - Muestra información de un repositorio de GitHub.`;
            await message.reply(helpMessage);
        } else {
            await super.handle(message, client);
        }
    }
}
