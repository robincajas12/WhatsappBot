import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from '../AbstractMessageHandler.js';
import * as fs from 'fs';
import * as path from 'path';

import { DatabaseService } from '../../database.js';

export class SleepModeHandler extends AbstractMessageHandler {
    // Map to track when a contact was last notified (JID -> timestamp)
    private notifiedUsers = new Map<string, number>();
    private dbService = DatabaseService.getInstance();

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const userId = message.key.remoteJid;

        if (message.key.fromMe || !userId) {
            return await super.handle(message, sock);
        }

        // Get sleeping hours dynamically from the database config
        const { start: sleepStart, end: sleepEnd } = await this.dbService.getSleepConfig();

        const now = new Date();
        const currentHour = now.getHours();

        let isSleepTime = false;
        if (sleepStart > sleepEnd) {
            // Overnight sleep (e.g. 23:00 to 06:00)
            isSleepTime = (currentHour >= sleepStart || currentHour < sleepEnd);
        } else {
            // Same-day sleep (e.g. 01:00 to 05:00)
            isSleepTime = (currentHour >= sleepStart && currentHour < sleepEnd);
        }

        if (isSleepTime) {
            const nowMs = Date.now();
            const lastNotified = this.notifiedUsers.get(userId);

            // Notify only once every 8 hours to avoid spamming
            if (!lastNotified || (nowMs - lastNotified) > 8 * 60 * 60 * 1000) {
                this.notifiedUsers.set(userId, nowMs);

                let sleepMessage = '¡Hola! 😴 En este momento estoy descansando/durmiendo. Te leeré e intentaré responderte en cuanto despierte. ¡Que tengas un buen descanso!';
                try {
                    const templatePath = path.join(process.cwd(), 'templates', 'sleep_message.txt');
                    if (fs.existsSync(templatePath)) {
                        sleepMessage = fs.readFileSync(templatePath, 'utf8').trim();
                    }
                } catch (err) {
                    console.error("Error al leer plantilla de sleep_message:", err);
                }

                await sock.sendMessage(userId, { text: sleepMessage });
            }

            // Stop the chain here: do not pass the message to AI or other handlers while sleeping
            return;
        }

        // If it's not sleeping hours, continue down the chain
        await super.handle(message, sock);
    }
}
