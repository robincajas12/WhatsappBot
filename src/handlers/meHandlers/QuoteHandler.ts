import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

interface Quote {
    q: string;
    a: string;
    h: string;
}

export class QuoteHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!quote') {
            try {
                const response = await axios.get<Quote[]>('https://zenquotes.io/api/random');

                if (response.data && response.data.length > 0) {
                    const quote = response.data[0];
                    await message.reply(`"${quote.q}"\n\n- ${quote.a}`);
                } else {
                    await message.reply("No pude obtener una frase en este momento.");
                }
            } catch (error) {
                console.error("Error fetching quote:", error);
                await message.reply("Ocurrió un error al obtener la frase. Inténtalo de nuevo más tarde.");
            }
        } else {
            await super.handle(message, client);
        }
    }
}
