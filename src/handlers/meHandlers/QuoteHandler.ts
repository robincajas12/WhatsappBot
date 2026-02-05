import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class QuoteHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!frase') {
            try {
                const response = await axios.get('https://zenquotes.io/api/random');
                const quote = response.data[0];
                await message.reply(`"${quote.q}" - ${quote.a}`);
            } catch (error) {
                console.error("Error fetching quote:", error);
                await message.reply("No pude obtener una frase en este momento.");
            }
        } else {
            await super.handle(message, client);
        }
    }
}
