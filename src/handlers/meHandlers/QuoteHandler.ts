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

        if (quoteData) {
          const formattedQuote = `"${quoteData.q}"\n\n- *${quoteData.a}*`;
          await message.reply(formattedQuote);
        } else {
          await message.reply("Sorry, I couldn't fetch a quote at the moment.");
        }
      } catch (error) {
        console.error('Error fetching quote:', error);
        await message.reply("Sorry, I couldn't fetch a quote at the moment.");
      }
      return;
    }

    await super.handle(message, client);
  }
}
