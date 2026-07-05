import makeWASocket from '@whiskeysockets/baileys';

export const BOT_MSG_PREFIX = process.env.BOT_MSG_PREFIX || '§';

export async function sendBotMessage(sock: ReturnType<typeof makeWASocket>, jid: string, text: string) {
    const prefixed = `${BOT_MSG_PREFIX}${text}`;
    await sock.sendMessage(jid, { text: prefixed });
}
