import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import * as fs from 'fs';
import * as path from 'path';

// Helper map for common mime types
const MIME_TYPES: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.txt': 'text/plain',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.csv': 'text/csv',
    '.json': 'application/json',
};

export class ArchivoCommand implements Command {
    private filesDir = path.join(process.cwd(), 'files');

    constructor() {
        // Ensure files directory exists
        if (!fs.existsSync(this.filesDir)) {
            fs.mkdirSync(this.filesDir, { recursive: true });
        }
    }

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        const myJid = sock.user?.id ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : (process.env.OWNER_JID || sender);
        const isSelfChat = (sender === myJid);
        const targetDest = isSelfChat ? sender : myJid;

        // Ensure files directory exists (in case it was deleted)
        if (!fs.existsSync(this.filesDir)) {
            fs.mkdirSync(this.filesDir, { recursive: true });
        }

        // Case 1: List all files in the directory
        if (args.length === 0) {
            try {
                const files = fs.readdirSync(this.filesDir);
                if (files.length === 0) {
                    await sock.sendMessage(targetDest, {
                        text: "📁 *La carpeta de archivos está vacía.*\n\nColoca archivos en la carpeta `files/` en la raíz del bot para poder solicitarlos."
                    });
                    return;
                }

                let listText = "📁 *Archivos Disponibles en el Servidor*:\n\n";
                files.forEach((file, index) => {
                    const stats = fs.statSync(path.join(this.filesDir, file));
                    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                    listText += `${index + 1}. 📄 *${file}* (${sizeMB} MB)\n`;
                });
                listText += "\nPara recibir un archivo, escribe:\n`!archivo <nombre_archivo>`";

                await sock.sendMessage(targetDest, { text: listText });
            } catch (err) {
                console.error("Error al listar archivos:", err);
                await sock.sendMessage(targetDest, { text: "❌ Error al obtener la lista de archivos." });
            }
            return;
        }

        // Case 2: Send a specific file
        const fileNameInput = args.join(' ').trim();
        const filePath = path.join(this.filesDir, fileNameInput);

        // Security check: prevent path traversal (e.g. !archivo ../../../secrets.json)
        const relative = path.relative(this.filesDir, filePath);
        const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

        if (!isSafe) {
            await sock.sendMessage(targetDest, { text: "⚠️ Acceso denegado: Intento de salida de la carpeta de archivos." });
            return;
        }

        if (!fs.existsSync(filePath)) {
            await sock.sendMessage(targetDest, { 
                text: `⚠️ No se encontró el archivo *${fileNameInput}*.\n\nEscribe \`!archivo\` para ver los archivos disponibles.` 
            });
            return;
        }

        try {
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                await sock.sendMessage(targetDest, { text: `⚠️ *${fileNameInput}* es una carpeta, no un archivo.` });
                return;
            }

            // Notify user that the download/sending has started
            await sock.sendMessage(targetDest, { text: `⏳ Enviando *${fileNameInput}*...` });

            const ext = path.extname(filePath).toLowerCase();
            const mimetype = MIME_TYPES[ext] || 'application/octet-stream';

            // Send document
            await sock.sendMessage(targetDest, {
                document: { url: filePath },
                fileName: fileNameInput,
                mimetype: mimetype
            });

        } catch (err) {
            console.error("Error al enviar el archivo:", err);
            await sock.sendMessage(targetDest, { text: `❌ Error al intentar enviar el archivo *${fileNameInput}*.` });
        }
    }
}
