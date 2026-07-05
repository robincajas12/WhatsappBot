import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';

const OWNER_JID = process.env.OWNER_JID;

export class AddAiCommand implements Command {
    private static dbService = new DatabaseService();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;

        // This command should only be triggered for the owner, but as a safeguard:
        if (!OWNER_JID || (message.key.fromMe === false && sender !== OWNER_JID)) {
            console.log("Attempted to use admin command by non-owner:", sender);
            return;
        }

        const [subCommand, targetUser] = args;

        if (subCommand === 'ai' && targetUser) {
            const targetJid = `${targetUser.replace(/[\s+]/g, '')}@s.whatsapp.net`;
            // Admin adds a user, so this user cannot toggle the AI themselves.
            AddAiCommand.dbService.addUser(targetJid, false);
            await sock.sendMessage(sender!, { text: `Usuario ${targetJid} añadido a la lista de IA.` });
        } else {
            await sock.sendMessage(sender!, { text: `Formato incorrecto. Usa: !add ai <número>` });
        }
    }
}
