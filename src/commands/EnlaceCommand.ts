import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';

export class EnlaceCommand implements Command {
    private dbService = DatabaseService.getInstance();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        const targetDest = sender;

        // Case 1: List all shortcuts when no arguments are provided
        if (args.length === 0) {
            try {
                const links = await this.dbService.getAllLinks();
                if (links.length === 0) {
                    await sock.sendMessage(targetDest, { 
                        text: "🔗 *Lista de enlaces vacía.*\n\nGuarda uno usando:\n`!enlace <nombre> <url>`" 
                    });
                    return;
                }

                let listText = "🔗 *Enlaces Guardados*:\n\n";
                links.forEach(l => {
                    listText += `• *${l.name}*: ${l.url}\n`;
                });
                listText += `\nPara eliminar uno usa:\n\`!enlace delete <nombre>\``;

                await sock.sendMessage(targetDest, { text: listText });
            } catch (err) {
                console.error("Error al listar enlaces:", err);
                await sock.sendMessage(targetDest, { text: "❌ Error al obtener la lista de enlaces." });
            }
            return;
        }

        const firstArg = args[0].toLowerCase();

        // Case 2: Delete/remove a link
        if ((firstArg === 'delete' || firstArg === 'remove' || firstArg === 'eliminar') && args.length >= 2) {
            const nameToDelete = args.slice(1).join(' ').trim();
            try {
                const deleted = await this.dbService.deleteLink(nameToDelete);
                if (deleted) {
                    await sock.sendMessage(targetDest, { text: `🗑️ Enlace *${nameToDelete}* eliminado con éxito.` });
                } else {
                    await sock.sendMessage(targetDest, { text: `⚠️ No se encontró ningún enlace con el nombre *${nameToDelete}*.` });
                }
            } catch (err) {
                console.error("Error al eliminar enlace:", err);
                await sock.sendMessage(targetDest, { text: "❌ Error al intentar eliminar el enlace." });
            }
            return;
        }

        // Case 3: Save/update a link (args.length >= 2 and second arg starts with http/https)
        const isUrl = (str: string) => {
            try {
                const url = new URL(str);
                return url.protocol === "http:" || url.protocol === "https:";
            } catch (_) {
                return false;
            }
        };

        const possibleUrl = args[args.length - 1];
        if (args.length >= 2 && isUrl(possibleUrl)) {
            const name = args.slice(0, args.length - 1).join(' ').trim();
            const url = possibleUrl;

            try {
                await this.dbService.addLink(name, url);
                await sock.sendMessage(targetDest, { 
                    text: `✅ Enlace guardado con éxito:\n\n*${name}* ➔ ${url}` 
                });
            } catch (err) {
                console.error("Error al guardar enlace:", err);
                await sock.sendMessage(targetDest, { text: "❌ Error al guardar el enlace." });
            }
            return;
        }

        // Case 4: Retrieve a link by name
        const nameToFind = args.join(' ').trim();
        try {
            const link = await this.dbService.getLink(nameToFind);
            if (link) {
                await sock.sendMessage(targetDest, { text: `🔗 *${link.name}*:\n${link.url}` });
            } else {
                await sock.sendMessage(targetDest, { 
                    text: `⚠️ No se encontró el enlace *${nameToFind}*.\n\nEscribe \`!enlace\` para ver la lista de accesos directos guardados.` 
                });
            }
        } catch (err) {
            console.error("Error al buscar enlace:", err);
            await sock.sendMessage(targetDest, { text: "❌ Error al buscar el enlace." });
        }
    }
}
