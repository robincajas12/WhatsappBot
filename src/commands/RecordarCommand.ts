import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';

export class RecordarCommand implements Command {
    private dbService = DatabaseService.getInstance();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        // Get owner JID
        const myJid = sock.user?.id ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : (process.env.OWNER_JID || sender);
        const isSelfChat = (sender === myJid);

        if (args.length < 2) {
            const errorDest = isSelfChat ? sender : myJid;
            await sock.sendMessage(errorDest, { 
                text: "⚠️ Uso incorrecto. Ejemplos:\n• `!recordar 10m sacar la basura`\n• `!recordar 3d llamar por teléfono`\n• `!recordar 15/07 entregar informe`" 
            });
            return;
        }

        const timeArg = args[0].toLowerCase();
        const reminderText = args.slice(1).join(' ');
        let remindAt = new Date();

        // 1. Check relative duration format (e.g. 10m, 2h, 3d, 1w)
        const durationRegex = /^(\d+)([mhdw])$/;
        const match = timeArg.match(durationRegex);

        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];

            switch (unit) {
                case 'm':
                    remindAt.setMinutes(remindAt.getMinutes() + value);
                    break;
                case 'h':
                    remindAt.setHours(remindAt.getHours() + value);
                    break;
                case 'd':
                    remindAt.setDate(remindAt.getDate() + value);
                    break;
                case 'w':
                    remindAt.setDate(remindAt.getDate() + value * 7);
                    break;
            }
        } else {
            // 2. Check absolute date format (e.g. DD/MM/YYYY or DD/MM)
            const dateRegex = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/;
            const dateMatch = timeArg.match(dateRegex);

            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]) - 1; // Month is 0-indexed
                const year = dateMatch[3] ? parseInt(dateMatch[3]) : remindAt.getFullYear();

                remindAt = new Date(year, month, day, 9, 0, 0); // Default to 9:00 AM on that day

                // If date has already passed this year (and year wasn't specified), move to next year
                if (!dateMatch[3] && remindAt.getTime() < Date.now()) {
                    remindAt.setFullYear(year + 1);
                }
            } else {
                const errorDest = isSelfChat ? sender : myJid;
                await sock.sendMessage(errorDest, { 
                    text: "⚠️ Formato de tiempo no reconocido. Usa formatos como `3d` (días), `1w` (semanas), o `dd/mm` (fecha)." 
                });
                return;
            }
        }

        const targetJid = isSelfChat ? undefined : sender;

        try {
            // Save reminder: owner will always receive it
            await this.dbService.addReminder(myJid, reminderText, remindAt, targetJid);
            
            // Format nice response
            const dateStr = remindAt.toLocaleString('es-ES', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            if (isSelfChat) {
                await sock.sendMessage(sender, { 
                    text: `✅ Recordatorio guardado. Te avisaré el *${dateStr}*:\n\n> ${reminderText}` 
                });
            } else {
                // Confirmation sent privately to the owner's chat
                const contactDisplay = targetJid!.split('@')[0];
                await sock.sendMessage(myJid, { 
                    text: `🔒 *Recordatorio Discreto Guardado*\n\n• *Contacto*: wa.me/${contactDisplay}\n• *Fecha*: ${dateStr}\n• *Recordar*: ${reminderText}` 
                });

                // Stealth feature: delete the owner's "!recordar" message from the other contact's chat room!
                try {
                    await sock.sendMessage(sender, { delete: message.key });
                } catch (delErr) {
                    console.error("No se pudo borrar el comando del chat del contacto:", delErr);
                }
            }
        } catch (error) {
            console.error("Error al guardar recordatorio:", error);
            const errorDest = isSelfChat ? sender : myJid;
            await sock.sendMessage(errorDest, { text: "❌ Error al guardar el recordatorio en la base de datos." });
        }
    }
}
