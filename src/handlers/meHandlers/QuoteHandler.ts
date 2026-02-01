import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class QuoteHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!quote') {
            try {
                const response = await axios.get('https://zenquotes.io/api/random');
                const quote = response.data[0];
                if (quote && quote.q && quote.a) {
                    await message.reply(`"${quote.q}"\n\n- ${quote.a}`);
                } else {
                    await message.reply("I couldn't fetch a quote right now.");
                }
            } catch (error) {
                console.error("Error fetching quote:", error);
                await message.reply("An error occurred while fetching the quote.");
            }
        } else {
            await super.handle(message, client);
        }
    }
}
