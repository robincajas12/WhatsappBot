import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { AbstractMessageHandler } from './AbstractMessageHandler.js';
import { Command } from '../commands/Command.js';
import { MenuCommand } from '../commands/MenuCommand.js';
import { AiOnCommand } from '../commands/AiOnCommand.js';
import { AiOffCommand } from '../commands/AiOffCommand.js';
import { AddAiCommand } from '../commands/AddAiCommand.js';
import { RemoveAiCommand } from '../commands/RemoveAiCommand.js';

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
    }

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const messageBody = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
        const sender = message.key.remoteJid;

        // Find a command key that the message starts with
        const commandKey = [...this.commandMap.keys()].find(key => messageBody.toLowerCase().startsWith(key));

        if (commandKey) {
            const command = this.commandMap.get(commandKey)!;

            // Admin command guard
            if (command instanceof AddAiCommand || command instanceof RemoveAiCommand) {
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

        // If no command was found, pass to the next handler in the chain.
        await super.handle(message, sock);
    }
}
