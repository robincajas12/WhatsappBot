import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';

export class AiOffCommand implements Command {
    private static dbService = new DatabaseService();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const userId = message.key.remoteJid;
        if (!userId) return;

        const userExists = AiOffCommand.dbService.userExists(userId);

        if (userExists) {
            const canToggle = AiOffCommand.dbService.canUserToggleAi(userId);
            if (canToggle) {
                AiOffCommand.dbService.setUserAiStatus(userId, false);
                await sock.sendMessage(userId, { text: '🤖 IA desactivada. No responderé a tus mensajes. Escribe `!ai on` para reactivarme.' });
            } else {
                await sock.sendMessage(userId, { text: 'El acceso a la IA para este chat es gestionado por el administrador.' });
            }
        }
        // If user does not exist, do nothing, as AI is already off for them.
    }
}
