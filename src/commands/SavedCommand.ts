import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';
import * as fs from 'fs';

export class SavedCommand implements Command {
    private dbService = DatabaseService.getInstance();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        const targetDest = sender;

        // 1. !saved without arguments -> List all saved messages/files with indices
        if (args.length === 0) {
            const allSaved = await this.dbService.getAllSavedMessages();
            if (allSaved.length === 0) {
                await sock.sendMessage(targetDest, { text: "📭 No tienes elementos guardados." });
                return;
            }

            let text = `📂 *Elementos Guardados (${allSaved.length})*:\n\n`;
            allSaved.forEach((m, idx) => {
                const contact = m.senderJid.split('@')[0];
                const keyStr = m.key ? ` [Categoría: *${m.key}*]` : "";
                const typeStr = m.isFile ? ` 📄 [Archivo: *${m.fileName}*]` : "";
                
                // Show snippet of content
                const contentSnippet = m.isFile 
                    ? `(Archivo de medios)` 
                    : `${m.text.substring(0, 50)}${m.text.length > 50 ? '...' : ''}`;

                text += `*${idx + 1}.* ID: \`${m._id}\` (De: wa.me/${contact})${keyStr}${typeStr}\n> ${contentSnippet}\n\n`;
            });
            text += `💡 _Usa \`!saved <ID>\` para ver/descargar un elemento, \`!saved <tel>\` para buscar por número, o \`!saved key <categoría>\` para filtrar._\n`;
            text += `💡 _Para borrar: \`!saved delete id <ID>\`, \`!saved delete <tel>\` o \`!saved delete key <categoría>\`._`;
            await sock.sendMessage(targetDest, { text });
            return;
        }

        const subCommand = args[0].toLowerCase();

        // 2. !saved delete id <ID> or !saved delete <numero> or !saved delete key <key>
        if (subCommand === 'delete' && args[1]) {
            const deleteType = args[1].toLowerCase();

            if (deleteType === 'id' && args[2]) {
                const targetId = args[2].trim();
                const savedMsg = await this.dbService.getSavedMessageById(targetId);
                if (savedMsg) {
                    // If it was a file, delete the local file from disk
                    if (savedMsg.isFile && savedMsg.localPath && fs.existsSync(savedMsg.localPath)) {
                        try {
                            fs.unlinkSync(savedMsg.localPath);
                        } catch (err) {
                            console.error("Error al borrar archivo físico de guardados:", err);
                        }
                    }
                    await this.dbService.deleteSavedMessageById(targetId);
                    await sock.sendMessage(targetDest, { text: `🗑️ Elemento con ID *${targetId}* eliminado con éxito.` });
                } else {
                    await sock.sendMessage(targetDest, { text: `⚠️ No se encontró ningún elemento con ID *${targetId}*.` });
                }
                return;
            }

            if (deleteType === 'key' && args[2]) {
                const searchKey = args.slice(2).join(' ').trim();
                
                // Also clean up physical files for all items under this key
                const items = await this.dbService.getSavedMessagesByKey(searchKey);
                for (const item of items) {
                    if (item.isFile && item.localPath && fs.existsSync(item.localPath)) {
                        try {
                            fs.unlinkSync(item.localPath);
                        } catch (e) {}
                    }
                }

                const deletedCount = await this.dbService.deleteSavedMessagesByKey(searchKey);
                await sock.sendMessage(targetDest, { 
                    text: `🗑️ Se eliminaron *${deletedCount}* elementos guardados de la categoría: *${searchKey}*.` 
                });
                return;
            }

            const contactPhone = args[1].trim();
            
            // Clean up physical files for all items under this contact
            const items = await this.dbService.getSavedMessagesByContact(contactPhone);
            for (const item of items) {
                if (item.isFile && item.localPath && fs.existsSync(item.localPath)) {
                    try {
                        fs.unlinkSync(item.localPath);
                    } catch (e) {}
                }
            }

            const deletedCount = await this.dbService.deleteSavedMessagesByContact(contactPhone);
            await sock.sendMessage(targetDest, { 
                text: `🗑️ Se eliminaron *${deletedCount}* elementos guardados del contacto wa.me/${contactPhone}.` 
            });
            return;
        }

        // 3. !saved key <key>
        if (subCommand === 'key' && args[1]) {
            const searchKey = args.slice(1).join(' ').trim();
            const keySaved = await this.dbService.getSavedMessagesByKey(searchKey);
            if (keySaved.length === 0) {
                await sock.sendMessage(targetDest, { text: `📭 No hay elementos guardados en la categoría: *${searchKey}*.` });
                return;
            }

            let text = `📂 *Elementos Guardados en [${searchKey}]*:\n\n`;
            keySaved.forEach((m, idx) => {
                const contact = m.senderJid.split('@')[0];
                const typeStr = m.isFile ? ` 📄 [Archivo: *${m.fileName}*]` : "";
                const contentStr = m.isFile ? `(Escribe \`!saved ${m._id}\` para descargar)` : m.text;
                text += `*${idx + 1}.* ID: \`${m._id}\` (De: wa.me/${contact})${typeStr}\n> ${contentStr}\n\n`;
            });
            await sock.sendMessage(targetDest, { text });
            return;
        }

        // 4. Check if it's a specific ID query (e.g. !saved a8f9g12)
        const possibleId = args[0].trim();
        const savedMsg = await this.dbService.getSavedMessageById(possibleId);
        if (savedMsg) {
            if (savedMsg.isFile && savedMsg.localPath && fs.existsSync(savedMsg.localPath)) {
                await sock.sendMessage(targetDest, { text: `⏳ Enviando archivo guardado *${savedMsg.fileName}...*` });
                await sock.sendMessage(targetDest, {
                    document: { url: savedMsg.localPath },
                    fileName: savedMsg.fileName,
                    mimetype: savedMsg.mimeType || 'application/octet-stream'
                });
            } else {
                const contactDisplay = savedMsg.senderJid.split('@')[0];
                let respText = `📥 *Mensaje Guardado* (ID: \`${savedMsg._id}\`):\n\n> ${savedMsg.text}\n\n• *De*: wa.me/${contactDisplay}`;
                if (savedMsg.key) {
                    respText += `\n• *Categoría/Key*: \`${savedMsg.key}\``;
                }
                await sock.sendMessage(targetDest, { text: respText });
            }
            return;
        }

        // 5. !saved <numero_tel> (Fallback to phone number search)
        const contactPhone = args[0].trim();
        const contactSaved = await this.dbService.getSavedMessagesByContact(contactPhone);
        if (contactSaved.length === 0) {
            await sock.sendMessage(targetDest, { text: `📭 No tienes elementos guardados de: wa.me/${contactPhone} o el ID no es válido.` });
            return;
        }

        let text = `📂 *Elementos Guardados de wa.me/${contactPhone}*:\n\n`;
        contactSaved.forEach((m, idx) => {
            const keyStr = m.key ? ` (Categoría: *${m.key}*)` : "";
            const typeStr = m.isFile ? ` 📄 [Archivo: *${m.fileName}*]` : "";
            const contentStr = m.isFile ? `(Escribe \`!saved ${m._id}\` para descargar)` : m.text;
            text += `*${idx + 1}.* ID: \`${m._id}\`${keyStr}${typeStr}\n> ${contentStr}\n\n`;
        });
        await sock.sendMessage(targetDest, { text });
    }
}
