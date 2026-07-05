import { WAMessage, downloadContentFromMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { DatabaseService } from '../database.js';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

// Helper map for common mime types (identical to ArchivoCommand / SaveCommand)
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

export class ChatCommand implements Command {
    private dbService = DatabaseService.getInstance();
    private aiInstance: GoogleGenAI | null = null;
    private filesDir = path.join(process.cwd(), 'files');

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (apiKey) {
            this.aiInstance = new GoogleGenAI({ apiKey });
        }
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

        if (args.length === 0) {
            await sock.sendMessage(targetDest, { 
                text: "⚠️ Por favor especifica una pregunta o instrucción para la IA.\nEjemplo: `!chat ¿puedes enviarme el archivo reporte.pdf?` o `!chat ¿qué enlaces rápidos tengo guardados?`" 
            });
            return;
        }

        if (!this.aiInstance) {
            await sock.sendMessage(targetDest, { text: "❌ El servicio de IA no está configurado. Falta la variable GOOGLE_API_KEY en el entorno." });
            return;
        }

        const queryText = args.join(' ').trim();

        // System instructions to guide Gemini on tool usage
        const systemInstruction = `Eres un asistente inteligente integrado en un bot de WhatsApp para el administrador del sistema.
Tienes la capacidad de llamar a funciones para interactuar con los archivos del servidor, enlaces guardados y mensajes archivados en la base de datos.
Cuando el usuario te pida ver, enviar, guardar o eliminar cosas, utiliza las herramientas correspondientes.
Responde de forma amigable, directa y natural. Si envías un archivo usando la herramienta 'enviarArchivo', confirma al usuario en tu respuesta final que el archivo se ha enviado con éxito.`;

        // Define tools / function declarations
        const tools = [
            {
                functionDeclarations: [
                    {
                        name: 'listarArchivos',
                        description: 'Lista los archivos guardados localmente en el servidor.'
                    },
                    {
                        name: 'enviarArchivo',
                        description: 'Envía un archivo del servidor directamente al usuario por chat de WhatsApp.',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                nombreArchivo: {
                                    type: 'STRING',
                                    description: 'El nombre del archivo tal como está guardado en el servidor.'
                                }
                            },
                            required: ['nombreArchivo']
                        }
                    },
                    {
                        name: 'listarEnlaces',
                        description: 'Lista los accesos directos/enlaces rápidos guardados en el bot.'
                    },
                    {
                        name: 'guardarEnlace',
                        description: 'Guarda o actualiza un enlace rápido.',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                nombre: {
                                    type: 'STRING',
                                    description: 'El nombre corto para el enlace.'
                                },
                                url: {
                                    type: 'STRING',
                                    description: 'La dirección URL completa (debe empezar con http o https).'
                                }
                            },
                            required: ['nombre', 'url']
                        }
                    },
                    {
                        name: 'eliminarEnlace',
                        description: 'Elimina un enlace rápido por su nombre.',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                nombre: {
                                    type: 'STRING',
                                    description: 'El nombre del enlace a eliminar.'
                                }
                            },
                            required: ['nombre']
                        }
                    },
                    {
                        name: 'listarGuardados',
                        description: 'Lista todos los elementos (mensajes de texto y referencias de archivos) guardados.'
                    },
                    {
                        name: 'buscarGuardadosPorCategoria',
                        description: 'Filtra elementos guardados por una categoría o key específica.',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                categoria: {
                                    type: 'STRING',
                                    description: 'La categoría o key de búsqueda.'
                                }
                            },
                            required: ['categoria']
                        }
                    },
                    {
                        name: 'guardarTexto',
                        description: 'Guarda un texto rápido en la base de datos.',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                texto: {
                                    type: 'STRING',
                                    description: 'El texto o recordatorio a guardar.'
                                },
                                categoria: {
                                    type: 'STRING',
                                    description: 'Opcional. Una categoría para agruparlo.'
                                }
                            },
                            required: ['texto']
                        }
                    },
                    {
                        name: 'eliminarGuardadoPorId',
                        description: 'Elimina una entrada guardada en la base de datos usando su ID único de 7 caracteres.',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                id: {
                                    type: 'STRING',
                                    description: 'El ID de 7 caracteres del elemento guardado.'
                                }
                            },
                            required: ['id']
                        }
                    }
                ]
            }
        ];

        try {
            await sock.sendPresenceUpdate('composing', targetDest);

            const chatMessages = [
                { role: 'user', parts: [{ text: queryText }] }
            ];

            // First inference call to check if tools are requested
            let response = await this.aiInstance.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: chatMessages,
                config: {
                    systemInstruction,
                    tools
                }
            });

            // Keep looping while there are tool calls (Gemini might call multiple, or call and expect answers to follow up)
            let loopCount = 0;
            const maxLoops = 5;

            while (response.functionCalls && response.functionCalls.length > 0 && loopCount < maxLoops) {
                loopCount++;
                const toolResponseParts = [];

                for (const call of response.functionCalls) {
                    const name = call.name;
                    const callArgs = call.args as any;
                    let functionResult: any;

                    try {
                        if (name === 'listarArchivos') {
                            const files = fs.readdirSync(this.filesDir);
                            functionResult = { files };
                        } else if (name === 'enviarArchivo') {
                            const fileName = callArgs.nombreArchivo;
                            const filePath = path.join(this.filesDir, fileName);
                            // Safety path check
                            const relative = path.relative(this.filesDir, filePath);
                            const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

                            if (!isSafe || !fs.existsSync(filePath)) {
                                functionResult = { error: `Archivo '${fileName}' no encontrado.` };
                            } else {
                                const stats = fs.statSync(filePath);
                                if (stats.isDirectory()) {
                                    functionResult = { error: `'${fileName}' es una carpeta, no un archivo.` };
                                } else {
                                    const ext = path.extname(filePath).toLowerCase();
                                    const mime = MIME_TYPES[ext] || 'application/octet-stream';
                                    
                                    await sock.sendMessage(targetDest, {
                                        document: { url: filePath },
                                        fileName: fileName,
                                        mimetype: mime
                                    });
                                    functionResult = { success: true, message: `Archivo '${fileName}' enviado con éxito por WhatsApp.` };
                                }
                            }
                        } else if (name === 'listarEnlaces') {
                            const links = await this.dbService.getAllLinks();
                            functionResult = { links };
                        } else if (name === 'guardarEnlace') {
                            await this.dbService.addLink(callArgs.nombre, callArgs.url);
                            functionResult = { success: true, message: `Enlace '${callArgs.nombre}' guardado.` };
                        } else if (name === 'eliminarEnlace') {
                            const deleted = await this.dbService.deleteLink(callArgs.nombre);
                            functionResult = { success: deleted, message: deleted ? `Enlace '${callArgs.nombre}' eliminado.` : `Enlace '${callArgs.nombre}' no encontrado.` };
                        } else if (name === 'listarGuardados') {
                            const saved = await this.dbService.getAllSavedMessages();
                            functionResult = { saved };
                        } else if (name === 'buscarGuardadosPorCategoria') {
                            const saved = await this.dbService.getSavedMessagesByKey(callArgs.categoria);
                            functionResult = { saved };
                        } else if (name === 'guardarTexto') {
                            const saved = await this.dbService.addSavedMessage(callArgs.texto, myJid, callArgs.categoria);
                            functionResult = { success: true, id: saved._id, message: `Texto guardado con éxito. ID: ${saved._id}` };
                        } else if (name === 'eliminarGuardadoPorId') {
                            const savedMsg = await this.dbService.getSavedMessageById(callArgs.id);
                            let success = false;
                            if (savedMsg) {
                                if (savedMsg.isFile && savedMsg.localPath && fs.existsSync(savedMsg.localPath)) {
                                    try {
                                        fs.unlinkSync(savedMsg.localPath);
                                    } catch (e) {}
                                }
                                success = await this.dbService.deleteSavedMessageById(callArgs.id);
                            }
                            functionResult = { success, message: success ? `Elemento con ID ${callArgs.id} eliminado.` : `Elemento con ID ${callArgs.id} no encontrado.` };
                        } else {
                            functionResult = { error: `Función no soportada: ${name}` };
                        }
                    } catch (funcErr: any) {
                        console.error(`Error ejecutando tool ${name}:`, funcErr);
                        functionResult = { error: funcErr.message || 'Error desconocido al ejecutar la función.' };
                    }

                    toolResponseParts.push({
                        functionResponse: {
                            name,
                            response: { result: functionResult }
                        }
                    });
                }

                // Add call and tool response to the conversation history
                chatMessages.push(response.candidates[0].content as any);
                chatMessages.push({
                    role: 'user',
                    parts: toolResponseParts as any
                });

                // Request the model again with the function outcomes
                response = await this.aiInstance.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: chatMessages,
                    config: {
                        systemInstruction,
                        tools
                    }
                });
            }

            const responseText = response.text?.trim();
            if (responseText) {
                await sock.sendMessage(targetDest, { text: responseText });
            } else {
                await sock.sendMessage(targetDest, { text: "🤖 Procesado correctamente (sin respuesta adicional de texto)." });
            }

        } catch (err: any) {
            console.error("Error en ChatCommand:", err);
            await sock.sendMessage(targetDest, { text: `❌ Error en el procesamiento de la IA: ${err.message || err}` });
        } finally {
            await sock.sendPresenceUpdate('paused', targetDest);
        }
    }
}
