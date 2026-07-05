import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';

export class SaveCommand implements Command {
    private dbService = DatabaseService.getInstance();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        // Get owner info
        const myJid = sock.user?.id ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : (process.env.OWNER_JID || sender);
        const isSelfChat = (sender === myJid);
        const targetDest = isSelfChat ? sender : myJid;

        // Extract the quoted message details
        const contextInfo = message.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;
        const quotedParticipant = contextInfo?.participant; // Original sender of the quoted message

        if (!quotedMessage) {
            await sock.sendMessage(targetDest, { 
                text: "⚠️ Debes responder (citar/reply) a un mensaje de texto con `!save` o `!save as <key>` para guardarlo." 
            });
            return;
        }

        // Extract text from the quoted message
        const textToSave = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || "";

        if (!textToSave) {
            await sock.sendMessage(targetDest, { 
                text: "⚠️ Solo se pueden guardar mensajes de texto." 
            });
            return;
        }

        // Determine sender JID of the saved message
        const originalSender = quotedParticipant || sender;

        // Parse key if using "!save as <key>"
        let key: string | undefined;
        if (args[0]?.toLowerCase() === 'as' && args[1]) {
            key = args.slice(1).join(' ').trim();
        }

        try {
            await this.dbService.addSavedMessage(textToSave, originalSender, key);
            
            const contactDisplay = originalSender.split('@')[0];
            let confirmationText = `📥 *Mensaje Guardado*:\n\n> ${textToSave}\n\n• *De*: wa.me/${contactDisplay}`;
            if (key) {
                confirmationText += `\n• *Categoría/Key*: \`${key}\``;
            }

            await sock.sendMessage(targetDest, { text: confirmationText });
        } catch (err) {
            console.error("Error al guardar mensaje:", err);
            await sock.sendMessage(targetDest, { text: "❌ Error al guardar el mensaje en la base de datos." });
        }
    }
}
