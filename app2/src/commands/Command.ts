import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';

/**
 * Represents a command that can be executed.
 */
export interface Command {
    /**
     * Executes the command logic.
     * @param message The incoming WhatsApp message.
     * @param sock The socket instance.
     * @param args The arguments passed to the command, split by spaces.
     */
    execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void>;
}
