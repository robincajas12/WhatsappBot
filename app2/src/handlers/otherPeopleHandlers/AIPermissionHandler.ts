import { WAMessage } from "@whiskeysockets/baileys";
import makeWASocket from "@whiskeysockets/baileys";
import { AbstractMessageHandler } from "../AbstractMessageHandler.js";
import { DatabaseService } from "../../database.js";

export class AIPermissionHandler extends AbstractMessageHandler {
    private static dbService = new DatabaseService();

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const userId = message.key.remoteJid;

        if (userId && AIPermissionHandler.dbService.isAiEnabled(userId)) {
            // User has AI enabled, pass to the next handler (AIResponseHandler)
            await super.handle(message, sock);
        } else {
            // User does not have AI enabled, stop processing here.
            // We don't call super.handle() so the chain for this branch stops.
        }
    }
}
