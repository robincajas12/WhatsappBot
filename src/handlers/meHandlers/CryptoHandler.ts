import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class CryptoHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        const cryptoRegex = /!crypto\s+(.+)/i;
        const match = message.body.match(cryptoRegex);

        if (match) {
            const coin = match[1].toLowerCase().trim();
            try {
                const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
                const data = response.data;

                if (data[coin] && data[coin].usd) {
                    const price = data[coin].usd;
                    await message.reply(`The current price of *${coin.toUpperCase()}* is *$${price} USD*.`);
                } else {
                    await message.reply(`Sorry, I couldn't find the price for "${coin}". Please check the coin ID (e.g., bitcoin, ethereum).`);
                }
            } catch (error) {
                console.error("Error fetching crypto price:", error);
                await message.reply("An error occurred while fetching the crypto price.");
            }
        } else {
            await super.handle(message, client);
        }
    }
}
