import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from '../AbstractMessageHandler.js';
import * as fs from 'fs';
import * as path from 'path';

export class HelpHandler extends AbstractMessageHandler {
    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const messageBody = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const sender = message.key.remoteJid;

        if (messageBody.toLowerCase() === '!help') {
            const isOwner = message.key.fromMe || (sender && sender === process.env.OWNER_JID);

            // Default general help
            let helpMessage = `*Comandos Disponibles:*\n• \`!ping\`: Responde con "pong".\n• \`!help\`: Muestra este mensaje.`;
            try {
                const generalPath = path.join(process.cwd(), 'templates', 'help_general.txt');
                if (fs.existsSync(generalPath)) {
                    helpMessage = fs.readFileSync(generalPath, 'utf8').trim();
                }
            } catch (err) {
                console.error("Error al leer help_general:", err);
            }

            if (isOwner) {
                let adminHelp = `\n\n*🔒 Comandos de Administrador (Solo Tú):*\n• \`!scripts\`: Lista los scripts en la carpeta \`scripts/\`.\n• \`!run <script> [args]\`: Ejecuta un script.\n• \`!busy on\` / \`!busy off\`: Activa/desactiva el modo ocupado.\n• \`!add <número>\` / \`!remove <número>\`: Permite/bloquea la IA para un usuario.`;
                try {
                    const adminPath = path.join(process.cwd(), 'templates', 'help_admin.txt');
                    if (fs.existsSync(adminPath)) {
                        adminHelp = '\n\n' + fs.readFileSync(adminPath, 'utf8').trim();
                    }
                } catch (err) {
                    console.error("Error al leer help_admin:", err);
                }
                helpMessage += adminHelp;
            }

            await sock.sendMessage(message.key.remoteJid!, { text: helpMessage });
        } else {
            await super.handle(message, sock);
        }
    }
}
