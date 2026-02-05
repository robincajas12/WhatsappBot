import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class WikipediaHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase().startsWith('!wiki ')) {
            const query = message.body.slice(6).trim();
            try {
                const response = await axios.get(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
                if (response.data && response.data.extract) {
                    await message.reply(response.data.extract);
                } else {
                    await message.reply("No se encontró información en Wikipedia.");
                }
            } catch (error) {
                console.error("Error fetching Wikipedia summary:", error);
                await message.reply("No pude encontrar ese artículo en Wikipedia.");
            }
        } else {
            await super.handle(message, client);
        }
    }
}
