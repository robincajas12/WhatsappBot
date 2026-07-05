import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import * as fs from 'fs';
import * as path from 'path';

export class ListScriptsCommand implements Command {
    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        const scriptsDir = path.join(process.cwd(), 'scripts');

        if (!fs.existsSync(scriptsDir)) {
            await sock.sendMessage(sender, { text: "La carpeta 'scripts' no existe. Créala en la raíz del proyecto." });
            return;
        }

        try {
            const files = fs.readdirSync(scriptsDir);
            if (files.length === 0) {
                await sock.sendMessage(sender, { text: "No hay scripts en la carpeta 'scripts'." });
                return;
            }

            let responseText = "📄 *Scripts Disponibles:*\n\n";
            files.forEach((file, index) => {
                responseText += `${index + 1}. \`${file}\`\n`;
            });
            responseText += "\nPara ejecutar uno, escribe:\n`!run <nombre_del_script> [argumentos]`";

            await sock.sendMessage(sender, { text: responseText });
        } catch (error) {
            console.error("Error al listar scripts:", error);
            await sock.sendMessage(sender, { text: "Hubo un error al leer la carpeta de scripts." });
        }
    }
}
