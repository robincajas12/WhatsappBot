import { WAMessage } from "@whiskeysockets/baileys";
import makeWASocket from "@whiskeysockets/baileys";
import { AbstractMessageHandler } from "../AbstractMessageHandler.js";
import { DatabaseService } from "../../database.js";
import { BotStateService } from "../../services/BotStateService.js";

export class AIPermissionHandler extends AbstractMessageHandler {
    private static dbService = new DatabaseService();
    private static stateService = BotStateService.getInstance();

    public async handle(message: WAMessage, sock: ReturnType<typeof makeWASocket>): Promise<void> {
        const userId = message.key.remoteJid;

        // Global check: AI only works if busy mode is ON.
        if (!AIPermissionHandler.stateService.isBusy()) {
            return; // Stop the chain if not in busy mode.
        }

        // Individual user check: User must be in the DB and have AI enabled.
        if (userId && await AIPermissionHandler.dbService.isAiEnabled(userId)) {
            // If both global and user-level permissions are met, pass to the next handler (AIResponseHandler)
            await super.handle(message, sock);
        } else {
            // User does not have AI enabled, stop processing here.
        }
    }
}
