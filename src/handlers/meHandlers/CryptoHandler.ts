import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class CryptoHandler extends AbstractMessageHandler {
  public async handle(message: Message, client: Client): Promise<void> {
    const cryptoRegex = /^!crypto\s+(\w+)/i;
    const match = message.body.match(cryptoRegex);

    if (match) {
      const coin = match[1].toLowerCase();
      try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
        const priceData = response.data;

        if (priceData[coin]) {
          const price = priceData[coin].usd;
          await client.sendMessage(message.from, `El precio actual de *${coin.toUpperCase()}* es *$${price} USD*.`);
        } else {
          await client.sendMessage(message.from, `Lo siento, no pude encontrar información de precio para "${coin}". Asegúrate de usar el ID de la moneda (ej: bitcoin, ethereum).`);
        }
      } catch (error) {
        console.error('Error fetching crypto price:', error);
        await client.sendMessage(message.from, "Lo siento, no pude obtener el precio de la criptomoneda en este momento.");
      }
      return;
    }

    await super.handle(message, client);
  }
}
