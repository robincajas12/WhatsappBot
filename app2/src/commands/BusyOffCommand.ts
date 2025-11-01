import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { BotStateService } from '../services/BotStateService.js';

export class BusyOffCommand implements Command {
    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const stateService = BotStateService.getInstance();
        stateService.setBusy(false);

        const sender = message.key.remoteJid;
        await sock.sendMessage(sender!, { text: '🤖 Modo Ocupado desactivado.' });
    }
}
