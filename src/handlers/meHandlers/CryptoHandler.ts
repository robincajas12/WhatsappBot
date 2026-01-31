import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class CryptoHandler extends AbstractMessageHandler {
  public async handle(message: Message, client: Client): Promise<void> {
    const cryptoRegex = /!crypto\s+(.+)/i;
    const match = message.body.match(cryptoRegex);

    if (match) {
      const cryptoId = match[1].toLowerCase();
      try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd`);

        if (response.data && response.data[cryptoId]) {
          const price = response.data[cryptoId].usd;
          await message.reply(`The current price of *${cryptoId}* is *$${price} USD*.`);
        } else {
          await message.reply(`Sorry, I couldn't find the price for "${cryptoId}". Please make sure you are using the correct ID (e.g., bitcoin, ethereum).`);
        }
      } catch (error) {
        console.error('Error fetching crypto price:', error);
        await message.reply("An error occurred while fetching the crypto price. Please try again later.");
      }
      return;
    }

    await super.handle(message, client);
  }
}
