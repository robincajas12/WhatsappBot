import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from './AbstractMessageHandler.js';
import { Command } from '../commands/Command.js';
import { MenuCommand } from '../commands/MenuCommand.js';
import { AiOnCommand } from '../commands/AiOnCommand.js';
import { AiOffCommand } from '../commands/AiOffCommand.js';
import { AddAiCommand } from '../commands/AddAiCommand.js';
import { RemoveAiCommand } from '../commands/RemoveAiCommand.js';
import { BusyOnCommand } from '../commands/BusyOnCommand.js';
import { BusyOffCommand } from '../commands/BusyOffCommand.js';
import { ListScriptsCommand } from '../commands/ListScriptsCommand.js';
import { RunScriptCommand } from '../commands/RunScriptCommand.js';
import { RecordarCommand } from '../commands/RecordarCommand.js';
import { ConfigCommand } from '../commands/ConfigCommand.js';
import { SaveCommand } from '../commands/SaveCommand.js';
import { SavedCommand } from '../commands/SavedCommand.js';
import { EnlaceCommand } from '../commands/EnlaceCommand.js';
import { ArchivoCommand } from '../commands/ArchivoCommand.js';
import { ChatCommand } from '../commands/ChatCommand.js';
import { WorkCommand } from '../commands/WorkCommand.js';
import { DatabaseService } from '../database.js';
import { jules as julesClient } from '@google/jules-sdk';
import { AskCommand } from '../commands/AskCommand.js';
import { JarvisSessionStartCommand } from '../commands/JarvisSessionStartCommand.js';
import { JarvisSessionEndCommand } from '../commands/JarvisSessionEndCommand.js';
import { sendBotMessage, BOT_MSG_PREFIX } from '../utils/botMessage.js';

const OWNER_JID = process.env.OWNER_JID;

export class CommandDispatcherHandler extends AbstractMessageHandler {
    private commandMap: Map<string, Command>;

    constructor() {
        super();
        this.commandMap = new Map();
        this.registerCommands();
    }

    private registerCommands(): void {
        this.commandMap.set('!menu', new MenuCommand());
        this.commandMap.set('!ai on', new AiOnCommand());
        this.commandMap.set('!ai off', new AiOffCommand());
        this.commandMap.set('!add', new AddAiCommand());
        this.commandMap.set('!remove', new RemoveAiCommand());
        this.commandMap.set('!busy on', new BusyOnCommand());
        this.commandMap.set('!busy off', new BusyOffCommand());
        this.commandMap.set('!scripts', new ListScriptsCommand());
        this.commandMap.set('!run', new RunScriptCommand());
        this.commandMap.set('!recordar', new RecordarCommand());
        this.commandMap.set('!config', new ConfigCommand());
        this.commandMap.set('!save', new SaveCommand());
        this.commandMap.set('!saved', new SavedCommand());
        this.commandMap.set('!enlace', new EnlaceCommand());
        this.commandMap.set('!archivo', new ArchivoCommand());
        this.commandMap.set('!chat', new ChatCommand());
        this.commandMap.set('!jarvis', new WorkCommand());
        this.commandMap.set('!jarvis-session-start', new JarvisSessionStartCommand());
        this.commandMap.set('!jarvis-session-end', new JarvisSessionEndCommand());
        this.commandMap.set('!ask', new AskCommand());
    }

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const messageBody = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
        const sender = message.key.remoteJid;

        // Find a command key that the message starts with (longest prefix match first)
        const commandKey = [...this.commandMap.keys()]
            .sort((a, b) => b.length - a.length)
            .find(key => messageBody.toLowerCase().startsWith(key));

        if (commandKey) {
            const command = this.commandMap.get(commandKey)!;

            // Admin command guard
            if (command instanceof AddAiCommand || 
                command instanceof RemoveAiCommand ||
                command instanceof BusyOnCommand ||
                command instanceof BusyOffCommand ||
                command instanceof ListScriptsCommand ||
                command instanceof RunScriptCommand ||
                command instanceof RecordarCommand ||
                command instanceof ConfigCommand ||
                command instanceof SaveCommand ||
                command instanceof SavedCommand ||
                command instanceof EnlaceCommand ||
                command instanceof ArchivoCommand ||
                command instanceof ChatCommand ||
                command instanceof WorkCommand ||
                command instanceof JarvisSessionStartCommand ||
                command instanceof JarvisSessionEndCommand
            ) {
                if (!OWNER_JID || (message.key.fromMe === false && sender !== OWNER_JID) ) {
                    console.log(`Non-owner ${sender} tried to use admin command: ${commandKey}`);
                    return; // Silently fail for security
                }
            }

            // Extract arguments from the rest of the message
            const args = messageBody.substring(commandKey.length).trim().split(' ').filter(arg => arg);

            await command.execute(message, sock, args);
            return; // Command found and executed, stop the chain.
        }

        // If no command was found, check for bot-prefixed messages and forward to active Jules session when appropriate.
        try {
            const body = messageBody || '';
            // Avoid processing messages that the bot itself sent (they are prefixed)
            if (body.startsWith(BOT_MSG_PREFIX)) {
                await super.handle(message, sock);
                return;
            }

            const senderJid = sender;
            if (senderJid) {
                const db = DatabaseService.getInstance();
                const activeSessionId = await db.getActiveSession(senderJid);
                if (activeSessionId && body) {
                    const apiKey = process.env.JULES_API_KEY;
                    const client = apiKey ? julesClient.with({ apiKey }) : julesClient;
                    try {
                        const session = (client as any).session?.(activeSessionId) || (client as any).session(activeSessionId);
                        if (session) {
                            await sendBotMessage(sock, senderJid, '⏳ Enviando mensaje a la sesión activa...');
                            const reply = await session.ask(body);
                            const msg = reply?.message || reply?.text || JSON.stringify(reply);
                            await sendBotMessage(sock, senderJid, `💬 Respuesta de la sesión ${activeSessionId}:\n\n${msg}`);
                            return;
                        } else {
                            await sendBotMessage(sock, senderJid, '❌ Sesión activa no encontrada en Jules.');
                        }
                    } catch (e) {
                        console.error('Error forwarding to Jules session:', e);
                        await sendBotMessage(sock, senderJid, '❌ Error al comunicarse con la sesión Jules.');
                    }
                }
            }
        } catch (e) {
            console.error('Error checking active session:', e);
        }

        // If nothing to forward, pass to the next handler in the chain.
        await super.handle(message, sock);
    }
}
