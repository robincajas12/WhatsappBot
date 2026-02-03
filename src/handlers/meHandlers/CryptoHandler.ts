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
        const data = response.data;

        if (data[cryptoId]) {
          const price = data[cryptoId].usd;
          await message.reply(`El precio de *${cryptoId}* es *$${price} USD*.`);
        } else {
          await message.reply(`No se encontró información para la criptomoneda: ${cryptoId}`);
        }
      } catch (error) {
        console.error('Error fetching crypto price:', error);
        await message.reply("Hubo un error al obtener el precio de la criptomoneda.");
      }
      return;
    }

    await super.handle(message, client);
  }
}
