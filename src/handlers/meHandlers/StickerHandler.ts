import { Client, Message, MessageMedia } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

export class StickerHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!sticker' && message.hasMedia) {
            const media = await message.downloadMedia();
            if (media.mimetype.includes('image')) {
                await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
                return;
            }
        }
        await super.handle(message, client);
    }
}
