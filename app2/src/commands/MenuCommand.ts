import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';

export class MenuCommand implements Command {
    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const userId = message.key.remoteJid;
        if (!userId) return;

        const menuText = `🤖 Opciones de IA 🤖

Puedes controlar las respuestas de IA con los siguientes comandos:

• ` + "`!ai on`" + `: Activa las respuestas de IA para este chat.
• ` + "`!ai off`" + `: Desactiva las respuestas de IA para este chat.

Nota: Si el administrador ha configurado tu acceso, puede que no puedas cambiar esta opción.`;

        await sock.sendMessage(userId, { text: menuText });
    }
}
