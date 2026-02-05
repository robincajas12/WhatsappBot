import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class CryptoHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase().startsWith('!crypto ')) {
            const crypto = message.body.split(' ')[1].toLowerCase();
            try {
                const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd`);
                if (response.data[crypto]) {
                    const price = response.data[crypto].usd;
                    await message.reply(`El precio de ${crypto.toUpperCase()} es $${price} USD.`);
                } else {
                    await message.reply(`No se encontró la criptomoneda: ${crypto}`);
                }
            } catch (error) {
                console.error("Error fetching crypto price:", error);
                await message.reply("Error al obtener el precio de la criptomoneda.");
            }
        } else {
            await super.handle(message, client);
        }
    }
}
