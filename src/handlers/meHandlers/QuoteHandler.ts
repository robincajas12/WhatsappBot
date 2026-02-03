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
        const quoteData = response.data[0];

        const reply = `"${quoteData.q}"\n\n- ${quoteData.a}`;
        await message.reply(reply);
      } catch (error) {
        console.error('Error fetching quote:', error);
        await message.reply("Lo siento, no pude obtener una frase en este momento.");
      }
      return;
    }

    await super.handle(message, client);
  }
}
