import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';

export class AiOnCommand implements Command {
    private static dbService = new DatabaseService();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const userId = message.key.remoteJid;
        if (!userId) return;

        const userExists = await AiOnCommand.dbService.userExists(userId);

        if (!userExists) {
            // Self-enrollment, user can toggle AI
            await AiOnCommand.dbService.addUser(userId, true);
            await sock.sendMessage(userId, { text: '🤖 ¡IA activada! Ahora responderé a tus mensajes. Escribe `!ai off` para desactivarme.' });
        } else {
            const canToggle = await AiOnCommand.dbService.canUserToggleAi(userId);
            if (canToggle) {
                await AiOnCommand.dbService.setUserAiStatus(userId, true);
                await sock.sendMessage(userId, { text: '🤖 IA reactivada.' });
            } else {
                await sock.sendMessage(userId, { text: 'El acceso a la IA para este chat es gestionado por el administrador.' });
            }
        }
    }
}
