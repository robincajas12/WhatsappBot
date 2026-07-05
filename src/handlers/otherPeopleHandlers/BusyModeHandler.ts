import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from '../AbstractMessageHandler.js';
import { BotStateService } from '../../services/BotStateService.js';
import * as fs from 'fs';
import * as path from 'path';

export class BusyModeHandler extends AbstractMessageHandler {
    private stateService = BotStateService.getInstance();

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const userId = message.key.remoteJid;

        // Busy mode logic only applies to other people, not the owner.
        // Also, do nothing if busy mode is off or if there's no user ID.
        if (message.key.fromMe || !this.stateService.isBusy() || !userId) {
            return await super.handle(message, sock);
        }

        // If busy mode is on, and user has not been notified yet during this period
        if (!this.stateService.hasBeenNotified(userId)) {
            // Mark them as notified so they only get this message once per busy period
            this.stateService.addNotifiedUser(userId);

            // Construct and send the busy message dynamically from file
            let busyMessage = '¡Hola! Ando algo ocupado ahora, pero te leo e intento responderte en cuanto pueda.';
            try {
                const templatePath = path.join(process.cwd(), 'templates', 'busy_message.txt');
                if (fs.existsSync(templatePath)) {
                    busyMessage = fs.readFileSync(templatePath, 'utf8').trim();
                }
            } catch (err) {
                console.error("Error al leer plantilla de busy_message:", err);
            }
            
            await sock.sendMessage(userId, { text: busyMessage });

            // The message should now continue to the AI handlers so the user gets a response.
            await super.handle(message, sock);
            return;
        }

        // If user has already been notified, just let the message pass to the next handler (e.g., the AI)
        await super.handle(message, sock);
    }
}
