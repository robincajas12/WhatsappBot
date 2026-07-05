import { WAMessage, downloadContentFromMessage, MediaType } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';
import * as fs from 'fs';
import * as path from 'path';

const extensionFromMime = (mime: string): string => {
    if (mime.includes('image/png')) return '.png';
    if (mime.includes('image/jpeg')) return '.jpg';
    if (mime.includes('image/gif')) return '.gif';
    if (mime.includes('audio/mpeg')) return '.mp3';
    if (mime.includes('audio/ogg') || mime.includes('audio/opus')) return '.ogg';
    if (mime.includes('video/mp4')) return '.mp4';
    if (mime.includes('application/pdf')) return '.pdf';
    if (mime.includes('text/plain')) return '.txt';
    if (mime.includes('text/csv')) return '.csv';
    if (mime.includes('application/zip')) return '.zip';
    return '.bin';
};

export class SaveCommand implements Command {
    private dbService = DatabaseService.getInstance();

    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        // Get owner info
        const myJid = sock.user?.id ? (sock.user.id.split(':')[0] + '@s.whatsapp.net') : (process.env.OWNER_JID || sender);
        const isSelfChat = (sender === myJid);
        const targetDest = isSelfChat ? sender : myJid;

        // Extract the quoted message details
        const contextInfo = message.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;
        const quotedParticipant = contextInfo?.participant; // Original sender of the quoted message

        if (!quotedMessage) {
            await sock.sendMessage(targetDest, { 
                text: "⚠️ Debes responder (citar/reply) a un mensaje o archivo con `!save` o `!save file` para guardarlo." 
            });
            return;
        }

        // Determine sender JID of the saved message/file
        const originalSender = quotedParticipant || sender;

        // Parse command args
        let key: string | undefined;
        let isFileExplicit = false;

        if (args[0]?.toLowerCase() === 'file') {
            isFileExplicit = true;
            if (args[1]?.toLowerCase() === 'as' && args[2]) {
                key = args.slice(2).join(' ').trim();
            }
        } else if (args[0]?.toLowerCase() === 'as' && args[1]) {
            key = args.slice(1).join(' ').trim();
        }

        // Check if quoted message is a media message
        const mediaType = Object.keys(quotedMessage).find(key => 
            ['imageMessage', 'documentMessage', 'audioMessage', 'videoMessage', 'stickerMessage'].includes(key)
        );

        if (isFileExplicit) {
            if (!mediaType) {
                await sock.sendMessage(targetDest, { text: "⚠️ Especificaste `!save file` pero el mensaje citado no contiene ningún archivo." });
                return;
            }

            // Quoted message is a file/media - Save it
            const mediaMessage = (quotedMessage as any)[mediaType];
            const mimeType = mediaMessage.mimetype || '';
            let fileName = mediaMessage.fileName || '';

            if (!fileName) {
                const ext = extensionFromMime(mimeType);
                fileName = `media_${Date.now()}${ext}`;
            }

            try {
                // Ensure files directory exists
                const filesDir = path.join(process.cwd(), 'files');
                if (!fs.existsSync(filesDir)) {
                    fs.mkdirSync(filesDir, { recursive: true });
                }

                const localPath = path.join(filesDir, fileName);

                // Download using downloadContentFromMessage
                const type = mediaType.replace('Message', '') as MediaType;
                
                await sock.sendMessage(targetDest, { text: `⏳ Descargando y guardando archivo *${fileName}...*` });

                const stream = await downloadContentFromMessage(mediaMessage, type);
                
                // Accumulate stream chunks to a Buffer
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                fs.writeFileSync(localPath, buffer);

                // Add reference to DB
                const saved = await this.dbService.addSavedMessage(
                    `[Archivo] ${fileName}`,
                    originalSender,
                    key,
                    true,
                    fileName,
                    mimeType,
                    localPath
                );

                const contactDisplay = originalSender.split('@')[0];
                let confirmationText = `📥 *Archivo Guardado* (ID: \`${saved._id}\`):\n\n• *Nombre*: \`${fileName}\`\n• *De*: wa.me/${contactDisplay}`;
                if (key) {
                    confirmationText += `\n• *Categoría/Key*: \`${key}\``;
                }
                confirmationText += `\n\n💡 _Puedes descargarlo escribiendo \`!saved ${saved._id}\` o listarlo en \`!archivo\`._`;

                await sock.sendMessage(targetDest, { text: confirmationText });

            } catch (err) {
                console.error("Error al descargar/guardar archivo:", err);
                await sock.sendMessage(targetDest, { text: "❌ Error al descargar o guardar el archivo localmente." });
            }
            return;
        }

        // isFileExplicit is false (meaning they ran !save)
        if (mediaType) {
            await sock.sendMessage(targetDest, { 
                text: "⚠️ El mensaje citado contiene un archivo. Para guardarlo usa `!save file` o `!save file as <key>`." 
            });
            return;
        }

        // Extract text from the quoted message
        const textToSave = quotedMessage.conversation || quotedMessage.extendedTextMessage?.text || "";

        if (!textToSave) {
            await sock.sendMessage(targetDest, { 
                text: "⚠️ Solo se pueden guardar mensajes de texto o archivos de medios." 
            });
            return;
        }

        try {
            const saved = await this.dbService.addSavedMessage(textToSave, originalSender, key);
            
            const contactDisplay = originalSender.split('@')[0];
            let confirmationText = `📥 *Mensaje Guardado* (ID: \`${saved._id}\`):\n\n> ${textToSave}\n\n• *De*: wa.me/${contactDisplay}`;
            if (key) {
                confirmationText += `\n• *Categoría/Key*: \`${key}\``;
            }
            confirmationText += `\n\n💡 _Puedes verlo escribiendo \`!saved ${saved._id}\`._`;

            await sock.sendMessage(targetDest, { text: confirmationText });
        } catch (err) {
            console.error("Error al guardar mensaje:", err);
            await sock.sendMessage(targetDest, { text: "❌ Error al guardar el mensaje en la base de datos." });
        }
    }
}
