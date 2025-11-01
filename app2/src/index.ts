import makeWASocket, { DisconnectReason, useMultiFileAuthState, WAMessage } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { PingHandler } from './handlers/meHandlers/PingHandler.js';
import { HelpHandler } from './handlers/meHandlers/HelpHandler.js';
import { ProxyHandler } from './handlers/ProxyHandler.js';
import FromMeHandler from './handlers/meHandlers/FromMeHandler.js';
import MentionedMeHandler from './handlers/otherPeopleHandlers/MentionedMeHandler.js';
import { AIResponseHandler } from './handlers/otherPeopleHandlers/AIResponseHandler.js';
import dotenv from 'dotenv';
dotenv.config({ path: "../.env" });

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    // Me handlers
    const fromMeHandler = new FromMeHandler();
    const messageChain = new PingHandler();
    messageChain.setNext(new HelpHandler());
    fromMeHandler.setNext(messageChain);

    // Group handlers
    const mentionedMeHandler = new MentionedMeHandler();
    mentionedMeHandler.setNext(new HelpHandler());

    // Other people handlers
    const otherPeopleChain = new AIResponseHandler();
    const otherPeoplePingHandler = new PingHandler();
    otherPeoplePingHandler.setNext(new HelpHandler());
    otherPeopleChain.setNext(otherPeoplePingHandler);

    const proxy = new ProxyHandler(
        fromMeHandler,
        otherPeopleChain,
        mentionedMeHandler
    );

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
        if (!msg.message) return;

        // Ignore status updates
        if (msg.key.remoteJid === 'status@broadcast') return;

        proxy.handle(msg, sock);
    });
}

connectToWhatsApp();

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
