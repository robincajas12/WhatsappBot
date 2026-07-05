import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import dotenv from 'dotenv';
import { DatabaseService } from './database.js';

// New Command Pattern Handlers
import { CommandDispatcherHandler } from './handlers/CommandDispatcherHandler.js';
import { AIPermissionHandler } from './handlers/otherPeopleHandlers/AIPermissionHandler.js';
import { AIResponseHandler } from './handlers/otherPeopleHandlers/AIResponseHandler.js';
import { BusyModeHandler } from './handlers/otherPeopleHandlers/BusyModeHandler.js';
import { GroupMessageBlocker } from './handlers/GroupMessageBlocker.js';

// General Handlers
import { PingHandler } from './handlers/meHandlers/PingHandler.js';
import { HelpHandler } from './handlers/meHandlers/HelpHandler.js';

dotenv.config({ path: ".env" });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' })
    });

    // --- Handler Chain Setup ---

    // Build the public chain (for other users)
    const publicChain = new GroupMessageBlocker();
    const publicCommandDispatcher = new CommandDispatcherHandler();
    const busyModeHandler = new BusyModeHandler();
    const aiPermissionHandler = new AIPermissionHandler();
    const aiResponseHandler = new AIResponseHandler();
    const publicPingHandler = new PingHandler();
    const publicHelpHandler = new HelpHandler();

    publicChain.setNext(publicCommandDispatcher);
    publicCommandDispatcher.setNext(busyModeHandler);
    busyModeHandler.setNext(aiPermissionHandler);
    aiPermissionHandler.setNext(aiResponseHandler);
    aiResponseHandler.setNext(publicPingHandler);
    publicPingHandler.setNext(publicHelpHandler);

    // Build the admin chain (for you)
    const adminChain = new GroupMessageBlocker();
    const adminCommandDispatcher = new CommandDispatcherHandler();
    const adminPingHandler = new PingHandler();
    const adminHelpHandler = new HelpHandler();

    adminChain.setNext(adminCommandDispatcher);
    adminCommandDispatcher.setNext(adminPingHandler);
    adminPingHandler.setNext(adminHelpHandler);


    // --- Socket Event Listeners ---
    let reminderInterval: NodeJS.Timeout | null = null;

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            if (reminderInterval) {
                clearInterval(reminderInterval);
                reminderInterval = null;
            }
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Opened connection');
            
            // Start checking for pending reminders every 60 seconds
            if (!reminderInterval) {
                const dbService = DatabaseService.getInstance();
                reminderInterval = setInterval(async () => {
                    try {
                        const pending = await dbService.getPendingReminders();
                        for (const reminder of pending) {
                            let text = `⏰ *RECORDATORIO:* \n\n> ${reminder.text}`;
                            if (reminder.targetJid && reminder.targetJid !== reminder.userId) {
                                const contactDisplay = reminder.targetJid.split('@')[0];
                                text = `⏰ *RECORDATORIO (Contacto: wa.me/${contactDisplay}):* \n\n> ${reminder.text}`;
                                
                                // Send discrete message directly to the target contact
                                try {
                                    await sock.sendMessage(reminder.targetJid, { text: reminder.text });
                                } catch (contactErr) {
                                    console.error(`Error al enviar mensaje discreto al contacto ${reminder.targetJid}:`, contactErr);
                                }
                            }
                            await sock.sendMessage(reminder.userId, { text });
                            await dbService.deleteReminder(reminder._id as string);
                        }
                    } catch (err) {
                        console.error("Error al procesar recordatorios periódicos:", err);
                    }
                }, 60000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') {
            return;
        }

        // Route message to the appropriate chain based on sender
        if (msg.key.fromMe) {
            await adminChain.handle(msg, sock);
        } else {
            await publicChain.handle(msg, sock);
        }
    });
}

connectToWhatsApp();

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});