import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import dotenv from 'dotenv';

// New Command Pattern Handlers
import { CommandDispatcherHandler } from './handlers/CommandDispatcherHandler.js';
import { AIPermissionHandler } from './handlers/otherPeopleHandlers/AIPermissionHandler.js';
import { AIResponseHandler } from './handlers/otherPeopleHandlers/AIResponseHandler.js';

// General Handlers
import { PingHandler } from './handlers/meHandlers/PingHandler.js';
import { HelpHandler } from './handlers/meHandlers/HelpHandler.js';

dotenv.config({ path: ".env" });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    // --- Handler Chain Setup ---

    // Create handlers
    const commandDispatcher = new CommandDispatcherHandler();
    const aiPermissionHandler = new AIPermissionHandler();
    const aiResponseHandler = new AIResponseHandler();
    const pingHandler = new PingHandler();
    const helpHandler = new HelpHandler();

    // Build the public chain (for other users)
    const publicChain = commandDispatcher;
    commandDispatcher.setNext(aiPermissionHandler);
    aiPermissionHandler.setNext(aiResponseHandler);
    aiResponseHandler.setNext(pingHandler);
    pingHandler.setNext(helpHandler);

    // Build the admin chain (for you). It only processes commands and general handlers.
    const adminChain = new CommandDispatcherHandler();
    adminChain.setNext(pingHandler);
    pingHandler.setNext(helpHandler);


    // --- Socket Event Listeners ---

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Opened connection');
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