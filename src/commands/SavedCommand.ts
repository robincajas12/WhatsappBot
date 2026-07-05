import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';

export class SavedCommand implements Command {
    private dbService = DatabaseService.getInstance();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        // Ensure response goes to the owner's private chat
        const myJid = sock.user?.id ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : (process.env.OWNER_JID || sender);
        const isSelfChat = (sender === myJid);
        const targetDest = isSelfChat ? sender : myJid;

        // 1. !saved without arguments -> List all saved messages with indices
        if (args.length === 0) {
            const allSaved = await this.dbService.getAllSavedMessages();
            if (allSaved.length === 0) {
                await sock.sendMessage(targetDest, { text: "📭 No tienes mensajes guardados." });
                return;
            }

            let text = `📂 *Mensajes Guardados (${allSaved.length})*:\n\n`;
            allSaved.forEach((m, idx) => {
                const contact = m.senderJid.split('@')[0];
                const keyStr = m.key ? ` [Categoría: *${m.key}*]` : "";
                text += `*${idx + 1}.* De: wa.me/${contact}${keyStr}\n> ${m.text.substring(0, 60)}${m.text.length > 60 ? '...' : ''}\n\n`;
            });
            text += `💡 _Usa \`!saved <número_tel>\` para ver los de un contacto, \`!saved key <categoría>\` para filtrar, \`!saved delete <número_tel>\` o \`!saved delete key <categoría>\` para borrar._`;
            await sock.sendMessage(targetDest, { text });
            return;
        }

        const subCommand = args[0].toLowerCase();

        // 2. !saved delete <numero> or !saved delete key <key>
        if (subCommand === 'delete' && args[1]) {
            if (args[1].toLowerCase() === 'key' && args[2]) {
                const searchKey = args.slice(2).join(' ').trim();
                const deletedCount = await this.dbService.deleteSavedMessagesByKey(searchKey);
                await sock.sendMessage(targetDest, { 
                    text: `🗑️ Se eliminaron *${deletedCount}* mensajes guardados de la categoría: *${searchKey}*.` 
                });
                return;
            }

            const contactPhone = args[1].trim();
            const deletedCount = await this.dbService.deleteSavedMessagesByContact(contactPhone);
            await sock.sendMessage(targetDest, { 
                text: `🗑️ Se eliminaron *${deletedCount}* mensajes guardados del contacto wa.me/${contactPhone}.` 
            });
            return;
        }

        // 3. !saved key <key>
        if (subCommand === 'key' && args[1]) {
            const searchKey = args.slice(1).join(' ').trim();
            const keySaved = await this.dbService.getSavedMessagesByKey(searchKey);
            if (keySaved.length === 0) {
                await sock.sendMessage(targetDest, { text: `📭 No hay mensajes guardados en la categoría: *${searchKey}*.` });
                return;
            }

            let text = `📂 *Mensajes Guardados en [${searchKey}]*:\n\n`;
            keySaved.forEach((m, idx) => {
                const contact = m.senderJid.split('@')[0];
                text += `*${idx + 1}.* De: wa.me/${contact}\n> ${m.text}\n\n`;
            });
            await sock.sendMessage(targetDest, { text });
            return;
        }

        // 4. !saved <numero_tel> (Assume the argument is a phone number if no other command fits)
        const contactPhone = args[0].trim();
        const contactSaved = await this.dbService.getSavedMessagesByContact(contactPhone);
        if (contactSaved.length === 0) {
            await sock.sendMessage(targetDest, { text: `📭 No tienes mensajes guardados de: wa.me/${contactPhone}.` });
            return;
        }

        let text = `📂 *Mensajes Guardados de wa.me/${contactPhone}*:\n\n`;
        contactSaved.forEach((m, idx) => {
            const keyStr = m.key ? ` (Categoría: *${m.key}*)` : "";
            text += `*${idx + 1}.*${keyStr}\n> ${m.text}\n\n`;
        });
        await sock.sendMessage(targetDest, { text });
    }
}
