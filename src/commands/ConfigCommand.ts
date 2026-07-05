import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';

export class ConfigCommand implements Command {
    private dbService = DatabaseService.getInstance();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        // Ensure only the owner can query/set config
        const myJid = sock.user?.id ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : (process.env.OWNER_JID || sender);
        const isSelfChat = (sender === myJid);
        const targetDest = isSelfChat ? sender : myJid;

        if (args.length === 0) {
            // Display current configuration
            const { start, end } = await this.dbService.getSleepConfig();
            const responseText = `⚙️ *Configuración Actual del Bot*:\n\n` +
                                 `• *Modo Descanso*: ${start}:00 a ${end}:00\n\n` +
                                 `💡 _Para cambiar las horas de descanso, usa:_\n` +
                                 `\`!config set sleep <hora_inicio> <hora_fin>\` (ej: \`!config set sleep 21 5\`)`;
            await sock.sendMessage(targetDest, { text: responseText });
            return;
        }

        const action = args[0].toLowerCase();

        if (action === 'set' && args[1]?.toLowerCase() === 'sleep') {
            const startHourStr = args[2];
            const endHourStr = args[3];

            if (!startHourStr || !endHourStr) {
                await sock.sendMessage(targetDest, { 
                    text: `⚠️ Uso incorrecto. Ejemplo:\n\`!config set sleep 21 5\` (de 9 PM a 5 AM)` 
                });
                return;
            }

            const startHour = parseInt(startHourStr);
            const endHour = parseInt(endHourStr);

            if (isNaN(startHour) || isNaN(endHour) || startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
                await sock.sendMessage(targetDest, { 
                    text: `⚠️ Las horas deben ser números válidos entre 0 y 23.` 
                });
                return;
            }

            await this.dbService.setSleepConfig(startHour, endHour);

            await sock.sendMessage(targetDest, { 
                text: `✅ *Configuración Actualizada*:\n\nEl Modo Descanso ahora está programado de *${startHour}:00* a *${endHour}:00*.` 
            });
            return;
        }

        await sock.sendMessage(targetDest, { 
            text: `⚠️ Comando de configuración no reconocido.\nUsa \`!config\` para ver las opciones.` 
        });
    }
}
